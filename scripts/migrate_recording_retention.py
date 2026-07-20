import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database


ALTER_COLUMNS = {
    "license_plans": "recording_retention_days",
    "company_licenses": "recording_contact_email",
    "attempt_recordings": "available_until",
}


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "010_recording_retention.sql"
    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT table_name,column_name FROM information_schema.columns "
            "WHERE table_schema=DATABASE() AND table_name IN ('license_plans','company_licenses','attempt_recordings')"
        )
        existing = {(row[0], row[1]) for row in cursor.fetchall()}
        statements = [item.strip() for item in migration.read_text(encoding="utf-8").split(";") if item.strip()]
        for index, statement in enumerate(statements):
            if index < 3:
                table, column = list(ALTER_COLUMNS.items())[index]
                if (table, column) in existing:
                    continue
            cursor.execute(statement)
        connection.commit()
        print("Retenção e avisos de gravação configurados com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()