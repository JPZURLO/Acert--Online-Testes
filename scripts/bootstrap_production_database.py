import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from secure_app import open_database


def statements(sql):
    cleaned = []
    for line in sql.splitlines():
        if line.lstrip().startswith("--"):
            continue
        cleaned.append(line)
    return [item.strip() for item in "\n".join(cleaned).split(";") if item.strip()]


def main():
    root = Path(__file__).resolve().parents[1]
    migration_dir = root / "migrations"
    files = sorted(migration_dir.glob("*.sql"))
    if not files or files[0].name != "000_base_schema.sql":
        raise SystemExit("A migração base 000_base_schema.sql não foi encontrada.")

    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema=DATABASE() AND table_type='BASE TABLE'"
        )
        table_count = int(cursor.fetchone()[0] or 0)
        if table_count:
            raise SystemExit(
                f"Operação cancelada: o banco selecionado já possui {table_count} tabela(s). "
                "Este instalador aceita somente um banco completamente vazio."
            )

        for migration in files:
            print(f"Aplicando {migration.name}...")
            for statement in statements(migration.read_text(encoding="utf-8")):
                cursor.execute(statement)
            connection.commit()

        cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")
        total = int(cursor.fetchone()[0] or 0)
        print(f"Banco de produção criado com sucesso: {total} tabela(s).")
        print("Próximos passos: python scripts/create_admin.py e python scripts/create_company.py")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()