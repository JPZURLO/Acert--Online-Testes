import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "014_system_error_monitoring.sql"
    statements = [item.strip() for item in migration.read_text(encoding="utf-8").split(";") if item.strip()]
    connection = open_database()
    cursor = connection.cursor()
    try:
        for statement in statements:
            cursor.execute(statement)
        connection.commit()
        print("Central de erros instalada com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
