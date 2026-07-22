import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "012_company_activation.sql"
    statements = [item.strip() for item in migration.read_text(encoding="utf-8").split(";") if item.strip()]
    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema=DATABASE() AND table_name='empresas' AND column_name='contact_email'"
        )
        if not cursor.fetchone()[0]:
            cursor.execute(statements[0])
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema=DATABASE() AND table_name='company_activation_tokens'"
        )
        if not cursor.fetchone()[0]:
            cursor.execute(statements[1])
        connection.commit()
        print("Migração de ativação de empresas concluída com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
