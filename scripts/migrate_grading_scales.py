import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "008_exam_grading_scales.sql"
    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='company_exams' AND column_name='grading_scale_json'")
        column_exists = bool(cursor.fetchone()[0])
        statements = [part.strip() for part in migration.read_text(encoding="utf-8").split(";") if part.strip()]
        for index, statement in enumerate(statements):
            if index or not column_exists:
                cursor.execute(statement)
        connection.commit()
        print("Escalas de pontuação criadas com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
