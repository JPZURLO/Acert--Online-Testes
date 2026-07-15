"""Converte senhas legadas em texto puro para hashes Werkzeug.

Execute uma única vez, com backup recente e as variáveis de banco configuradas.
O script nunca imprime senhas ou hashes.
"""

import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


HASH_PREFIXES = ("pbkdf2:", "scrypt:")


def migrate_table(connection, table):
    cursor = connection.cursor(dictionary=True)
    updated = 0
    try:
        cursor.execute(f"SELECT id, senha FROM {table}")
        for row in cursor.fetchall():
            password = str(row.get("senha") or "")
            if not password or password.startswith(HASH_PREFIXES):
                continue
            cursor.execute(
                f"UPDATE {table} SET senha = %s WHERE id = %s",
                (generate_password_hash(password, method="pbkdf2:sha256"), row["id"]),
            )
            updated += 1
        return updated
    finally:
        cursor.close()


def main():
    connection = open_database()
    try:
        users = migrate_table(connection, "users")
        companies = migrate_table(connection, "empresas")
        connection.commit()
        print(f"Migração concluída: {users} usuário(s) e {companies} empresa(s) atualizados.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
