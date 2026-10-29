import unittest
from pathlib import Path

from scripts.bootstrap_production_database import statements


class ProductionBootstrapTests(unittest.TestCase):
    def test_base_schema_creates_legacy_identity_tables(self):
        schema = Path("migrations/000_base_schema.sql").read_text(encoding="utf-8")
        self.assertIn("CREATE TABLE IF NOT EXISTS users", schema)
        self.assertIn("CREATE TABLE IF NOT EXISTS empresas", schema)
        self.assertIn("UNIQUE KEY uq_users_email", schema)
        self.assertIn("UNIQUE KEY uq_empresas_cnpj", schema)

    def test_all_migrations_have_executable_statements(self):
        files = sorted([f for f in Path("migrations").glob("*.sql") if not f.name.endswith("_rollback.sql")])
        self.assertEqual(files[0].name, "000_base_schema.sql")
        self.assertEqual(files[-1].name, "023_create_webrtc_signals.sql")
        for migration in files:
            with self.subTest(migration=migration.name):
                self.assertTrue(statements(migration.read_text(encoding="utf-8")))

    def test_question_bank_migration_adds_reusable_question_storage(self):
        migration = Path("migrations/019_question_bank_and_decimal_points.sql").read_text(encoding="utf-8")
        self.assertIn("CREATE TABLE IF NOT EXISTS company_question_bank", migration)
        self.assertIn("question_json LONGTEXT NOT NULL", migration)
        self.assertIn("MODIFY total_points DECIMAL(8,2)", migration)

    def test_company_units_migration_adds_branch_storage(self):
        migration = Path("migrations/020_company_units.sql").read_text(encoding="utf-8")
        self.assertIn("CREATE TABLE IF NOT EXISTS company_units", migration)

    def test_rename_company_unit_migration_updates_default_unit_name(self):
        migration = Path("migrations/022_rename_default_company_unit.sql").read_text(encoding="utf-8")
        self.assertIn("UPDATE company_units", migration)
        self.assertIn("Academia Brasileira de Certificações e Treinamentos", migration)


    def test_participant_schedule_migration_adds_individual_period_and_archive(self):
        migration = Path("migrations/021_participant_exam_schedule.sql").read_text(encoding="utf-8")
        self.assertIn("scheduled_starts_at", migration)
        self.assertIn("scheduled_ends_at", migration)
        self.assertIn("archived_at", migration)
    def test_bootstrap_refuses_existing_database(self):
        source = Path("scripts/bootstrap_production_database.py").read_text(encoding="utf-8")
        self.assertIn("banco completamente vazio", source)
        self.assertIn("table_count", source)

    def test_first_company_command_hashes_password_and_creates_license(self):
        source = Path("scripts/create_company.py").read_text(encoding="utf-8")
        self.assertIn("generate_password_hash", source)
        self.assertIn("INSERT INTO company_licenses", source)
        self.assertNotIn("input(\"Senha", source)


if __name__ == "__main__":
    unittest.main()
