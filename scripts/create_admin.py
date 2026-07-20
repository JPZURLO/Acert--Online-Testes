import getpass
import os
import re
import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def admin_credentials():
    name = os.getenv("BOOTSTRAP_ADMIN_NAME", "").strip()
    email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    environment_mode = any((name, email, password))
    if environment_mode:
        missing = [
            variable
            for variable, value in (
                ("BOOTSTRAP_ADMIN_NAME", name),
                ("BOOTSTRAP_ADMIN_EMAIL", email),
                ("BOOTSTRAP_ADMIN_PASSWORD", password),
            )
            if not value
        ]
        if missing:
            raise SystemExit(f"Configure também: {', '.join(missing)}.")
        return name, email, password, password, True

    return (
        input("Nome do administrador: ").strip(),
        input("E-mail do administrador: ").strip().lower(),
        getpass.getpass("Senha (mínimo de 12 caracteres): "),
        getpass.getpass("Confirme a senha: "),
        False,
    )


def main():
    name, email, password, confirmation, environment_mode = admin_credentials()
    if not name:
        raise SystemExit("Informe o nome do administrador.")
    if not EMAIL_PATTERN.fullmatch(email):
        raise SystemExit("Informe um e-mail válido.")
    if len(password) < 12:
        raise SystemExit("A senha precisa ter pelo menos 12 caracteres.")
    if password != confirmation:
        raise SystemExit("As senhas não coincidem.")

    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO admin_users (name, email, password_hash, active) VALUES (%s, %s, %s, TRUE) "
            "ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), active = TRUE",
            (name[:160], email[:254], password_hash),
        )
        connection.commit()
        print("Administrador criado ou atualizado com sucesso.")
        if environment_mode:
            print("Remova as variáveis BOOTSTRAP_ADMIN_* do painel agora.")
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
