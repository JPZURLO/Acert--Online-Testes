import html
import os
import smtplib
import threading
from email.message import EmailMessage
from email.utils import formatdate, make_msgid, parseaddr
from pathlib import Path


def mail_settings():
    return {
        "host": os.getenv("SMTP_HOST", "").strip(),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", "").strip(),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "sender": os.getenv("SMTP_FROM", "").strip(),
        "reply_to": os.getenv("SMTP_REPLY_TO", "").strip(),
        "starttls": os.getenv("SMTP_STARTTLS", "true").lower() == "true",
        "ssl": os.getenv("SMTP_SSL", "false").lower() == "true",
        "base_url": os.getenv("PUBLIC_BASE_URL", "http://localhost:5500").rstrip("/"),
    }


def send_email(recipient, subject, text_body, html_body):
    settings = mail_settings()
    if not settings["host"] or not settings["sender"]:
        raise RuntimeError("Configure SMTP_HOST e SMTP_FROM para enviar os avisos de gravação.")
    message = EmailMessage()
    message["From"] = settings["sender"]
    message["To"] = recipient
    message["Subject"] = subject
    sender_address = parseaddr(settings["sender"])[1] or settings["sender"]
    sender_domain = sender_address.rsplit("@", 1)[-1] if "@" in sender_address else None
    message["Date"] = formatdate(localtime=False)
    message["Message-ID"] = make_msgid(domain=sender_domain)
    message["Reply-To"] = settings["reply_to"] or sender_address
    message["Auto-Submitted"] = "auto-generated"
    message["X-Auto-Response-Suppress"] = "All"
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")
    client_type = smtplib.SMTP_SSL if settings["ssl"] else smtplib.SMTP
    with client_type(settings["host"], settings["port"], timeout=30) as client:
        if not settings["ssl"] and settings["starttls"]:
            client.starttls()
        if settings["user"]:
            client.login(settings["user"], settings["password"])
        client.send_message(message)


def recording_url(attempt_id):
    base_url = mail_settings()["base_url"]
    return f"{base_url}/api/company/attempts/{int(attempt_id)}/recording?download=1"


def recording_rows(cursor, extra_where="", params=()):
    cursor.execute(
        "SELECT r.id AS recording_id,r.attempt_id,r.storage_name,r.available_until,r.delete_after,r.downloaded_at," 
        "r.first_notice_sent_at,r.reminder_sent_at,e.title AS exam_title,p.full_name AS participant_name," 
        "c.RazaoSocial AS company_name,l.recording_contact_email "
        "FROM attempt_recordings r JOIN exam_attempts a ON a.id=r.attempt_id "
        "JOIN company_exams e ON e.id=a.exam_id JOIN company_participants p ON p.id=a.participant_id "
        "JOIN empresas c ON c.id=a.company_id LEFT JOIN company_licenses l ON l.company_id=a.company_id "
        "WHERE r.status='completed' " + extra_where + " ORDER BY r.available_until,r.id LIMIT 500",
        params,
    )
    return cursor.fetchall()


def available_message(row):
    link = recording_url(row["attempt_id"])
    expires = row["available_until"].strftime("%d/%m/%Y às %H:%M")
    subject = f"Gravação disponível — {row['participant_name']}"
    text = (
        f"A gravação de auditoria do teste {row['exam_title']} está disponível.\n"
        f"Participante: {row['participant_name']}\nPrazo para download: {expires}\n"
        f"Acesse com o login da empresa: {link}\nO arquivo não está anexado por segurança e tamanho."
    )
    body = (
        f"<h2>Gravação de auditoria disponível</h2><p><strong>Teste:</strong> {html.escape(row['exam_title'])}</p>"
        f"<p><strong>Participante:</strong> {html.escape(row['participant_name'])}</p>"
        f"<p>Faça o download até <strong>{expires}</strong>. O acesso exige o login da empresa.</p>"
        f"<p><a href=\"{html.escape(link)}\">Baixar gravação</a></p>"
        "<p>O vídeo não segue anexado por segurança e por exceder os limites de e-mail.</p>"
    )
    return subject, text, body


def reminder_message(company_name, rows):
    items = []
    lines = []
    for row in rows:
        expires = row["available_until"].strftime("%d/%m/%Y às %H:%M")
        link = recording_url(row["attempt_id"])
        lines.append(f"- {row['participant_name']} — {row['exam_title']} — prazo {expires}: {link}")
        items.append(
            f"<li><strong>{html.escape(row['participant_name'])}</strong> — {html.escape(row['exam_title'])} "
            f"(prazo {expires}) — <a href=\"{html.escape(link)}\">baixar</a></li>"
        )
    subject = "Aviso final: gravações próximas da exclusão"
    text = (
        f"{company_name}, estas gravações ainda não foram baixadas:\n\n" + "\n".join(lines) +
        "\n\nApós este aviso, o sistema concede mais 48 horas antes da exclusão definitiva."
    )
    body = (
        f"<h2>Aviso final de gravações</h2><p>{html.escape(company_name)}, os arquivos abaixo ainda não foram baixados:</p>"
        f"<ul>{''.join(items)}</ul><p>Após este aviso, o sistema concede mais <strong>48 horas</strong> antes da exclusão definitiva.</p>"
    )
    return subject, text, body


def process_available_notices(connection, cursor):
    sent = 0
    rows = recording_rows(cursor, "AND r.first_notice_sent_at IS NULL AND l.recording_contact_email IS NOT NULL AND l.recording_contact_email<>''")
    for row in rows:
        try:
            send_email(row["recording_contact_email"], *available_message(row))
            cursor.execute(
                "UPDATE attempt_recordings SET first_notice_sent_at=NOW(),notification_error=NULL WHERE id=%s",
                (row["recording_id"],),
            )
            connection.commit()
            sent += 1
        except Exception as exc:
            connection.rollback()
            cursor.execute(
                "UPDATE attempt_recordings SET notification_attempts=notification_attempts+1,notification_error=%s WHERE id=%s",
                (str(exc)[:500], row["recording_id"]),
            )
            connection.commit()
    return sent


def process_reminders(connection, cursor):
    due = recording_rows(
        cursor,
        "AND r.downloaded_at IS NULL AND r.reminder_sent_at IS NULL AND r.first_notice_sent_at IS NOT NULL "
        "AND r.available_until<=DATE_ADD(NOW(),INTERVAL 1 DAY) AND l.recording_contact_email IS NOT NULL AND l.recording_contact_email<>''",
    )
    groups = {}
    for row in due:
        groups.setdefault((row["recording_contact_email"], row["company_name"]), []).append(row)
    sent = 0
    for (recipient, company_name), reminder_rows in groups.items():
        try:
            all_pending = recording_rows(
                cursor,
                "AND r.downloaded_at IS NULL AND l.recording_contact_email=%s",
                (recipient,),
            )
            send_email(recipient, *reminder_message(company_name, all_pending))
            ids = [row["recording_id"] for row in reminder_rows]
            placeholders = ",".join(["%s"] * len(ids))
            cursor.execute(
                f"UPDATE attempt_recordings SET reminder_sent_at=NOW(),delete_after=DATE_ADD(NOW(),INTERVAL 2 DAY),notification_error=NULL WHERE id IN ({placeholders})",
                tuple(ids),
            )
            connection.commit()
            sent += len(ids)
        except Exception as exc:
            connection.rollback()
            for row in reminder_rows:
                cursor.execute(
                    "UPDATE attempt_recordings SET notification_attempts=notification_attempts+1,notification_error=%s WHERE id=%s",
                    (str(exc)[:500], row["recording_id"]),
                )
            connection.commit()
    return sent


def purge_expired_recordings(connection, cursor):
    cursor.execute(
        "SELECT r.id,r.attempt_id,r.storage_name,r.downloaded_at,r.available_until,r.delete_after,r.reminder_sent_at "
        "FROM attempt_recordings r WHERE r.status='completed' AND ("
        "(r.downloaded_at IS NOT NULL AND r.available_until<=NOW()) OR "
        "(r.downloaded_at IS NULL AND r.reminder_sent_at IS NOT NULL AND r.delete_after<=NOW())) LIMIT 500"
    )
    rows = cursor.fetchall()
    root = Path(os.getenv("PRIVATE_RECORDING_DIR", Path(__file__).resolve().parent / "private_uploads" / "recordings")).resolve()
    deleted = 0
    for row in rows:
        storage_name = row.get("storage_name") or ""
        path = (root / storage_name).resolve()
        if storage_name and root in path.parents and path.is_file():
            path.unlink()
        reason = "Prazo encerrado após download" if row.get("downloaded_at") else "Prazo encerrado após aviso final"
        cursor.execute(
            "UPDATE attempt_recordings SET status='deleted',storage_name=NULL,deleted_at=NOW(),deletion_reason=%s WHERE id=%s",
            (reason, row["id"]),
        )
        cursor.execute("UPDATE exam_attempts SET recording_status='deleted' WHERE id=%s", (row["attempt_id"],))
        connection.commit()
        deleted += 1
    return deleted


def run_recording_maintenance(open_database):
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        notices = process_available_notices(connection, cursor)
        reminders = process_reminders(connection, cursor)
        deleted = purge_expired_recordings(connection, cursor)
        return {"notices": notices, "reminders": reminders, "deleted": deleted}
    finally:
        cursor.close()
        connection.close()


def start_recording_maintenance(open_database):
    if os.getenv("RECORDING_MAINTENANCE_ENABLED", "false").lower() != "true":
        return None
    interval = max(300, int(os.getenv("RECORDING_MAINTENANCE_INTERVAL_SECONDS", "900")))

    def worker():
        while True:
            try:
                run_recording_maintenance(open_database)
            except Exception:
                pass
            threading.Event().wait(interval)

    thread = threading.Thread(target=worker, name="recording-maintenance", daemon=True)
    thread.start()
    return thread