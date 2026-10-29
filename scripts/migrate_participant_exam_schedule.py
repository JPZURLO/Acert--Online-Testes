"""Adiciona agendamento individual e arquivamento seguro para provas existentes."""
from migrate_company_units import add_index, column_exists, index_exists, open_database


def main():
    connection = open_database()
    cursor = connection.cursor()
    try:
        if not column_exists(cursor, "company_participants", "scheduled_starts_at"):
            cursor.execute("ALTER TABLE company_participants ADD COLUMN scheduled_starts_at DATETIME NULL AFTER exam_id")
        if not column_exists(cursor, "company_participants", "scheduled_ends_at"):
            cursor.execute("ALTER TABLE company_participants ADD COLUMN scheduled_ends_at DATETIME NULL AFTER scheduled_starts_at")
        add_index(cursor, "company_participants", "idx_participant_company_schedule", "ALTER TABLE company_participants ADD INDEX idx_participant_company_schedule (company_id, scheduled_starts_at)")
        if not column_exists(cursor, "company_exams", "archived_at"):
            cursor.execute("ALTER TABLE company_exams ADD COLUMN archived_at DATETIME NULL AFTER updated_at")
        add_index(cursor, "company_exams", "idx_exams_company_archived", "ALTER TABLE company_exams ADD INDEX idx_exams_company_archived (company_id, archived_at)")
        connection.commit()
        print("Agendamento individual de provas concluído.")
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    main()
