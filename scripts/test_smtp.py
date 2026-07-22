import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

from recording_retention import mail_settings, send_email


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Envia um e-mail de teste usando o SMTP configurado no .env.")
    parser.add_argument("--to", dest="recipient", help="E-mail que receberá o teste.")
    args = parser.parse_args()

    settings = mail_settings()
    configured_recipient = os.getenv("SMTP_TEST_TO", "").strip() or os.getenv(
        "PROPOSAL_EMAIL", "comercial@onlineteste.com.br"
    ).strip()
    recipient = (
        args.recipient
        or (input(f"E-mail que receberá o teste [{configured_recipient}]: ").strip() if sys.stdin.isatty() else "")
        or configured_recipient
    ).strip()
    if "@" not in recipient:
        raise SystemExit("Informe um e-mail destinatário válido.")

    missing = [name for name, value in {
        "SMTP_HOST": settings["host"],
        "SMTP_FROM": settings["sender"],
    }.items() if not value]
    if missing:
        raise SystemExit("Configuração ausente no .env: " + ", ".join(missing))

    subject = "Teste de envio — Online Teste"
    text = (
        "Este é um e-mail de diagnóstico do sistema Online Teste.\n\n"
        "Se você recebeu esta mensagem, a configuração SMTP está funcionando.\n"
        f"Servidor utilizado: {settings['host']}:{settings['port']}"
    )
    body = (
        "<h2>Configuração SMTP funcionando</h2>"
        "<p>Este é um e-mail de diagnóstico do sistema <strong>Online Teste</strong>.</p>"
        "<p>Se você recebeu esta mensagem, o envio dos avisos de gravação está configurado corretamente.</p>"
    )
    try:
        send_email(recipient, subject, text, body)
    except Exception as exc:
        raise SystemExit(f"Falha no envio SMTP: {exc}") from None
    print(f"E-mail de teste enviado com sucesso para {recipient}.")


if __name__ == "__main__":
    main()
