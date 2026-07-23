"""
exam_email_service.py

Serviço central de e-mail de acesso ao exame.
Utilizado por: envio imediato, envio manual, agendamento via cron e reenvio em lote.
Não duplicar montagem de assunto, corpo ou lógica de envio em outros módulos.
"""
import json
from datetime import datetime, timezone, timedelta
from html import escape

from recording_retention import mail_settings, send_email

# Fuso horário de Brasília (UTC-3, sem ajuste de horário de verão via offset fixo)
BRAZIL_UTC_OFFSET = timedelta(hours=-3)
BRAZIL_TZ = timezone(BRAZIL_UTC_OFFSET)


# ---------------------------------------------------------------------------
# Montagem do e-mail de acesso ao exame
# ---------------------------------------------------------------------------

def format_exam_datetime(dt, tz=BRAZIL_TZ):
    """Formata um datetime para exibição no e-mail no fuso America/Sao_Paulo."""
    if dt is None:
        return None, None
    if dt.tzinfo is None:
        # Assume que datetimes sem tzinfo vindos do banco estão em UTC
        dt = dt.replace(tzinfo=timezone.utc)
    local = dt.astimezone(tz)
    return local.strftime("%d/%m/%Y"), local.strftime("%H:%M")


def build_exam_access_email(company_name, participant, password, login_url, exam=None):
    """
    Monta o e-mail de acesso ao exame.

    Parâmetros
    ----------
    company_name : str
    participant  : dict com fullName, email
    password     : str — senha temporária em texto plano
    login_url    : str — URL de acesso
    exam         : dict opcional com title, availableFrom (datetime)

    Retorna
    -------
    (subject, text_body, html_body)
    """
    exam = exam or {}
    exam_title = exam.get("title") or ""
    available_from = exam.get("availableFrom")

    # Formata data e hora do exame
    exam_date, exam_time = format_exam_datetime(available_from)

    subject = f"Seu acesso ao exame — {company_name}"
    if exam_title:
        subject = f"Acesso ao exame: {exam_title} — {company_name}"

    # --- Texto simples ---
    lines = [
        f"Olá, {participant['fullName']}.",
        "",
        f"A empresa {company_name} liberou seu acesso ao exame.",
    ]
    if exam_title:
        lines.append(f"Exame: {exam_title}")
    if exam_date and exam_time:
        lines.append(f"Data e horário: {exam_date} às {exam_time} (horário de Brasília)")
    lines += [
        "",
        f"Login: {participant['email']}",
        f"Senha: {password}",
    ]
    if login_url:
        lines.append(f"Acesse: {login_url}")
    else:
        lines.append("Acesse pelo endereço informado pela empresa.")
    lines += [
        "",
        "Guarde esses dados em local seguro e altere a senha após o primeiro acesso.",
    ]
    text_body = "\n".join(lines)

    # --- HTML ---
    html_parts = [
        f"<h2>Acesso ao exame liberado</h2>",
        f"<p>Olá, <strong>{escape(participant['fullName'])}</strong>.</p>",
        f"<p>A empresa <strong>{escape(company_name)}</strong> liberou seu acesso ao exame.</p>",
    ]
    if exam_title:
        html_parts.append(f"<p><strong>Exame:</strong> {escape(exam_title)}</p>")
    if exam_date and exam_time:
        html_parts.append(
            f"<p><strong>Data e horário:</strong> {escape(exam_date)} às {escape(exam_time)} (horário de Brasília)</p>"
        )
    html_parts += [
        f"<p><strong>Login:</strong> {escape(participant['email'])}<br>"
        f"<strong>Senha:</strong> {escape(password)}</p>",
    ]
    if login_url:
        html_parts.append(f'<p><a href="{escape(login_url)}">Acessar o exame</a></p>')
    else:
        html_parts.append("<p>Acesse pelo endereço informado pela empresa.</p>")
    html_body = "".join(html_parts)

    return subject, text_body, html_body


# ---------------------------------------------------------------------------
# Envio com registro na fila
# ---------------------------------------------------------------------------

def _safe_error(exc):
    """Extrai mensagem de erro sem incluir credenciais SMTP."""
    msg = str(exc)[:500]
    # Remove possíveis senhas ou tokens que possam aparecer na exception
    sensitive = ["password", "senha", "token", "secret", "auth"]
    lower = msg.lower()
    for word in sensitive:
        if word in lower:
            return "Falha no envio do e-mail. Verifique as configurações SMTP."
    return msg


def send_exam_access_email(
    connection,
    company_name,
    participant,
    password,
    login_url,
    exam=None,
    queue_id=None,
):
    """
    Envia o e-mail de acesso ao exame e atualiza a fila.

    Parâmetros
    ----------
    connection    : conexão MySQL aberta
    company_name  : str
    participant   : dict com id (int), fullName, email
    password      : str
    login_url     : str
    exam          : dict opcional com title, availableFrom
    queue_id      : int ou None — id da linha em exam_email_queue a atualizar

    Retorna
    -------
    (success: bool, error_message: str ou None)
    """
    cursor = connection.cursor()
    try:
        # Marca como 'processing' para evitar envio duplo simultâneo
        if queue_id:
            updated = cursor.execute(
                "UPDATE exam_email_queue SET status='processing', attempt_count=attempt_count+1, "
                "updated_at=NOW() WHERE id=%s AND status IN ('pending','failed')",
                (queue_id,),
            )
            connection.commit()
            # Se nenhuma linha foi atualizada, outro processo já está processando
            if cursor.rowcount == 0:
                return False, "Envio já está em processamento por outro processo."

        subject, text_body, html_body = build_exam_access_email(
            company_name, participant, password, login_url, exam
        )
        send_email(participant["email"], subject, text_body, html_body)

        # Sucesso: atualiza fila e participant
        sent_at = datetime.now(timezone.utc)
        cursor.execute(
            "UPDATE company_participants SET invite_sent_at=%s, invite_error=NULL "
            "WHERE id=%s",
            (sent_at, participant["id"]),
        )
        if queue_id:
            cursor.execute(
                "UPDATE exam_email_queue SET status='sent', sent_at=%s, last_error=NULL, "
                "updated_at=NOW() WHERE id=%s",
                (sent_at, queue_id),
            )
        connection.commit()
        return True, None

    except Exception as exc:
        connection.rollback()
        error_msg = _safe_error(exc)
        try:
            cursor.execute(
                "UPDATE company_participants SET invite_failed_at=NOW(), invite_error=%s "
                "WHERE id=%s",
                (error_msg, participant["id"]),
            )
            if queue_id:
                cursor.execute(
                    "UPDATE exam_email_queue SET status='failed', last_error=%s, "
                    "updated_at=NOW() WHERE id=%s",
                    (error_msg, queue_id),
                )
            connection.commit()
        except Exception:
            pass
        return False, error_msg
    finally:
        cursor.close()


# ---------------------------------------------------------------------------
# Criação de item na fila
# ---------------------------------------------------------------------------

def enqueue_exam_email(
    connection,
    company_id,
    exam_id,
    participant_id,
    send_option,
    scheduled_for=None,
):
    """
    Insere um item na fila de e-mails.
    Usa INSERT IGNORE para evitar duplicatas no mesmo (exam_id, participant_id)
    com status pendente.

    Retorna o id do item inserido ou existente.
    """
    cursor = connection.cursor()
    try:
        # Cancela qualquer agendamento pendente anterior para o mesmo par
        cursor.execute(
            "UPDATE exam_email_queue SET status='cancelled' "
            "WHERE exam_id=%s AND participant_id=%s AND status='pending'",
            (exam_id, participant_id),
        )
        cursor.execute(
            "INSERT INTO exam_email_queue "
            "(company_id, exam_id, participant_id, send_option, status, scheduled_for) "
            "VALUES (%s, %s, %s, %s, 'pending', %s)",
            (company_id, exam_id, participant_id, send_option, scheduled_for),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        cursor.close()


def cancel_exam_email_queue(connection, exam_id):
    """Cancela todos os envios pendentes de um exame (ao excluir ou cancelar)."""
    cursor = connection.cursor()
    try:
        cursor.execute(
            "UPDATE exam_email_queue SET status='cancelled' "
            "WHERE exam_id=%s AND status IN ('pending')",
            (exam_id,),
        )
        connection.commit()
    finally:
        cursor.close()


# ---------------------------------------------------------------------------
# Cálculo do horário agendado
# ---------------------------------------------------------------------------

def calculate_scheduled_for(available_from_dt, minutes_before):
    """
    Calcula o datetime de envio agendado.

    Parâmetros
    ----------
    available_from_dt : datetime — início do exame (pode ser naive, assume UTC)
    minutes_before    : int — minutos antes do início

    Retorna
    -------
    datetime em UTC (timezone-aware)
    """
    if available_from_dt is None:
        return None
    if available_from_dt.tzinfo is None:
        available_from_dt = available_from_dt.replace(tzinfo=timezone.utc)
    return available_from_dt - timedelta(minutes=int(minutes_before))


# ---------------------------------------------------------------------------
# URL de login para participantes
# ---------------------------------------------------------------------------

def exam_login_url():
    """Retorna a URL de login do participante, ou string vazia em ambiente local."""
    from urllib.parse import urlparse
    base_url = mail_settings()["base_url"]
    hostname = (urlparse(base_url).hostname or "").lower()
    if not hostname or hostname in {"localhost", "127.0.0.1"} or hostname.endswith(".trycloudflare.com"):
        return ""
    return base_url.rstrip("/") + "/login.html"
