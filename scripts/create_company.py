import getpass
import re
import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def digits(value):
    return "".join(character for character in str(value or "") if character.isdigit())


def main():
    company_name = input("Razão social da empresa: ").strip()
    cnpj = digits(input("CNPJ: "))
    plan_slug = input("Plano [profissional]: ").strip().lower() or "profissional"
    recording_email = input("E-mail responsável pelas gravações: ").strip().lower()
    password = getpass.getpass("Senha da empresa (mínimo de 12 caracteres): ")
    confirmation = getpass.getpass("Confirme a senha: ")

    if not company_name:
        raise SystemExit("Informe a razão social.")
    if len(cnpj) != 14:
        raise SystemExit("Informe um CNPJ com 14 dígitos.")
    if recording_email and not EMAIL_PATTERN.fullmatch(recording_email):
        raise SystemExit("Informe um e-mail responsável válido.")
    if len(password) < 12:
        raise SystemExit("A senha precisa ter pelo menos 12 caracteres.")
    if password != confirmation:
        raise SystemExit("As senhas não coincidem.")

    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM license_plans WHERE slug=%s AND status='active' LIMIT 1", (plan_slug,))
        plan = cursor.fetchone()
        if not plan:
            cursor.execute("SELECT slug FROM license_plans WHERE status='active' ORDER BY id")
            available = ", ".join(row["slug"] for row in cursor.fetchall())
            raise SystemExit(f"Plano não encontrado. Disponíveis: {available or 'nenhum'}")

        password_hash = generate_password_hash(password, method="pbkdf2:sha256")
        cursor.execute("SELECT id FROM empresas WHERE CNPJ=%s LIMIT 1", (cnpj,))
        existing = cursor.fetchone()
        if existing:
            company_id = existing["id"]
            cursor.execute(
                "UPDATE empresas SET RazaoSocial=%s,senha=%s WHERE id=%s",
                (company_name[:180], password_hash, company_id),
            )
        else:
            cursor.execute(
                "INSERT INTO empresas (RazaoSocial,CNPJ,senha) VALUES (%s,%s,%s)",
                (company_name[:180], cnpj, password_hash),
            )
            company_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO company_licenses "
            "(company_id,plan_id,status,starts_at,payment_status,recording_contact_email) "
            "VALUES (%s,%s,'active',CURRENT_DATE,'pending',%s) "
            "ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id),status='active',"
            "starts_at=COALESCE(starts_at,CURRENT_DATE),recording_contact_email=VALUES(recording_contact_email)",
            (company_id, plan["id"], recording_email or None),
        )
        connection.commit()
        print(f"Empresa criada ou atualizada com sucesso. ID: {company_id}")
        print(f"Login: CNPJ {cnpj} | Plano: {plan_slug}")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()