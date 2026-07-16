import getpass
import re

from werkzeug.security import generate_password_hash

from secure_app import open_database


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def main():
    name = input("Nome do administrador: ").strip()
    email = input("E-mail do administrador: ").strip().lower()
    password = getpass.getpass("Senha (mínimo de 12 caracteres): ")
    confirmation = getpass.getpass("Confirme a senha: ")
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
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
