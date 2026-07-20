import json
import secrets
from html import escape
from datetime import datetime

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from recording_retention import send_email


ATTEMPT_ACTIONS = {"pause", "generate_resume", "close"}
CHAT_SENDERS = {"company", "participant"}


def clean_text(value, maximum):
    return str(value or "").strip()[:maximum]


def operation_from_row(row):
    remaining_seconds = row.get("remaining_seconds")
    if row.get("status") == "in_progress" and row.get("expires_at"):
        remaining_seconds = max(0, int((row["expires_at"] - datetime.now()).total_seconds()))
    return {
        "id": row["id"],
        "status": row.get("status") or "not_started",
        "examId": row["exam_id"],
        "examTitle": row.get("exam_title") or "Teste",
        "participantId": row["participant_id"],
        "participantName": row.get("participant_name") or "Participante",
        "participantEmail": row.get("participant_email") or "",
        "startedAt": row["started_at"].isoformat() if row.get("started_at") else None,
        "pausedAt": row["paused_at"].isoformat() if row.get("paused_at") else None,
        "submittedAt": row["submitted_at"].isoformat() if row.get("submitted_at") else None,
        "expiresAt": row["expires_at"].isoformat() if row.get("expires_at") else None,
        "remainingSeconds": remaining_seconds,
        "allowResume": bool(row.get("allow_resume")),
        "resumeCodeExpiresAt": row["resume_code_expires_at"].isoformat() if row.get("resume_code_expires_at") else None,
        "unreadMessages": int(row.get("unread_messages") or 0),
    }


def chat_from_row(row):
    return {
        "id": row["id"],
        "senderType": row["sender_type"],
        "senderName": row.get("sender_name") or ("Empresa" if row["sender_type"] == "company" else "Participante"),
        "message": row["message"],
        "readAt": row["read_at"].isoformat() if row.get("read_at") else None,
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
    }


def resume_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "RET-" + "".join(secrets.choice(alphabet) for _ in range(8))


def resume_email(row, code):
    subject = f"Código para retomar o teste — {row['exam_title']}"
    text = (
        f"Olá, {row['participant_name']}.\n\n"
        f"A empresa {row['company_name']} autorizou a retomada do teste {row['exam_title']}.\n"
        f"Código temporário: {code}\n"
        "O código é de uso único e expira em 24 horas. Entre novamente no sistema e informe-o na preparação do teste."
    )
    html = (
        f"<h2>Retomada autorizada</h2><p>Olá, <strong>{escape(row['participant_name'])}</strong>.</p>"
        f"<p>A empresa <strong>{escape(row['company_name'])}</strong> autorizou a retomada do teste <strong>{escape(row['exam_title'])}</strong>.</p>"
        f"<p style=\"font-size:24px;font-weight:800;letter-spacing:2px\">{code}</p>"
        "<p>Este código é de uso único e expira em 24 horas.</p>"
    )
    return subject, text, html


def create_company_operations_blueprint(open_database, token_payload):
    blueprint = Blueprint("company_exam_operations", __name__)

    def account_id(kind):
        payload, error = token_payload(kind)
        if error:
            return None, error
        try:
            return int(payload["sub"]), None
        except (KeyError, TypeError, ValueError):
            return None, (jsonify({"success": False, "message": "Sessão inválida."}), 401)

    def company_attempt(cursor, company_id, attempt_id):
        cursor.execute(
            "SELECT a.*,e.title AS exam_title,e.allow_resume,p.full_name AS participant_name,p.email AS participant_email,"
            "c.RazaoSocial AS company_name FROM exam_attempts a "
            "JOIN company_exams e ON e.id=a.exam_id AND e.company_id=a.company_id "
            "JOIN company_participants p ON p.id=a.participant_id AND p.company_id=a.company_id "
            "JOIN empresas c ON c.id=a.company_id WHERE a.id=%s AND a.company_id=%s",
            (attempt_id, company_id),
        )
        return cursor.fetchone()

    def participant_attempt(cursor, user_id, attempt_id):
        cursor.execute(
            "SELECT a.*,p.full_name AS participant_name,c.RazaoSocial AS company_name,e.title AS exam_title "
            "FROM exam_attempts a JOIN company_participants p ON p.id=a.participant_id AND p.company_id=a.company_id "
            "JOIN empresas c ON c.id=a.company_id JOIN company_exams e ON e.id=a.exam_id "
            "WHERE a.id=%s AND a.user_id=%s",
            (attempt_id, user_id),
        )
        return cursor.fetchone()

    def messages(cursor, attempt_id, after_id=0):
        cursor.execute(
            "SELECT id,sender_type,sender_name,message,read_at,created_at FROM attempt_chat_messages "
            "WHERE attempt_id=%s AND id>%s ORDER BY id LIMIT 300",
            (attempt_id, after_id),
        )
        return [chat_from_row(row) for row in cursor.fetchall()]

    @blueprint.get("/api/company/operations")
    def company_operations():
        company_id, error = account_id("company")
        if error:
            return error
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT a.id,a.status,a.exam_id,a.participant_id,a.remaining_seconds,a.started_at,a.paused_at,a.submitted_at,a.expires_at,a.resume_code_expires_at,"
                "e.title AS exam_title,e.allow_resume,p.full_name AS participant_name,p.email AS participant_email,"
                "(SELECT COUNT(*) FROM attempt_chat_messages m WHERE m.attempt_id=a.id AND m.sender_type='participant' AND m.read_at IS NULL) AS unread_messages "
                "FROM exam_attempts a JOIN company_exams e ON e.id=a.exam_id AND e.company_id=a.company_id "
                "JOIN company_participants p ON p.id=a.participant_id AND p.company_id=a.company_id "
                "WHERE a.company_id=%s ORDER BY COALESCE(a.started_at,a.created_at) DESC LIMIT 500",
                (company_id,),
            )
            items = [operation_from_row(row) for row in cursor.fetchall()]
            return jsonify({"operations": items})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/attempts/<int:attempt_id>/action")
    def company_attempt_action(attempt_id):
        company_id, error = account_id("company")
        if error:
            return error
        action = clean_text((request.get_json(silent=True) or {}).get("action"), 32)
        if action not in ATTEMPT_ACTIONS:
            return jsonify({"success": False, "message": "Ação inválida."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = company_attempt(cursor, company_id, attempt_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if action == "pause":
                cursor.execute(
                    "UPDATE exam_attempts SET status='paused',remaining_seconds=GREATEST(TIMESTAMPDIFF(SECOND,NOW(),expires_at),0),"
                    "resume_authorized=FALSE,paused_at=NOW() WHERE id=%s AND company_id=%s AND status='in_progress'",
                    (attempt_id, company_id),
                )
            elif action == "generate_resume":
                if not row.get("allow_resume"):
                    return jsonify({"success": False, "message": "A retomada não foi habilitada neste teste."}), 409
                if row.get("status") not in {"in_progress", "paused"}:
                    return jsonify({"success": False, "message": "A retomada só pode ser liberada para uma aplicação interrompida."}), 409
                code = resume_code()
                cursor.execute(
                    "UPDATE exam_attempts SET remaining_seconds=IF(status='in_progress',GREATEST(TIMESTAMPDIFF(SECOND,NOW(),expires_at),0),remaining_seconds),status='paused',"
                    "resume_authorized=TRUE,resume_code_hash=%s,resume_code_expires_at=DATE_ADD(NOW(),INTERVAL 24 HOUR),resume_code_used_at=NULL,paused_at=NOW() "
                    "WHERE id=%s AND company_id=%s",
                    (generate_password_hash(code, method="pbkdf2:sha256"), attempt_id, company_id),
                )
                send_email(row["participant_email"], *resume_email(row, code))
            else:
                cursor.execute(
                    "UPDATE exam_attempts SET status='closed',resume_authorized=FALSE,resume_code_hash=NULL,closed_by_company_at=NOW() "
                    "WHERE id=%s AND company_id=%s AND status IN ('not_started','in_progress','paused')",
                    (attempt_id, company_id),
                )
            if not cursor.rowcount:
                connection.rollback()
                return jsonify({"success": False, "message": "A ação não é permitida no estado atual."}), 409
            connection.commit()
            return jsonify({"success": True, "notificationSent": action == "generate_resume"})
        except Exception as exc:
            connection.rollback()
            if action == "generate_resume":
                return jsonify({"success": False, "message": f"Não foi possível enviar o código: {str(exc)[:300]}"}), 502
            raise
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/company/attempts/<int:attempt_id>/chat")
    def company_chat(attempt_id):
        company_id, error = account_id("company")
        if error:
            return error
        after_id = request.args.get("after", "0")
        after_id = int(after_id) if str(after_id).isdigit() else 0
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = company_attempt(cursor, company_id, attempt_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            items = messages(cursor, attempt_id, after_id)
            cursor.execute(
                "UPDATE attempt_chat_messages SET read_at=COALESCE(read_at,NOW()) WHERE attempt_id=%s AND sender_type='participant'",
                (attempt_id,),
            )
            connection.commit()
            return jsonify({"messages": items, "attemptStatus": row["status"]})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/company/attempts/<int:attempt_id>/chat")
    def company_chat_send(attempt_id):
        company_id, error = account_id("company")
        if error:
            return error
        message = clean_text((request.get_json(silent=True) or {}).get("message"), 2000)
        if not message:
            return jsonify({"success": False, "message": "Digite uma mensagem."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = company_attempt(cursor, company_id, attempt_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if row["status"] not in {"in_progress", "paused"}:
                return jsonify({"success": False, "message": "O chat está disponível somente durante a aplicação."}), 409
            cursor.execute(
                "INSERT INTO attempt_chat_messages (attempt_id,sender_type,sender_name,message) VALUES (%s,'company',%s,%s)",
                (attempt_id, row["company_name"], message),
            )
            connection.commit()
            return jsonify({"success": True, "messageId": cursor.lastrowid}), 201
        finally:
            cursor.close()
            connection.close()

    @blueprint.get("/api/participant/attempts/<int:attempt_id>/chat")
    def participant_chat(attempt_id):
        user_id, error = account_id("user")
        if error:
            return error
        after_id = request.args.get("after", "0")
        after_id = int(after_id) if str(after_id).isdigit() else 0
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = participant_attempt(cursor, user_id, attempt_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            items = messages(cursor, attempt_id, after_id)
            cursor.execute(
                "UPDATE attempt_chat_messages SET read_at=COALESCE(read_at,NOW()) WHERE attempt_id=%s AND sender_type='company'",
                (attempt_id,),
            )
            connection.commit()
            return jsonify({"messages": items, "attemptStatus": row["status"]})
        finally:
            cursor.close()
            connection.close()

    @blueprint.post("/api/participant/attempts/<int:attempt_id>/chat")
    def participant_chat_send(attempt_id):
        user_id, error = account_id("user")
        if error:
            return error
        message = clean_text((request.get_json(silent=True) or {}).get("message"), 2000)
        if not message:
            return jsonify({"success": False, "message": "Digite uma mensagem."}), 400
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            row = participant_attempt(cursor, user_id, attempt_id)
            if not row:
                return jsonify({"success": False, "message": "Aplicação não encontrada."}), 404
            if row["status"] != "in_progress":
                return jsonify({"success": False, "message": "O chat não está disponível neste momento."}), 409
            cursor.execute(
                "INSERT INTO attempt_chat_messages (attempt_id,sender_type,sender_name,message) VALUES (%s,'participant',%s,%s)",
                (attempt_id, row["participant_name"], message),
            )
            connection.commit()
            return jsonify({"success": True, "messageId": cursor.lastrowid}), 201
        finally:
            cursor.close()
            connection.close()

    return blueprint
