import hashlib
import json
import re
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime
from urllib.parse import urlsplit

from flask import Blueprint, g, jsonify, request
from werkzeug.exceptions import HTTPException


ERROR_STATUSES = {"new", "in_analysis", "resolved", "ignored"}
ERROR_SEVERITIES = {"critical", "high", "medium", "low"}
SENSITIVE_PATTERN = re.compile(
    r"(?i)(password|senha|token|secret|authorization|cookie|api[_-]?key)(\s*[:=]\s*)([^\s,;&]+)"
)
EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
DOCUMENT_PATTERN = re.compile(r"(?<!\d)\d{11,14}(?!\d)")
BEARER_PATTERN = re.compile(r"(?i)bearer\s+[A-Za-z0-9._~+\-/]+=*")
NUMBER_PATTERN = re.compile(r"\d+")


class ErrorReportLimiter:
    def __init__(self, limit=30, window_seconds=300):
        self.limit = limit
        self.window_seconds = window_seconds
        self.events = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key):
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self.lock:
            events = self.events[key]
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= self.limit:
                return False
            events.append(now)
            return True


client_report_limiter = ErrorReportLimiter()


def sanitize_text(value, maximum=1000):
    text = str(value or "").replace("\x00", " ").strip()
    text = BEARER_PATTERN.sub("Bearer [OCULTO]", text)
    text = SENSITIVE_PATTERN.sub(lambda match: f"{match.group(1)}{match.group(2)}[OCULTO]", text)
    text = EMAIL_PATTERN.sub("[E-MAIL OCULTO]", text)
    text = DOCUMENT_PATTERN.sub("[DOCUMENTO OCULTO]", text)
    return " ".join(text.split())[:maximum]


def safe_path(value, maximum=500):
    raw = sanitize_text(value, maximum * 2)
    if not raw:
        return ""
    try:
        parts = urlsplit(raw)
        path = parts.path or "/"
    except ValueError:
        path = raw.split("?", 1)[0]
    return path[:maximum]


def module_from_path(path):
    value = (path or "").lower()
    mapping = (
        ("record", "Gravações"), ("attempt", "Aplicações"), ("participant", "Participantes"),
        ("result", "Resultados"), ("question", "Questões"), ("exam", "Testes"),
        ("support", "Suporte"), ("finance", "Financeiro"), ("license", "Licenças"),
        ("activation", "Ativação"), ("login", "Autenticação"), ("admin", "Administração"),
    )
    return next((label for fragment, label in mapping if fragment in value), "Plataforma")


def error_fingerprint(source, module, error_type, message, route):
    normalized = NUMBER_PATTERN.sub("#", sanitize_text(message, 1000).lower())
    normalized_route = NUMBER_PATTERN.sub("#", safe_path(route).lower())
    raw = "|".join((source, module, error_type, normalized, normalized_route)).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def error_code():
    return f"ERR-{datetime.now():%Y%m%d}-{secrets.token_hex(3).upper()}"


def request_actor(token_payload):
    for kind in ("company", "admin", "user"):
        try:
            payload, error = token_payload(kind)
        except Exception:
            continue
        if not error and payload:
            try:
                actor_id = int(payload["sub"])
            except (KeyError, TypeError, ValueError):
                return None, None
            return kind, actor_id
    return None, None


def participant_company(cursor, actor_type, actor_id):
    if actor_type == "company":
        return actor_id
    if actor_type != "user" or not actor_id:
        return None
    cursor.execute(
        "SELECT company_id FROM exam_attempts WHERE user_id=%s ORDER BY updated_at DESC LIMIT 1",
        (actor_id,),
    )
    row = cursor.fetchone()
    return row.get("company_id") if row else None


def record_system_error(open_database, *, source, error_type, message, route="", method="", module="",
                        severity="medium", actor_type=None, actor_id=None, company_id=None,
                        page_url="", browser_summary="", technical_summary=""):
    clean_route = safe_path(route)
    clean_message = sanitize_text(message) or "Falha sem mensagem disponível."
    clean_type = sanitize_text(error_type, 120) or "Error"
    clean_module = sanitize_text(module, 80) or module_from_path(clean_route or page_url)
    clean_source = source if source in {"server", "client", "network"} else "client"
    clean_severity = severity if severity in ERROR_SEVERITIES else "medium"
    fingerprint = error_fingerprint(clean_source, clean_module, clean_type, clean_message, clean_route)
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        if company_id is None:
            company_id = participant_company(cursor, actor_type, actor_id)
        code = error_code()
        cursor.execute(
            "INSERT INTO system_errors (code,fingerprint,source,severity,status,company_id,actor_type,actor_id,module,error_type,message,route,request_method) "
            "VALUES (%s,%s,%s,%s,'new',%s,%s,%s,%s,%s,%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE occurrence_count=occurrence_count+1,last_occurred_at=NOW(),"
            "company_id=COALESCE(VALUES(company_id),company_id),actor_type=COALESCE(VALUES(actor_type),actor_type),"
            "actor_id=COALESCE(VALUES(actor_id),actor_id),severity=VALUES(severity),message=VALUES(message),"
            "route=VALUES(route),request_method=VALUES(request_method),"
            "status=IF(status IN ('resolved','ignored'),'new',status),resolved_at=NULL,resolved_by=NULL",
            (code, fingerprint, clean_source, clean_severity, company_id, actor_type, actor_id, clean_module,
             clean_type, clean_message, clean_route, sanitize_text(method, 12)),
        )
        cursor.execute("SELECT id,code FROM system_errors WHERE fingerprint=%s", (fingerprint,))
        incident = cursor.fetchone()
        cursor.execute(
            "INSERT INTO system_error_occurrences (error_id,company_id,actor_type,actor_id,route,request_method,page_url,browser_summary,technical_summary) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (incident["id"], company_id, actor_type, actor_id, clean_route, sanitize_text(method, 12),
             safe_path(page_url), sanitize_text(browser_summary, 300), sanitize_text(technical_summary, 1500)),
        )
        connection.commit()
        return incident["code"]
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


def iso(value):
    return value.isoformat() if value else None


def incident_from_row(row):
    return {
        "id": row["id"], "code": row["code"], "source": row["source"],
        "severity": row["severity"], "status": row["status"], "companyId": row.get("company_id"),
        "companyName": row.get("company_name") or "Ambiente público", "module": row["module"],
        "errorType": row["error_type"], "message": row["message"], "route": row.get("route") or "",
        "method": row.get("request_method") or "", "occurrenceCount": int(row.get("occurrence_count") or 0),
        "affectedActors": int(row.get("affected_actors") or 0), "supportTicketId": row.get("support_ticket_id"),
        "supportProtocol": row.get("support_protocol") or "", "firstOccurredAt": iso(row.get("first_occurred_at")),
        "lastOccurredAt": iso(row.get("last_occurred_at")), "resolvedAt": iso(row.get("resolved_at")),
    }


def create_error_monitoring_blueprint(open_database, token_payload):
    blueprint = Blueprint("error_monitoring", __name__)

    def admin_id_or_error():
        payload, error = token_payload("admin")
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    @blueprint.post("/api/system-errors/client")
    def client_error_report():
        origin = request.headers.get("Origin", "").rstrip("/")
        if not origin or origin != request.host_url.rstrip("/"):
            return jsonify({"success": False, "message": "Origem inválida."}), 403
        remote_key = request.remote_addr or "unknown"
        if not client_report_limiter.allow(remote_key):
            return jsonify({"success": False, "message": "Limite de registros atingido."}), 429
        data = request.get_json(silent=True) or {}
        actor_type, actor_id = request_actor(token_payload)
        source = "network" if data.get("source") == "network" else "client"
        error_type = sanitize_text(data.get("errorType"), 120) or ("NetworkError" if source == "network" else "JavaScriptError")
        message = sanitize_text(data.get("message"))
        if not message:
            return jsonify({"success": False, "message": "Registro inválido."}), 400
        severity = "high" if source == "network" and int(data.get("status") or 0) >= 500 else "medium"
        try:
            code = record_system_error(
                open_database, source=source, error_type=error_type, message=message,
                route=data.get("route") or data.get("page"), method=data.get("method"),
                module=module_from_path(data.get("route") or data.get("page")), severity=severity,
                actor_type=actor_type, actor_id=actor_id, page_url=data.get("page"),
                browser_summary=request.user_agent.string, technical_summary=data.get("technicalSummary"),
            )
        except Exception:
            return jsonify({"success": False, "message": "Não foi possível registrar a falha."}), 503
        return jsonify({"success": True, "code": code}), 201

    @blueprint.get("/api/admin/system-errors")
    def admin_error_list():
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        status = sanitize_text(request.args.get("status"), 24)
        severity = sanitize_text(request.args.get("severity"), 20)
        module = sanitize_text(request.args.get("module"), 80)
        period = sanitize_text(request.args.get("period"), 10) if request.args.get("period") else "24h"
        search = sanitize_text(request.args.get("search"), 120)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            conditions, params = [], []
            if status in ERROR_STATUSES:
                conditions.append("se.status=%s")
                params.append(status)
            if severity in ERROR_SEVERITIES:
                conditions.append("se.severity=%s")
                params.append(severity)
            if module:
                conditions.append("se.module=%s")
                params.append(module)
            period_hours = {"24h": 24, "7d": 168, "30d": 720}.get(period)
            if period_hours:
                conditions.append(f"se.last_occurred_at>=DATE_SUB(NOW(),INTERVAL {period_hours} HOUR)")
            if search:
                conditions.append("(se.code LIKE %s OR se.message LIKE %s OR e.RazaoSocial LIKE %s)")
                term = f"%{search}%"
                params.extend((term, term, term))
            where = " WHERE " + " AND ".join(conditions) if conditions else ""
            cursor.execute(
                "SELECT se.*,e.RazaoSocial AS company_name,st.protocol AS support_protocol,"
                "(SELECT COUNT(DISTINCT CONCAT(COALESCE(o.actor_type,''),':',COALESCE(o.actor_id,0))) "
                "FROM system_error_occurrences o WHERE o.error_id=se.id AND o.actor_id IS NOT NULL) AS affected_actors "
                "FROM system_errors se LEFT JOIN empresas e ON e.id=se.company_id "
                "LEFT JOIN support_tickets st ON st.id=se.support_ticket_id" + where +
                " ORDER BY FIELD(se.severity,'critical','high','medium','low'),se.last_occurred_at DESC LIMIT 500",
                tuple(params),
            )
            incidents = [incident_from_row(row) for row in cursor.fetchall()]
            cursor.execute(
                "SELECT SUM(status='new' AND severity='critical') critical_new,"
                "SUM(status='new') new_count,SUM(status='in_analysis') in_analysis,"
                "SUM(status='resolved' AND DATE(resolved_at)=CURDATE()) resolved_today,"
                "SUM(last_occurred_at>=DATE_SUB(NOW(),INTERVAL 24 HOUR)) last_24h FROM system_errors"
            )
            stats = cursor.fetchone() or {}
            cursor.execute("SELECT DISTINCT module FROM system_errors ORDER BY module")
            modules = [row["module"] for row in cursor.fetchall()]
            return jsonify({"incidents": incidents, "modules": modules, "stats": {
                "critical": int(stats.get("critical_new") or 0), "new": int(stats.get("new_count") or 0),
                "inAnalysis": int(stats.get("in_analysis") or 0),
                "resolvedToday": int(stats.get("resolved_today") or 0), "last24h": int(stats.get("last_24h") or 0),
            }})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/system-errors/<int:error_id>")
    def admin_error_detail(error_id):
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT se.*,e.RazaoSocial AS company_name,st.protocol AS support_protocol,"
                "(SELECT COUNT(DISTINCT CONCAT(COALESCE(o.actor_type,''),':',COALESCE(o.actor_id,0))) "
                "FROM system_error_occurrences o WHERE o.error_id=se.id AND o.actor_id IS NOT NULL) AS affected_actors "
                "FROM system_errors se LEFT JOIN empresas e ON e.id=se.company_id "
                "LEFT JOIN support_tickets st ON st.id=se.support_ticket_id WHERE se.id=%s",
                (error_id,),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": False, "message": "Incidente não encontrado."}), 404
            incident = incident_from_row(row)
            cursor.execute(
                "SELECT id,route,request_method,page_url,browser_summary,technical_summary,occurred_at "
                "FROM system_error_occurrences WHERE error_id=%s ORDER BY occurred_at DESC,id DESC LIMIT 50",
                (error_id,),
            )
            incident["occurrences"] = [{
                "id": item["id"], "route": item.get("route") or "", "method": item.get("request_method") or "",
                "page": item.get("page_url") or "", "browser": item.get("browser_summary") or "",
                "technicalSummary": item.get("technical_summary") or "", "occurredAt": iso(item.get("occurred_at")),
            } for item in cursor.fetchall()]
            return jsonify({"incident": incident})
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/admin/system-errors/<int:error_id>")
    def admin_error_update(error_id):
        admin_id, error = admin_id_or_error()
        if error:
            return error
        status = sanitize_text((request.get_json(silent=True) or {}).get("status"), 24)
        if status not in ERROR_STATUSES:
            return jsonify({"success": False, "message": "Status inválido."}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute(
                "UPDATE system_errors SET status=%s,resolved_at=IF(%s IN ('resolved','ignored'),NOW(),NULL),"
                "resolved_by=IF(%s IN ('resolved','ignored'),%s,NULL) WHERE id=%s",
                (status, status, status, admin_id, error_id),
            )
            if not cursor.rowcount:
                return jsonify({"success": False, "message": "Incidente não encontrado."}), 404
            connection.commit()
            return jsonify({"success": True})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/admin/system-errors/<int:error_id>/support")
    def create_linked_support_ticket(error_id):
        admin_id, error = admin_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM system_errors WHERE id=%s FOR UPDATE", (error_id,))
            incident = cursor.fetchone()
            if not incident:
                return jsonify({"success": False, "message": "Incidente não encontrado."}), 404
            if incident.get("support_ticket_id"):
                cursor.execute("SELECT protocol FROM support_tickets WHERE id=%s", (incident["support_ticket_id"],))
                linked = cursor.fetchone()
                return jsonify({"success": True, "ticketId": incident["support_ticket_id"], "protocol": linked.get("protocol") if linked else ""})
            if not incident.get("company_id"):
                return jsonify({"success": False, "message": "Este incidente não está vinculado a um cliente."}), 409
            protocol = "SUP-" + secrets.token_hex(4).upper()
            priority = "urgent" if incident["severity"] == "critical" else "high" if incident["severity"] == "high" else "medium"
            subject = f"[{incident['code']}] {incident['message']}"[:180]
            cursor.execute(
                "INSERT INTO support_tickets (protocol,company_id,requester_name,subject,category,priority,status,assigned_admin_id,sla_due_at) "
                "VALUES (%s,%s,'Monitoramento automático',%s,'bug',%s,'in_progress',%s,DATE_ADD(NOW(),INTERVAL %s HOUR))",
                (protocol, incident["company_id"], subject, priority, admin_id, 4 if priority in {"urgent", "high"} else 24),
            )
            ticket_id = cursor.lastrowid
            message = (
                f"Chamado criado a partir do incidente {incident['code']}.\n"
                f"Módulo: {incident['module']}\nResumo: {incident['message']}\n"
                "Dados sensíveis foram ocultados automaticamente."
            )
            cursor.execute(
                "INSERT INTO support_messages (ticket_id,author_type,admin_id,message) VALUES (%s,'admin',%s,%s)",
                (ticket_id, admin_id, message),
            )
            cursor.execute("UPDATE system_errors SET support_ticket_id=%s,status='in_analysis' WHERE id=%s", (ticket_id, error_id))
            connection.commit()
            return jsonify({"success": True, "ticketId": ticket_id, "protocol": protocol}), 201
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()

    return blueprint


def install_error_handlers(app, open_database, token_payload):
    def safely_record(error_type, message, severity, technical_summary=""):
        if request.path == "/api/system-errors/client":
            return ""
        actor_type, actor_id = request_actor(token_payload)
        try:
            code = record_system_error(
                open_database, source="server", error_type=error_type, message=message,
                route=request.path, method=request.method, module=module_from_path(request.path),
                severity=severity, actor_type=actor_type, actor_id=actor_id,
                page_url=request.referrer or "", browser_summary=request.user_agent.string,
                technical_summary=technical_summary,
            )
            g.system_error_recorded = True
            return code
        except Exception:
            app.logger.exception("Falha ao registrar incidente automático")
            return ""

    @app.after_request
    def record_failed_response(response):
        if response.status_code >= 500 and not getattr(g, "system_error_recorded", False):
            safely_record(
                f"HTTP{response.status_code}", f"A rota retornou HTTP {response.status_code}.",
                "critical" if response.status_code >= 503 else "high",
                f"Resposta HTTP {response.status_code} gerada sem exceção não tratada.",
            )
        return response

    @app.errorhandler(Exception)
    def record_unexpected_exception(error):
        if isinstance(error, HTTPException):
            if (error.code or 500) >= 500:
                safely_record(type(error).__name__, error.description, "high")
            return error
        code = safely_record(
            type(error).__name__, str(error) or "Erro interno inesperado.", "critical",
            f"Exceção {type(error).__name__} capturada automaticamente no servidor.",
        )
        app.logger.exception("Erro inesperado capturado pelo monitoramento [%s]", code or "sem código")
        if request.path.startswith("/api/"):
            return jsonify({
                "success": False, "message": "Ocorreu um erro interno. Nossa equipe foi avisada.",
                "incidentCode": code or None,
            }), 500
        return (
            "<!doctype html><html lang='pt-BR'><meta charset='utf-8'><meta name='viewport' content='width=device-width'>"
            "<title>Falha temporária | Online Teste</title><body style='font-family:Arial;padding:40px;color:#26333d'>"
            "<h1>Não foi possível concluir esta operação.</h1><p>Nossa equipe foi avisada automaticamente.</p>"
            f"<p>Código do incidente: <strong>{code or 'indisponível'}</strong></p></body></html>", 500
        )
