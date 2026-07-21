import json
import os
import re
import unicodedata
from datetime import date
from html import escape

from flask import Blueprint, jsonify, request

from license_service import ALL_LICENSE_FEATURES, company_license_snapshot
from recording_retention import send_email


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
REQUEST_STATUSES = {"pending", "approved", "rejected"}
PLAN_STATUSES = {"active", "draft", "archived"}
LICENSE_STATUSES = {"active", "trial", "blocked", "expired"}


def text(value, maximum, default=""):
    return str(value if value is not None else default).strip()[:maximum]


def nullable_integer(value, minimum=0, maximum=1_000_000):
    if value in (None, ""):
        return None
    try:
        return max(minimum, min(maximum, int(value)))
    except (TypeError, ValueError):
        return None


def nullable_decimal(value, minimum=0, maximum=100_000_000):
    if value in (None, ""):
        return None
    try:
        return max(minimum, min(maximum, round(float(value), 2)))
    except (TypeError, ValueError):
        return None


def slug(value):
    normalized = "".join(
        character
        for character in unicodedata.normalize("NFKD", text(value, 120).lower())
        if not unicodedata.combining(character)
    )
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")[:120]


def clean_features(value):
    if not isinstance(value, list):
        return []
    return sorted({text(item, 40) for item in value if text(item, 40) in ALL_LICENSE_FEATURES})


def serialize_date(value):
    return value.isoformat() if value else None


def plan_from_row(row):
    try:
        features = json.loads(row.get("features_json") or "[]")
    except (TypeError, json.JSONDecodeError):
        features = []
    return {
        "id": row["id"],
        "name": row["name"],
        "slug": row["slug"],
        "description": row.get("description") or "",
        "monthlyPrice": float(row.get("monthly_price") or 0),
        "status": row.get("status") or "draft",
        "maxExams": row.get("max_exams"),
        "maxParticipantsMonth": row.get("max_participants_month"),
        "maxAdminUsers": row.get("max_admin_users"),
        "resultRetentionMonths": row.get("result_retention_months"),
        "recordingRetentionDays": int(row.get("recording_retention_days") or 5),
        "features": clean_features(features),
        "updatedAt": row.get("updated_at").isoformat() if row.get("updated_at") else None,
    }


def request_from_row(row):
    return {
        "id": row["id"],
        "contactName": row["contact_name"],
        "companyName": row["company_name"],
        "email": row["email"],
        "phone": row["phone"],
        "cnpj": row.get("cnpj") or "",
        "planInterest": row.get("plan_interest") or "",
        "needs": row.get("needs") or "",
        "status": row.get("status") or "pending",
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
        "reviewedAt": row.get("reviewed_at").isoformat() if row.get("reviewed_at") else None,
    }


def proposal_message(data):
    subject = f"Nova solicitação de proposta — {data['planInterest'] or 'Plano a definir'}"
    lines = [
        "Uma nova solicitação de proposta foi recebida pelo site Online Teste.",
        "",
        f"Nome: {data['contactName']}",
        f"Empresa: {data['companyName']}",
        f"E-mail: {data['email']}",
        f"Telefone/WhatsApp: {data['phone']}",
        f"CNPJ: {data['cnpj'] or 'Não informado'}",
        f"Plano: {data['planInterest'] or 'Solicitou recomendação'}",
        "",
        "Necessidade informada:",
        data['needs'] or "Não informada.",
        "",
        "A solicitação também está disponível no painel administrativo.",
    ]
    fields = (
        ("Nome", data["contactName"]),
        ("Empresa", data["companyName"]),
        ("E-mail", data["email"]),
        ("Telefone/WhatsApp", data["phone"]),
        ("CNPJ", data["cnpj"] or "Não informado"),
        ("Plano", data["planInterest"] or "Solicitou recomendação"),
    )
    rows = "".join(
        f"<tr><th style='padding:8px 12px;text-align:left;background:#f3f8f8'>{escape(label)}</th>"
        f"<td style='padding:8px 12px'>{escape(value)}</td></tr>"
        for label, value in fields
    )
    html = (
        "<h2>Nova solicitação de proposta</h2>"
        "<p>Uma nova solicitação foi recebida pelo site Online Teste.</p>"
        f"<table style='border-collapse:collapse;border:1px solid #dbe5e7'>{rows}</table>"
        "<h3>Necessidade informada</h3>"
        f"<p>{escape(data['needs'] or 'Não informada.')}</p>"
        "<p>A solicitação também está disponível no painel administrativo.</p>"
    )
    return subject, "\n".join(lines), html


def notify_proposal(data):
    recipient = os.getenv("PROPOSAL_EMAIL", "comercial@onlineteste.com.br").strip()
    if recipient:
        try:
            send_email(recipient, *proposal_message(data))
        except Exception:
            # A solicitação já está salva no painel; uma indisponibilidade do
            # SMTP não deve apagar o pedido nem interromper a resposta HTTP.
            return False
    return True


def create_admin_blueprint(open_database, token_payload):
    blueprint = Blueprint("admin_system", __name__)

    def admin_id_or_error():
        payload, error = token_payload("admin")
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão administrativa inválida."}), 401)

    @blueprint.post("/api/access-requests")
    def create_access_request():
        data = request.get_json(silent=True) or {}
        contact_name = text(data.get("contactName"), 160)
        company_name = text(data.get("companyName"), 180)
        email = text(data.get("email"), 254).lower()
        phone = text(data.get("phone"), 32)
        cnpj = text(data.get("cnpj"), 24)
        if not contact_name or not company_name or not email or not phone:
            return jsonify({"success": False, "message": "Preencha nome, empresa, e-mail e telefone."}), 400
        if not EMAIL_PATTERN.fullmatch(email):
            return jsonify({"success": False, "message": "Informe um e-mail válido."}), 400
        proposal = {
            "contactName": contact_name,
            "companyName": company_name,
            "email": email,
            "phone": phone,
            "cnpj": cnpj,
            "planInterest": text(data.get("planInterest"), 80),
            "needs": text(data.get("needs"), 3000),
        }
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id FROM access_requests WHERE status = 'pending' AND (email = %s OR (cnpj <> '' AND cnpj = %s)) LIMIT 1",
                (email, cnpj),
            )
            if cursor.fetchone():
                return jsonify({"success": False, "message": "Já existe uma solicitação pendente para estes dados."}), 409
            cursor.execute(
                "INSERT INTO access_requests (contact_name, company_name, email, phone, cnpj, plan_interest, needs, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')",
                (
                    contact_name,
                    company_name,
                    email,
                    phone,
                    cnpj,
                    proposal["planInterest"],
                    proposal["needs"],
                ),
            )
            connection.commit()
            notify_proposal(proposal)
            return jsonify({"success": True, "message": "Solicitação enviada com sucesso.", "requestId": cursor.lastrowid}), 201
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/overview")
    def overview():
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT COUNT(*) AS total FROM access_requests WHERE status = 'pending'")
            pending = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM company_licenses WHERE status IN ('active', 'trial')")
            active = cursor.fetchone()["total"]
            cursor.execute(
                "SELECT COUNT(*) AS total FROM company_licenses WHERE status IN ('active', 'trial') "
                "AND ends_at BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)"
            )
            expiring = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM company_licenses WHERE status = 'blocked'")
            blocked = cursor.fetchone()["total"]
            cursor.execute("SELECT * FROM access_requests ORDER BY created_at DESC LIMIT 5")
            recent = [request_from_row(row) for row in cursor.fetchall()]
            return jsonify({"stats": {"pending": pending, "active": active, "expiring": expiring, "blocked": blocked}, "recentRequests": recent})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/requests")
    def list_requests():
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        status = text(request.args.get("status"), 20)
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            if status in REQUEST_STATUSES:
                cursor.execute("SELECT * FROM access_requests WHERE status = %s ORDER BY created_at DESC LIMIT 500", (status,))
            else:
                cursor.execute("SELECT * FROM access_requests ORDER BY created_at DESC LIMIT 500")
            return jsonify({"requests": [request_from_row(row) for row in cursor.fetchall()]})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/admin/requests/<int:request_id>/decision")
    def decide_request(request_id):
        admin_id, error = admin_id_or_error()
        if error:
            return error
        status = text((request.get_json(silent=True) or {}).get("status"), 20)
        if status not in {"approved", "rejected"}:
            return jsonify({"success": False, "message": "Decisão inválida."}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute(
                "UPDATE access_requests SET status = %s, reviewed_by = %s, reviewed_at = NOW() WHERE id = %s",
                (status, admin_id, request_id),
            )
            if cursor.rowcount == 0:
                return jsonify({"success": False, "message": "Solicitação não encontrada."}), 404
            connection.commit()
            return jsonify({"success": True, "status": status})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/plans")
    def list_plans():
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM license_plans ORDER BY name")
            return jsonify({"plans": [plan_from_row(row) for row in cursor.fetchall()], "availableFeatures": sorted(ALL_LICENSE_FEATURES)})
        finally:
            cursor.close()
            connection.close()

    def clean_plan(data):
        name = text(data.get("name"), 120)
        if not name:
            raise ValueError("Informe o nome do plano.")
        status = text(data.get("status"), 20, "draft")
        return {
            "name": name,
            "slug": slug(data.get("slug") or name),
            "description": text(data.get("description"), 500),
            "monthlyPrice": nullable_decimal(data.get("monthlyPrice")),
            "status": status if status in PLAN_STATUSES else "draft",
            "maxExams": nullable_integer(data.get("maxExams")),
            "maxParticipantsMonth": nullable_integer(data.get("maxParticipantsMonth")),
            "maxAdminUsers": nullable_integer(data.get("maxAdminUsers")),
            "resultRetentionMonths": nullable_integer(data.get("resultRetentionMonths"), 1, 1200),
            "recordingRetentionDays": nullable_integer(data.get("recordingRetentionDays"), 1, 365) or 5,
            "features": clean_features(data.get("features")),
        }

    @blueprint.post("/api/admin/plans")
    def create_plan():
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        try:
            plan = clean_plan(request.get_json(silent=True) or {})
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute("SELECT id FROM license_plans WHERE slug = %s", (plan["slug"],))
            if cursor.fetchone():
                return jsonify({"success": False, "message": "Já existe um plano com este nome."}), 409
            cursor.execute(
                "INSERT INTO license_plans (name, slug, description, monthly_price, status, max_exams, max_participants_month, max_admin_users, result_retention_months, recording_retention_days, features_json) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (plan["name"], plan["slug"], plan["description"], plan["monthlyPrice"], plan["status"], plan["maxExams"], plan["maxParticipantsMonth"], plan["maxAdminUsers"], plan["resultRetentionMonths"], plan["recordingRetentionDays"], json.dumps(plan["features"])),
            )
            connection.commit()
            return jsonify({"success": True, "plan": {**plan, "id": cursor.lastrowid}}), 201
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/admin/plans/<int:plan_id>")
    def update_plan(plan_id):
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        try:
            plan = clean_plan(request.get_json(silent=True) or {})
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400
        connection = open_database()
        cursor = connection.cursor()
        try:
            cursor.execute("SELECT id FROM license_plans WHERE id = %s", (plan_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Plano não encontrado."}), 404
            cursor.execute("SELECT id FROM license_plans WHERE slug = %s AND id <> %s", (plan["slug"], plan_id))
            if cursor.fetchone():
                return jsonify({"success": False, "message": "Já existe outro plano com este nome."}), 409
            cursor.execute(
                "UPDATE license_plans SET name=%s, slug=%s, description=%s, monthly_price=%s, status=%s, max_exams=%s, max_participants_month=%s, max_admin_users=%s, result_retention_months=%s, recording_retention_days=%s, features_json=%s WHERE id=%s",
                (plan["name"], plan["slug"], plan["description"], plan["monthlyPrice"], plan["status"], plan["maxExams"], plan["maxParticipantsMonth"], plan["maxAdminUsers"], plan["resultRetentionMonths"], plan["recordingRetentionDays"], json.dumps(plan["features"]), plan_id),
            )
            connection.commit()
            return jsonify({"success": True, "plan": {**plan, "id": plan_id}})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/licenses")
    def list_licenses():
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT e.id AS company_id, e.RazaoSocial, e.CNPJ, l.status, l.starts_at, l.ends_at, l.plan_id, "
                "l.max_exams_override, l.max_participants_override, l.notes, l.monthly_value, l.billing_due_day, l.payment_status, l.next_due_at, l.last_paid_at, l.recording_contact_email, p.name AS plan_name, p.monthly_price "
                "FROM empresas e LEFT JOIN company_licenses l ON l.company_id = e.id "
                "LEFT JOIN license_plans p ON p.id = l.plan_id ORDER BY e.RazaoSocial LIMIT 1000"
            )
            licenses = []
            for row in cursor.fetchall():
                licenses.append({
                    "companyId": row["company_id"], "companyName": row["RazaoSocial"], "cnpj": row.get("CNPJ") or "",
                    "status": row.get("status") or "legacy", "planId": row.get("plan_id"), "planName": row.get("plan_name") or "Acesso legado",
                    "startsAt": serialize_date(row.get("starts_at")), "endsAt": serialize_date(row.get("ends_at")),
                    "maxExamsOverride": row.get("max_exams_override"), "maxParticipantsOverride": row.get("max_participants_override"),
                    "monthlyValue": float(row.get("monthly_value") or row.get("monthly_price") or 0), "billingDueDay": row.get("billing_due_day") or 10,
                    "paymentStatus": row.get("payment_status") or "pending", "nextDueAt": serialize_date(row.get("next_due_at")), "lastPaidAt": serialize_date(row.get("last_paid_at")), "recordingContactEmail": row.get("recording_contact_email") or "", "notes": row.get("notes") or "",
                })
            return jsonify({"licenses": licenses})
        finally:
            cursor.close()
            connection.close()

    @blueprint.put("/api/admin/licenses/<int:company_id>")
    def save_license(company_id):
        _admin_id, error = admin_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        status = text(data.get("status"), 20, "active")
        if status not in LICENSE_STATUSES:
            return jsonify({"success": False, "message": "Status de licença inválido."}), 400
        plan_id = nullable_integer(data.get("planId"), 1)
        features_override = data.get("featuresOverride")
        recording_contact_email = text(data.get("recordingContactEmail"), 254).lower()
        if recording_contact_email and not EMAIL_PATTERN.fullmatch(recording_contact_email):
            return jsonify({"success": False, "message": "Informe um e-mail responsável válido."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id FROM empresas WHERE id = %s", (company_id,))
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Empresa não encontrada."}), 404
            if plan_id:
                cursor.execute("SELECT id FROM license_plans WHERE id = %s", (plan_id,))
                if not cursor.fetchone():
                    return jsonify({"success": False, "message": "Plano não encontrado."}), 404
            cursor.execute(
                "INSERT INTO company_licenses (company_id, plan_id, monthly_value, billing_due_day, payment_status, next_due_at, recording_contact_email, status, starts_at, ends_at, max_exams_override, max_participants_override, features_override_json, notes) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id), monthly_value=VALUES(monthly_value), billing_due_day=VALUES(billing_due_day), payment_status=VALUES(payment_status), next_due_at=VALUES(next_due_at), recording_contact_email=VALUES(recording_contact_email), status=VALUES(status), starts_at=VALUES(starts_at), ends_at=VALUES(ends_at), max_exams_override=VALUES(max_exams_override), max_participants_override=VALUES(max_participants_override), features_override_json=VALUES(features_override_json), notes=VALUES(notes)",
                (company_id, plan_id, nullable_decimal(data.get("monthlyValue")), nullable_integer(data.get("billingDueDay"), 1, 28) or 10, text(data.get("paymentStatus"), 20, "pending"), text(data.get("nextDueAt"), 10) or None, recording_contact_email or None, status, text(data.get("startsAt"), 10) or None, text(data.get("endsAt"), 10) or None, nullable_integer(data.get("maxExamsOverride")), nullable_integer(data.get("maxParticipantsOverride")), json.dumps(clean_features(features_override)) if isinstance(features_override, list) else None, text(data.get("notes"), 3000)),
            )
            connection.commit()
            return jsonify({"success": True, "license": company_license_snapshot(connection, company_id)})
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/admin/operations")
    def admin_operations():
        admin_id, error = admin_id_or_error()
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT a.id,a.status,a.identity_status,a.review_status,a.resume_authorized,a.remaining_seconds,a.started_at,a.submitted_at,a.expires_at, "
                "e.title AS exam_title,p.full_name AS participant_name,p.email AS participant_email,c.RazaoSocial AS company_name "
                "FROM exam_attempts a JOIN company_exams e ON e.id=a.exam_id AND e.company_id=a.company_id "
                "JOIN company_participants p ON p.id=a.participant_id AND p.company_id=a.company_id "
                "JOIN empresas c ON c.id=a.company_id ORDER BY COALESCE(a.started_at,a.created_at) DESC LIMIT 500"
            )
            operations = []
            for row in cursor.fetchall():
                operations.append({
                    "id": row["id"], "status": row["status"], "identityStatus": row["identity_status"],
                    "reviewStatus": row["review_status"], "resumeAuthorized": bool(row["resume_authorized"]),
                    "remainingSeconds": row.get("remaining_seconds"), "startedAt": serialize_date(row.get("started_at")),
                    "submittedAt": serialize_date(row.get("submitted_at")), "expiresAt": serialize_date(row.get("expires_at")),
                    "examTitle": row["exam_title"], "participantName": row["participant_name"],
                    "participantEmail": row["participant_email"], "companyName": row["company_name"],
                })
            cursor.execute("SELECT COALESCE(SUM(size_bytes),0) AS total FROM attempt_identity_files")
            storage = int(cursor.fetchone()["total"] or 0)
            return jsonify({"operations": operations, "storageBytes": storage, "adminId": admin_id})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/admin/attempts/<int:attempt_id>/action")
    def admin_attempt_action(attempt_id):
        admin_id, error = admin_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        action = text(data.get("action"), 24)
        if action not in {"pause", "authorize_resume", "close"}:
            return jsonify({"success": False, "message": "Ação administrativa inválida."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id,status,expires_at FROM exam_attempts WHERE id=%s", (attempt_id,))
            attempt = cursor.fetchone()
            if not attempt:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if action == "pause":
                cursor.execute("UPDATE exam_attempts SET status='paused',remaining_seconds=GREATEST(TIMESTAMPDIFF(SECOND,NOW(),expires_at),0),resume_authorized=FALSE WHERE id=%s AND status='in_progress'", (attempt_id,))
            elif action == "authorize_resume":
                cursor.execute("UPDATE exam_attempts SET resume_authorized=TRUE WHERE id=%s AND status='paused'", (attempt_id,))
            else:
                cursor.execute("UPDATE exam_attempts SET status='closed',resume_authorized=FALSE WHERE id=%s AND status IN ('not_started','in_progress','paused')", (attempt_id,))
            if cursor.rowcount == 0:
                connection.rollback()
                return jsonify({"success": False, "message": "A ação não é permitida no estado atual da aplicação."}), 409
            cursor.execute("INSERT INTO admin_audit_log (admin_id,action,entity_type,entity_id,details_json) VALUES (%s,%s,'exam_attempt',%s,%s)", (admin_id, action, attempt_id, json.dumps({"previousStatus": attempt["status"]})))
            connection.commit()
            return jsonify({"success": True})
        finally:
            cursor.close()
            connection.close()
    @blueprint.get("/api/company/license")
    def current_company_license():
        payload, error = token_payload("company")
        if error:
            return error
        connection = open_database()
        try:
            return jsonify({"license": company_license_snapshot(connection, int(payload["sub"]))})
        finally:
            connection.close()

    return blueprint
