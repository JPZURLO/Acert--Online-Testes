import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "011_company_exam_operations.sql"
    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema=DATABASE() AND table_name='exam_attempts'"
        )
        columns = {row[0] for row in cursor.fetchall()}
        statements = [item.strip() for item in migration.read_text(encoding="utf-8").split(";") if item.strip()]
        for index, statement in enumerate(statements):
            if index == 0 and "resume_code_hash" in columns:
                continue
            cursor.execute(statement)
        connection.commit()
        print("Retomada especial, chat e controle de aplicações criados com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
