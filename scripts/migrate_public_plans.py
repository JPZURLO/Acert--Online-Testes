import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "013_sync_public_plans.sql"
    statements = [item.strip() for item in migration.read_text(encoding="utf-8").split(";") if item.strip()]
    connection = open_database()
    cursor = connection.cursor()
    try:
        for statement in statements:
            cursor.execute(statement)
        connection.commit()
        cursor.execute("SELECT name FROM license_plans WHERE status='active' ORDER BY id")
        print("Planos ativos atualizados: " + ", ".join(row[0] for row in cursor.fetchall()))
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
