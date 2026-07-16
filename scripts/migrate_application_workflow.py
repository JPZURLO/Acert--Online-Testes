import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


def statements(sql):
    return [statement.strip() for statement in sql.split(";") if statement.strip()]


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "006_exam_application_workflow.sql"
    connection = open_database()
    cursor = connection.cursor()
    try:
        for statement in statements(migration.read_text(encoding="utf-8")):
            cursor.execute(statement)
        connection.commit()
        print("Fluxo de aplicação e revisão criado com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
