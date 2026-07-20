import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "009_support_finance.sql"
    connection = open_database()
    cursor = connection.cursor()
    try:
        statements = [item.strip() for item in migration.read_text(encoding="utf-8").split(";") if item.strip()]
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema=DATABASE() AND table_name IN ('license_plans','company_licenses')"
        )
        columns = {row[0] for row in cursor.fetchall()}
        for index, statement in enumerate(statements):
            if index == 0 and "monthly_price" in columns:
                continue
            if index == 1 and "monthly_value" in columns:
                continue
            cursor.execute(statement)
        connection.commit()
        print("Módulos de suporte e financeiro criados com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()