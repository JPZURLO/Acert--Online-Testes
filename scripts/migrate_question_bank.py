import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database  # noqa: E402


def migration_statements(path):
    cleaned = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.lstrip().startswith("--"):
            continue
        cleaned.append(line)
    return [item.strip() for item in "\n".join(cleaned).split(";") if item.strip()]


def main():
    migration = Path(__file__).resolve().parents[1] / "migrations" / "019_question_bank_and_decimal_points.sql"
    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema=DATABASE() AND table_name='company_question_bank'"
        )
        table_exists = bool(cursor.fetchone()[0])

        for statement in migration_statements(migration):
            if table_exists and statement.upper().startswith("CREATE TABLE"):
                continue
            cursor.execute(statement)

        connection.commit()
        print("Banco de questões, pontuação decimal e exportação avançada preparados com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
