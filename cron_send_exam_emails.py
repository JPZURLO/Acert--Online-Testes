#!/usr/bin/env python3
"""
cron_send_exam_emails.py

Script para processamento de e-mails de acesso ao exame agendados.
Projetado para execução via Cron Job no cPanel (Turbo Cloud).

Configuração sugerida no cPanel:
  */5 * * * * /usr/local/bin/python3 /home/<usuario>/public_html/cron_send_exam_emails.py >> /home/<usuario>/logs/exam_email_cron.log 2>&1

Proteção contra execução simultânea via arquivo de lock.
Não exibe senhas, tokens ou credenciais nos logs.
"""
import os
import sys
import fcntl
import secrets
from datetime import datetime, timezone
from pathlib import Path

# Adiciona o diretório do projeto ao sys.path
PROJECT_DIR = Path(__file__).resolve().parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from dotenv import load_dotenv
load_dotenv(PROJECT_DIR / ".env")

from secure_app import open_database
from exam_email_service import (
    send_exam_access_email,
    exam_login_url,
)
from recording_retention import mail_settings

# -------------------------------------------------------------------------
# Configurações
# -------------------------------------------------------------------------
LOCK_FILE = PROJECT_DIR / "tmp" / "cron_exam_email.lock"
MAX_BATCH = int(os.getenv("CRON_EMAIL_BATCH_SIZE", "50"))


def log(message):
    """Log simples com timestamp. Não inclui credenciais."""
    print(f"[{datetime.now(timezone.utc).isoformat()}] {message}", flush=True)


def acquire_lock():
    """
    Tenta adquirir o lock exclusivo do processo.
    Retorna o file descriptor se bem-sucedido, None caso contrário.
    """
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = open(LOCK_FILE, "w")
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fd.write(str(os.getpid()))
        fd.flush()
        return fd
    except OSError:
        return None


def release_lock(fd):
    if fd:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
            fd.close()
            LOCK_FILE.unlink(missing_ok=True)
        except OSError:
            pass


def fetch_pending_emails(cursor):
    """
    Busca os e-mails pendentes cujo horário de envio já chegou.
    Ordena por scheduled_for ASC para processar os mais antigos primeiro.
    """
    cursor.execute(
        "SELECT q.id AS queue_id, q.exam_id, q.participant_id, q.send_option, "
        "q.scheduled_for, q.attempt_count, "
        "p.full_name, p.email AS participant_email, p.id AS p_id, "
        "e.title AS exam_title, e.available_from, "
        "c.RazaoSocial AS company_name, q.company_id "
        "FROM exam_email_queue q "
        "JOIN company_participants p ON p.id = q.participant_id "
        "JOIN company_exams e ON e.id = q.exam_id "
        "JOIN empresas c ON c.id = q.company_id "
        "WHERE q.status = 'pending' "
        "AND (q.scheduled_for IS NULL OR q.scheduled_for <= NOW()) "
        "ORDER BY q.scheduled_for ASC "
        "LIMIT %s",
        (MAX_BATCH,),
    )
    return cursor.fetchall()


def fetch_participant_password(cursor, participant_id):
    """
    Recupera a senha hasheada do participante — NÃO é a senha em texto plano.
    Como não guardamos a senha em texto plano após o cadastro, usamos uma
    senha de reenvio genérica com instrução para o participante usar
    'Esqueci minha senha'. Isso é um comportamento intencional e seguro.
    """
    # Não expomos a senha do banco. Retornamos None para indicar
    # que o e-mail de reenvio usará texto de redefinição.
    return None


def process_pending_emails(connection, cursor):
    rows = fetch_pending_emails(cursor)
    if not rows:
        log("Nenhum e-mail pendente.")
        return {"sent": 0, "failed": 0, "skipped": 0}

    log(f"{len(rows)} e-mail(s) pendente(s) encontrado(s).")
    login_url = exam_login_url()
    sent = 0
    failed = 0
    skipped = 0

    for row in rows:
        queue_id = row["queue_id"]
        participant_id = row["p_id"]
        participant = {
            "id": participant_id,
            "fullName": row["full_name"],
            "email": row["participant_email"],
        }
        exam = {
            "title": row["exam_title"],
            "availableFrom": row["available_from"],
        }

        # Busca a senha do participante em users
        cursor.execute(
            "SELECT senha FROM users WHERE LOWER(email) = LOWER(%s) LIMIT 1",
            (row["participant_email"],),
        )
        user_row = cursor.fetchone()
        if not user_row:
            log(f"[SKIP] queue_id={queue_id} — usuário não encontrado para {row['participant_email'][:4]}***")
            cursor.execute(
                "UPDATE exam_email_queue SET status='failed', "
                "last_error='Usuário não encontrado no sistema.', updated_at=NOW() "
                "WHERE id=%s",
                (queue_id,),
            )
            connection.commit()
            skipped += 1
            continue

        # Para reenvio pelo cron, usamos placeholder — o participante deve
        # usar a senha que já possui ou solicitar redefinição
        password_display = "[Use a senha cadastrada ou solicite redefinição]"

        success, error = send_exam_access_email(
            connection=connection,
            company_name=row["company_name"],
            participant=participant,
            password=password_display,
            login_url=login_url,
            exam=exam,
            queue_id=queue_id,
        )

        if success:
            log(f"[OK] queue_id={queue_id} — enviado para {row['participant_email'][:4]}***")
            sent += 1
        else:
            log(f"[FAIL] queue_id={queue_id} — {error}")
            failed += 1

    return {"sent": sent, "failed": failed, "skipped": skipped}


def main():
    log("=== Início do processamento de e-mails de exame ===")

    # Verifica configuração SMTP antes de conectar ao banco
    settings = mail_settings()
    if not settings["host"] or not settings["sender"]:
        log("[ABORT] SMTP_HOST ou SMTP_FROM não configurados. Encerrando.")
        sys.exit(0)

    # Lock exclusivo para impedir execução paralela
    lock_fd = acquire_lock()
    if lock_fd is None:
        log("[ABORT] Outro processo já está em execução. Encerrando.")
        sys.exit(0)

    connection = None
    cursor = None
    try:
        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        result = process_pending_emails(connection, cursor)
        log(
            f"Resultado: {result['sent']} enviado(s), "
            f"{result['failed']} falhou, "
            f"{result['skipped']} ignorado(s)."
        )
    except Exception as exc:
        # Loga o erro sem incluir credenciais
        error_type = type(exc).__name__
        log(f"[ERROR] {error_type}: {str(exc)[:200]}")
        sys.exit(1)
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()
        release_lock(lock_fd)
        log("=== Fim do processamento ===")


if __name__ == "__main__":
    main()
