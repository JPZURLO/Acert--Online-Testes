"""Adiciona suporte a unidades/filiais em um banco existente.

Use este script quando o banco já está em produção/homologação e não pode
rodar o bootstrap completo. Ele verifica colunas e índices antes de criar.
"""

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from secure_app import open_database  # noqa: E402


TABLES = (
    ("company_exams", "idx_exams_company_unit_status", "idx_exams_company_unit_updated"),
    ("company_participants", "idx_participant_company_unit_status", "idx_participant_company_unit_exam"),
    ("company_results", "idx_results_company_unit_completed", None),
    ("company_question_bank", "idx_question_bank_company_unit_updated", None),
)


def table_exists(cursor, table):
    cursor.execute("SHOW TABLES LIKE %s", (table,))
    return cursor.fetchone() is not None


def column_exists(cursor, table, column):
    cursor.execute(f"SHOW COLUMNS FROM {table} LIKE %s", (column,))
    return cursor.fetchone() is not None


def index_exists(cursor, table, index):
    if not index:
        return True
    cursor.execute(f"SHOW INDEX FROM {table} WHERE Key_name = %s", (index,))
    return cursor.fetchone() is not None


def add_index(cursor, table, index, sql):
    if index_exists(cursor, table, index):
        return
    cursor.execute(sql)


def main():
    connection = open_database()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS company_units (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                company_id BIGINT NOT NULL,
                name VARCHAR(140) NOT NULL,
                responsible_name VARCHAR(140) NULL,
                email VARCHAR(254) NULL,
                logo_data MEDIUMTEXT NULL,
                is_default BOOLEAN NOT NULL DEFAULT FALSE,
                status VARCHAR(16) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_company_unit_name (company_id, name),
                INDEX idx_company_unit_company_status (company_id, status),
                INDEX idx_company_unit_default (company_id, is_default)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        )

        cursor.execute(
            """
            INSERT INTO company_units (company_id, name, is_default, status)
            SELECT e.id, e.RazaoSocial, TRUE, 'active'
            FROM empresas e
            LEFT JOIN company_units u ON u.company_id = e.id AND u.is_default = TRUE
            WHERE u.id IS NULL
            """
        )

        for table, first_index, second_index in TABLES:
            if not table_exists(cursor, table):
                print(f"Ignorando {table}: tabela não encontrada.")
                continue
            if not column_exists(cursor, table, "unit_id"):
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN unit_id BIGINT NULL AFTER company_id")

            if table == "company_exams":
                add_index(cursor, table, first_index, "ALTER TABLE company_exams ADD INDEX idx_exams_company_unit_status (company_id, unit_id, status)")
                add_index(cursor, table, second_index, "ALTER TABLE company_exams ADD INDEX idx_exams_company_unit_updated (company_id, unit_id, updated_at)")
            elif table == "company_participants":
                add_index(cursor, table, first_index, "ALTER TABLE company_participants ADD INDEX idx_participant_company_unit_status (company_id, unit_id, status)")
                add_index(cursor, table, second_index, "ALTER TABLE company_participants ADD INDEX idx_participant_company_unit_exam (company_id, unit_id, exam_id)")
            elif table == "company_results":
                add_index(cursor, table, first_index, "ALTER TABLE company_results ADD INDEX idx_results_company_unit_completed (company_id, unit_id, completed_at)")
            elif table == "company_question_bank":
                add_index(cursor, table, first_index, "ALTER TABLE company_question_bank ADD INDEX idx_question_bank_company_unit_updated (company_id, unit_id, updated_at)")

            cursor.execute(
                f"""
                UPDATE {table} target
                JOIN company_units u ON u.company_id = target.company_id AND u.is_default = TRUE
                SET target.unit_id = u.id
                WHERE target.unit_id IS NULL
                """
            )

        connection.commit()
        print("Migração de unidades/filiais concluída com sucesso.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
