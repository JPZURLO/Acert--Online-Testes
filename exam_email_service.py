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

MONTH_NAMES_PT = [
    "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
]


def format_exam_schedule(participant=None, exam=None, tz=BRAZIL_TZ):
    """
    Extrai e formata os dados de data e horário do exame.
    Prioriza scheduled_starts_at/scheduled_ends_at do participante.
    Caso não existam, utiliza available_from/duration_minutes do exame.
    """
    participant = participant or {}
    exam = exam or {}

    start_dt = (
        participant.get("scheduledStartsAt")
        or participant.get("scheduled_starts_at")
        or exam.get("availableFrom")
        or exam.get("available_from")
    )
    end_dt = (
        participant.get("scheduledEndsAt")
        or participant.get("scheduled_ends_at")
        or exam.get("availableUntil")
        or exam.get("available_until")
    )
    duration = exam.get("durationMinutes") or exam.get("duration_minutes") or 60

    if start_dt is None:
        return None

    if isinstance(start_dt, str):
        try:
            start_dt = datetime.fromisoformat(start_dt.replace("Z", "+00:00"))
        except ValueError:
            start_dt = None

    if start_dt is None:
        return None

    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    local_start = start_dt.astimezone(tz)

    if end_dt is None and duration:
        local_end = local_start + timedelta(minutes=int(duration))
    elif end_dt:
        if isinstance(end_dt, str):
            try:
                end_dt = datetime.fromisoformat(end_dt.replace("Z", "+00:00"))
            except ValueError:
                end_dt = None
        if end_dt:
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
            local_end = end_dt.astimezone(tz)
        else:
            local_end = local_start + timedelta(minutes=int(duration))
    else:
        local_end = local_start + timedelta(minutes=int(duration))

    date_str = f"{local_start.day} de {MONTH_NAMES_PT[local_start.month]} de {local_start.year}"
    start_time_str = local_start.strftime("%H:%M")
    end_time_str = local_end.strftime("%H:%M")

    return {
        "date_full": date_str,
        "date_short": local_start.strftime("%d/%m/%Y"),
        "start_time": start_time_str,
        "end_time": end_time_str,
        "entry_time": start_time_str
    }


def build_exam_access_email(company_name, participant, password=None, login_url="", exam=None):
    """
    Monta o e-mail de acesso ao exame seguindo a ETAPA 8 / 8.1.

    Parâmetros
    ----------
    company_name : str
    participant  : dict com fullName/full_name, email, scheduledStartsAt/scheduled_starts_at
    password     : str ou None — senha temporária em texto plano. Se None ou omisso,
                   exibe a instrução para o participante usar a senha cadastrada ou redefinir.
    login_url    : str — URL de acesso à plataforma (login.html?examId=X)
    exam         : dict opcional com title, availableFrom, availableUntil, durationMinutes

    Retorna
    -------
    (subject, text_body, html_body)
    """
    participant = participant or {}
    exam = exam or {}

    participant_name = (
        participant.get("fullName")
        or participant.get("full_name")
        or participant.get("name")
        or "Participante"
    )
    participant_email = participant.get("email") or ""
    exam_title = exam.get("title") or "Avaliação"
    exam_id = (
        exam.get("id")
        or exam.get("examId")
        or participant.get("exam_id")
        or participant.get("examId")
    )

    if login_url and exam_id and "examId=" not in login_url:
        separator = "&" if "?" in login_url else "?"
        login_url += f"{separator}examId={exam_id}"

    schedule = format_exam_schedule(participant, exam)

    subject = f"Agendamento do exame {exam_title}" if exam_title else f"Agendamento de exame — {company_name}"

    # Trata credencial: CENÁRIO A (senha temporária disponível) vs CENÁRIO B (sem senha em texto plano)
    has_temp_password = bool(password and isinstance(password, str) and not password.startswith("["))

    # --- Texto simples ---
    lines = [f"Olá, {participant_name}!"]
    lines.append("")

    if schedule:
        lines.append(
            f"Confirmamos o agendamento de seu exame {exam_title} para o dia "
            f"{schedule['date_full']}, das {schedule['start_time']} às {schedule['end_time']}."
        )
    else:
        lines.append(f"Confirmamos o agendamento de seu exame {exam_title}.")

    lines.append("")
    lines.append("Este é o link de acesso da plataforma onde realizará o exame:")
    lines.append("")
    lines.append(login_url if login_url else "Acesse pelo endereço informado pela empresa.")
    lines.append("")
    lines.append(f"Login: {participant_email}")
    if has_temp_password:
        lines.append(f"Senha temporária: {password}")
    else:
        lines.append("")
        lines.append("Utilize a senha cadastrada na plataforma.")
        lines.append("")
        lines.append("Caso não se lembre da senha, entre em contato com a organização responsável pelo exame para solicitar suporte de acesso.")
    lines.append("")

    if schedule:
        lines.append(
            f"No dia do exame, no horário agendado (às {schedule['start_time']}), acesse a plataforma para realizar "
            "as verificações obrigatórias de câmera, microfone e tela."
        )
    else:
        lines.append(
            "No dia do exame, acesse a plataforma para realizar as verificações obrigatórias "
            "de câmera, microfone e tela."
        )

    lines.append("")
    lines.append(
        "Após concluir as verificações, você ficará na sala de espera até ser recebido e liberado pelo proctor."
    )
    lines.append("")
    lines.append(
        "Durante o exame, sua câmera, microfone e tela serão utilizados para monitoramento e gravação conforme as regras da avaliação."
    )
    lines.append("")
    lines.append("Você só deverá iniciar o exame após a liberação do proctor.")
    lines.append("")
    lines.append("Atenciosamente,")
    lines.append("Coordenação de Exames")

    text_body = "\n".join(lines)

    # --- HTML ---
    html_parts = [
        f"<h2>Agendamento do Exame</h2>",
        f"<p>Olá, <strong>{escape(participant_name)}</strong>!</p>",
    ]
    if schedule:
        html_parts.append(
            f"<p>Confirmamos o agendamento de seu exame <strong>{escape(exam_title)}</strong> "
            f"para o dia <strong>{escape(schedule['date_full'])}</strong>, "
            f"das <strong>{escape(schedule['start_time'])}</strong> às <strong>{escape(schedule['end_time'])}</strong>.</p>"
        )
    else:
        html_parts.append(
            f"<p>Confirmamos o agendamento de seu exame <strong>{escape(exam_title)}</strong>.</p>"
        )

    html_parts += [
        "<p>Este é o link de acesso da plataforma onde realizará o exame:</p>",
        f'<p><a href="{escape(login_url)}" style="font-weight: bold; color: #0f6f73;">{escape(login_url)}</a></p>' if login_url else "<p>Acesse pelo endereço informado pela empresa.</p>",
    ]

    if has_temp_password:
        html_parts.append(
            f"<p><strong>Login:</strong> {escape(participant_email)}<br>"
            f"<strong>Senha temporária:</strong> {escape(password)}</p>"
        )
    else:
        html_parts.append(
            f"<p><strong>Login:</strong> {escape(participant_email)}</p>"
            "<p>Utilize a senha cadastrada na plataforma.</p>"
            "<p>Caso não se lembre da senha, entre em contato com a organização responsável pelo exame para solicitar suporte de acesso.</p>"
        )

    if schedule:
        html_parts.append(
            f"<p>No dia do exame, no horário agendado (às <strong>{escape(schedule['start_time'])}</strong>), acesse a plataforma para realizar "
            "as verificações obrigatórias de câmera, microfone e tela.</p>"
        )
    else:
        html_parts.append(
            "<p>No dia do exame, acesse a plataforma para realizar as verificações obrigatórias "
            "de câmera, microfone e tela.</p>"
        )

    html_parts += [
        "<p>Após concluir as verificações, você ficará na sala de espera até ser recebido e liberado pelo proctor.</p>",
        "<p>Durante o exame, sua câmera, microfone e tela serão utilizados para monitoramento e gravação conforme as regras da avaliação.</p>",
        "<p><strong>Você só deverá iniciar o exame após a liberação do proctor.</strong></p>",
        "<br><p>Atenciosamente,<br><strong>Coordenação de Exames</strong></p>"
    ]
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

def exam_login_url(exam_id=None):
    """Retorna a URL de login do participante, ou string vazia em ambiente local."""
    from urllib.parse import urlparse
    base_url = mail_settings()["base_url"]
    hostname = (urlparse(base_url).hostname or "").lower()
    if not hostname or hostname in {"localhost", "127.0.0.1"} or hostname.endswith(".trycloudflare.com"):
        return ""
    url = base_url.rstrip("/") + "/login.html"
    if exam_id:
        url += f"?examId={exam_id}"
    return url
