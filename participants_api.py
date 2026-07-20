import re
import secrets
from html import escape

import mysql.connector
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from license_service import company_license_snapshot, license_block_message
from recording_retention import send_email


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
ALLOWED_STATUSES = {"active", "in_progress", "pending", "not_started", "inactive"}
MAX_IMPORT_ROWS = 500


def clean_text(value, maximum):
    return str(value or "").strip()[:maximum]


def clean_digits(value, maximum):
    return re.sub(r"\D", "", str(value or ""))[:maximum]


def clean_participant(data, require_name=True):
    full_name = clean_text(data.get("fullName"), 180)
    email = clean_text(data.get("email"), 180).lower()
    if require_name and not full_name:
        raise ValueError("Informe o nome completo do participante.")
    if not EMAIL_PATTERN.fullmatch(email):
        raise ValueError("Informe um e-mail válido.")
    status = clean_text(data.get("status"), 24) or "pending"
    access_password = clean_text(data.get("accessPassword"), 128)
    if access_password and len(access_password) < 8:
        raise ValueError("A senha do participante precisa ter pelo menos 8 caracteres.")
    exam_id = data.get("examId")
    try:
        exam_id = int(exam_id) if exam_id not in (None, "") else None
    except (TypeError, ValueError):
        exam_id = None
    return {
        "fullName": full_name or email.split("@", 1)[0].replace(".", " ").title(),
        "email": email,
        "cpf": clean_digits(data.get("cpf"), 11),
        "phone": clean_digits(data.get("phone"), 15),
        "city": clean_text(data.get("city"), 120),
        "status": status if status in ALLOWED_STATUSES else "pending",
        "examId": exam_id,
        "sendInvite": bool(data.get("sendInvite", True)),
        "accessPassword": access_password,
    }


def participant_from_row(row):
    return {
        "id": row["id"],
        "fullName": row["full_name"],
        "email": row["email"],
        "cpf": row.get("cpf") or "",
        "phone": row.get("phone") or "",
        "city": row.get("city") or "",
        "status": row.get("status") or "not_started",
        "examId": row.get("exam_id"),
        "examTitle": row.get("exam_title") or "Sem teste atribuído",
        "progress": int(row.get("progress") or 0),
        "lastAccess": row.get("last_access").isoformat() if row.get("last_access") else None,
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
    }



def participant_license_usage(connection, company_id, requested=0):
    snapshot = company_license_snapshot(connection, company_id)
    blocked = license_block_message(snapshot)
    if blocked:
        raise ValueError(blocked)
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS used FROM company_participants "
            "WHERE company_id=%s AND created_at >= DATE_FORMAT(CURRENT_DATE,'%%Y-%%m-01')",
            (company_id,),
        )
        used = int((cursor.fetchone() or {}).get("used") or 0)
    finally:
        cursor.close()
    limit = snapshot.get("maxParticipantsMonth")
    limit = int(limit) if limit is not None else None
    if limit is not None and used + int(requested or 0) > limit:
        raise ValueError(
            f"Limite mensal de participantes atingido ({used}/{limit}). "
            "Inativar um participante não libera uma nova vaga; solicite ajuste da licença."
        )
    return {"used": used, "limit": limit, "remaining": None if limit is None else max(0, limit - used)}


def participant_invite(company_name, participant, password, login_url):
    subject = f"Seu acesso ao Online Teste — {company_name}"
    text = (
        f"Olá, {participant['fullName']}.\n\n"
        f"A empresa {company_name} criou seu acesso ao Online Teste.\n"
        f"Login: {participant['email']}\nSenha temporária: {password}\n"
        f"Acesse: {login_url}\n\nGuarde esses dados em local seguro."
    )
    html_body = (
        f"<h2>Seu acesso foi criado</h2><p>Olá, <strong>{escape(participant['fullName'])}</strong>.</p>"
        f"<p>A empresa <strong>{escape(company_name)}</strong> criou seu acesso ao Online Teste.</p>"
        f"<p><strong>Login:</strong> {escape(participant['email'])}<br><strong>Senha temporária:</strong> {escape(password)}</p>"
        f"<p><a href=\"{escape(login_url)}\">Acessar o sistema</a></p>"
    )
    return subject, text, html_body

def create_participants_blueprint(open_database, token_payload):
    blueprint = Blueprint("company_participants", __name__)

    def company_id_or_error():
        payload, error = token_payload("company")
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    def company_owns_exam(cursor, company_id, exam_id):
        if exam_id is None:
            return True
        cursor.execute("SELECT id FROM company_exams WHERE id = %s AND company_id = %s", (exam_id, company_id))
        return cursor.fetchone() is not None

    @blueprint.get("/api/company/participants")
    def list_participants():
        company_id, error = company_id_or_error()
        if error:
            return error
        search = clean_text(request.args.get("search"), 180)
        status = clean_text(request.args.get("status"), 24)
        exam_id = request.args.get("examId")

        where = ["p.company_id = %s"]
        params = [company_id]
        if search:
            term = f"%{search}%"
            where.append("(p.full_name LIKE %s OR p.email LIKE %s OR p.cpf LIKE %s)")
            params.extend([term, term, term])
        if status in ALLOWED_STATUSES:
            where.append("p.status = %s")
            params.append(status)
        if exam_id and str(exam_id).isdigit():
            where.append("p.exam_id = %s")
            params.append(int(exam_id))

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT RazaoSocial FROM empresas WHERE id = %s", (company_id,))
            company = cursor.fetchone()
            cursor.execute(
                "SELECT p.*, e.title AS exam_title FROM company_participants p "
                "LEFT JOIN company_exams e ON e.id = p.exam_id AND e.company_id = p.company_id "
                f"WHERE {' AND '.join(where)} ORDER BY p.created_at DESC LIMIT 1000",
                tuple(params),
            )
            participants = [participant_from_row(row) for row in cursor.fetchall()]
            cursor.execute(
                "SELECT COUNT(*) AS total, "
                "SUM(status IN ('active', 'in_progress')) AS active, "
                "SUM(status = 'pending') AS pending, COALESCE(ROUND(AVG(progress)), 0) AS average_completion "
                "FROM company_participants WHERE company_id = %s",
                (company_id,),
            )
            stats = cursor.fetchone() or {}
            cursor.execute("SELECT id, title, status FROM company_exams WHERE company_id = %s ORDER BY title", (company_id,))
            exams = cursor.fetchall()
            usage = participant_license_usage(connection, company_id, 0)
            return jsonify(
                {
                    "company": {"id": company_id, "name": company["RazaoSocial"] if company else "Empresa"},
                    "participants": participants,
                    "stats": {
                        "total": int(stats.get("total") or 0),
                        "active": int(stats.get("active") or 0),
                        "pending": int(stats.get("pending") or 0),
                        "averageCompletion": int(stats.get("average_completion") or 0),
                    },
                    "exams": exams,
                    "licenseUsage": usage,
                }
            )
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/participants")
    def create_participant():
        company_id, error = company_id_or_error()
        if error:
            return error
        try:
            participant = clean_participant(request.get_json(silent=True) or {})
        except ValueError as exc:
            return jsonify({"success": False, "message": str(exc)}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            if not company_owns_exam(cursor, company_id, participant["examId"]):
                return jsonify({"success": False, "message": "O teste selecionado não pertence à empresa."}), 403
            cursor.execute(
                "SELECT id FROM company_participants WHERE company_id=%s AND email=%s LIMIT 1",
                (company_id, participant["email"]),
            )
            if cursor.fetchone():
                return jsonify({"success": False, "message": "Já existe um participante com esse e-mail. Inative ou reative o cadastro existente."}), 409
            try:
                usage = participant_license_usage(connection, company_id, 1)
            except ValueError as exc:
                return jsonify({"success": False, "message": str(exc)}), 403
            cursor.execute("SELECT RazaoSocial FROM empresas WHERE id=%s", (company_id,))
            company_row = cursor.fetchone() or {}
            company_name = company_row.get("RazaoSocial") or "Empresa"
            status = "pending" if participant["sendInvite"] else "not_started"
            try:
                cursor.execute(
                    "INSERT INTO company_participants "
                    "(company_id, full_name, email, cpf, phone, city, status, exam_id, invited_at) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, IF(%s, CURRENT_TIMESTAMP, NULL))",
                    (
                        company_id, participant["fullName"], participant["email"], participant["cpf"],
                        participant["phone"], participant["city"], status, participant["examId"], participant["sendInvite"],
                    ),
                )
                participant_id = cursor.lastrowid
                cursor.execute("SELECT id FROM users WHERE email = %s LIMIT 1", (participant["email"],))
                existing_user = cursor.fetchone()
                temporary_password = None
                if not existing_user:
                    temporary_password = participant["accessPassword"] or secrets.token_urlsafe(10)
                    cursor.execute(
                        "INSERT INTO users (NomeCompleto, email, senha) VALUES (%s, %s, %s)",
                        (participant["fullName"], participant["email"], generate_password_hash(temporary_password, method="pbkdf2:sha256")),
                    )
                connection.commit()
            except mysql.connector.IntegrityError:
                connection.rollback()
                return jsonify({"success": False, "message": "Já existe um participante com esse e-mail."}), 409
            invite_sent = False
            invite_error = ""
            if participant["sendInvite"] and temporary_password:
                try:
                    login_url = request.host_url.rstrip("/") + "/login.html"
                    send_email(participant["email"], *participant_invite(company_name, participant, temporary_password, login_url))
                    invite_sent = True
                except Exception as exc:
                    invite_error = str(exc)[:240]
            cursor.execute(
                "SELECT p.*, e.title AS exam_title FROM company_participants p "
                "LEFT JOIN company_exams e ON e.id = p.exam_id AND e.company_id = p.company_id "
                "WHERE p.id = %s AND p.company_id = %s",
                (participant_id, company_id),
            )
            return jsonify({
                "success": True,
                "participant": participant_from_row(cursor.fetchone()),
                "temporaryPassword": temporary_password,
                "inviteSent": invite_sent,
                "inviteError": invite_error,
                "licenseUsage": {**usage, "used": usage["used"] + 1, "remaining": None if usage["limit"] is None else max(0, usage["remaining"] - 1)},
            }), 201
        finally:
            cursor.close()
            connection.close()
    @blueprint.post("/api/company/participants/bulk")
    def bulk_participants():
        company_id, error = company_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        raw_ids = data.get("ids") if isinstance(data.get("ids"), list) else []
        ids = []
        for item in raw_ids[:500]:
            try:
                ids.append(int(item))
            except (TypeError, ValueError):
                continue
        action = clean_text(data.get("action"), 32)
        if not ids or action not in {"deactivate", "activate", "assign_exam", "resend_invite"}:
            return jsonify({"success": False, "message": "Seleção ou ação inválida."}), 400

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            placeholders = ", ".join(["%s"] * len(ids))
            params = []
            if action == "assign_exam":
                try:
                    exam_id = int(data.get("examId"))
                except (TypeError, ValueError):
                    return jsonify({"success": False, "message": "Selecione um teste."}), 400
                if not company_owns_exam(cursor, company_id, exam_id):
                    return jsonify({"success": False, "message": "O teste selecionado não pertence à empresa."}), 403
                sql = f"UPDATE company_participants SET exam_id = %s, status = 'not_started', progress = 0 WHERE company_id = %s AND id IN ({placeholders})"
                params = [exam_id, company_id, *ids]
            elif action == "resend_invite":
                sql = f"UPDATE company_participants SET status = 'pending', invited_at = CURRENT_TIMESTAMP WHERE company_id = %s AND id IN ({placeholders})"
                params = [company_id, *ids]
            else:
                new_status = "inactive" if action == "deactivate" else "active"
                sql = f"UPDATE company_participants SET status = %s WHERE company_id = %s AND id IN ({placeholders})"
                params = [new_status, company_id, *ids]
            cursor.execute(sql, tuple(params))
            affected = cursor.rowcount
            connection.commit()
            return jsonify({"success": True, "affected": affected})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/participants/import")
    def import_participants():
        company_id, error = company_id_or_error()
        if error:
            return error
        data = request.get_json(silent=True) or {}
        raw_participants = data.get("participants") if isinstance(data.get("participants"), list) else []
        if not raw_participants:
            return jsonify({"success": False, "message": "O arquivo não contém participantes."}), 400
        cleaned_by_email = {}
        errors = []
        for index, item in enumerate(raw_participants[:MAX_IMPORT_ROWS]):
            try:
                participant = clean_participant(item if isinstance(item, dict) else {}, require_name=False)
                cleaned_by_email[participant["email"]] = participant
            except ValueError as exc:
                errors.append(f"Linha {index + 2}: {exc}")
        cleaned = list(cleaned_by_email.values())
        if not cleaned:
            return jsonify({"success": False, "message": errors[0] if errors else "Nenhum registro válido."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        invitations = []
        credentials = []
        try:
            emails = [item["email"] for item in cleaned]
            placeholders = ",".join(["%s"] * len(emails))
            cursor.execute(
                f"SELECT email FROM company_participants WHERE company_id=%s AND email IN ({placeholders})",
                (company_id, *emails),
            )
            existing_company_emails = {row["email"].lower() for row in cursor.fetchall()}
            new_count = sum(1 for item in cleaned if item["email"] not in existing_company_emails)
            try:
                usage = participant_license_usage(connection, company_id, new_count)
            except ValueError as exc:
                return jsonify({"success": False, "message": str(exc)}), 403
            cursor.execute("SELECT RazaoSocial FROM empresas WHERE id=%s", (company_id,))
            company_name = (cursor.fetchone() or {}).get("RazaoSocial") or "Empresa"
            cursor.execute(f"SELECT email FROM users WHERE email IN ({placeholders})", tuple(emails))
            existing_user_emails = {row["email"].lower() for row in cursor.fetchall()}
            created = 0
            for item in cleaned:
                is_new_participant = item["email"] not in existing_company_emails
                cursor.execute(
                    "INSERT INTO company_participants (company_id,full_name,email,cpf,phone,city,status,invited_at) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,IF(%s,CURRENT_TIMESTAMP,NULL)) "
                    "ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),cpf=VALUES(cpf),phone=VALUES(phone),city=VALUES(city)",
                    (company_id,item["fullName"],item["email"],item["cpf"],item["phone"],item["city"],"pending" if item["sendInvite"] else "not_started",item["sendInvite"]),
                )
                if is_new_participant:
                    created += 1
                if item["email"] not in existing_user_emails:
                    password = item["accessPassword"] or secrets.token_urlsafe(10)
                    cursor.execute(
                        "INSERT INTO users (NomeCompleto,email,senha) VALUES (%s,%s,%s)",
                        (item["fullName"],item["email"],generate_password_hash(password, method="pbkdf2:sha256")),
                    )
                    existing_user_emails.add(item["email"])
                    credentials.append({"name": item["fullName"], "email": item["email"], "password": password})
                    if item["sendInvite"]:
                        invitations.append((item, password))
            connection.commit()
            invite_errors = []
            login_url = request.host_url.rstrip("/") + "/login.html"
            for item, password in invitations:
                try:
                    send_email(item["email"], *participant_invite(company_name, item, password, login_url))
                except Exception as exc:
                    invite_errors.append(f"{item['email']}: {str(exc)[:120]}")
            return jsonify({
                "success": True,
                "imported": len(cleaned),
                "created": created,
                "credentials": credentials,
                "invitationsSent": len(invitations) - len(invite_errors),
                "errors": (errors + invite_errors)[:20],
                "licenseUsage": {**usage, "used": usage["used"] + created, "remaining": None if usage["limit"] is None else max(0, usage["remaining"] - created)},
            })
        except Exception:
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()
    return blueprint
