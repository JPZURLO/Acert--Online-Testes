import unittest
from pathlib import Path
from unittest.mock import patch

from flask import Flask, jsonify

from error_monitoring import (
    create_error_monitoring_blueprint,
    error_fingerprint,
    install_error_handlers,
    module_from_path,
    sanitize_text,
)


ROOT = Path(__file__).resolve().parents[1]


class ErrorMonitoringTests(unittest.TestCase):
    def test_sensitive_values_are_removed(self):
        cleaned = sanitize_text(
            "senha=Segredo123 token=abc.def email pessoa@empresa.com.br documento 12345678901"
        )
        self.assertNotIn("Segredo123", cleaned)
        self.assertNotIn("abc.def", cleaned)
        self.assertNotIn("pessoa@empresa.com.br", cleaned)
        self.assertNotIn("12345678901", cleaned)
        self.assertIn("[OCULTO]", cleaned)

    def test_fingerprint_groups_variable_identifiers(self):
        first = error_fingerprint("server", "Testes", "RuntimeError", "Falha no teste 123", "/api/exams/123")
        second = error_fingerprint("server", "Testes", "RuntimeError", "Falha no teste 987", "/api/exams/987")
        self.assertEqual(first, second)

    def test_module_is_inferred_from_route(self):
        self.assertEqual(module_from_path("/api/participant/recordings"), "Gravações")
        self.assertEqual(module_from_path("/login_empresa"), "Autenticação")

    def test_admin_routes_require_admin_session_before_database(self):
        app = Flask(__name__)

        def reject_session(_kind):
            return None, (jsonify({"success": False}), 401)

        def should_not_open_database():
            raise AssertionError("database should not be opened")

        app.register_blueprint(create_error_monitoring_blueprint(should_not_open_database, reject_session))
        response = app.test_client().get("/api/admin/system-errors")
        self.assertEqual(response.status_code, 401)

    def test_unhandled_server_exception_is_reported_automatically(self):
        app = Flask(__name__)
        app.testing = False

        def no_session(_kind):
            return None, (jsonify({"success": False}), 401)

        @app.get("/api/test-boom")
        def boom():
            raise RuntimeError("falha automática")

        install_error_handlers(app, lambda: None, no_session)
        with patch("error_monitoring.record_system_error", return_value="ERR-TESTE-001") as recorder:
            response = app.test_client().get("/api/test-boom")
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json()["incidentCode"], "ERR-TESTE-001")
        recorder.assert_called_once()

    def test_schema_admin_screen_and_reporter_contract(self):
        migration = (ROOT / "migrations" / "014_system_error_monitoring.sql").read_text(encoding="utf-8")
        admin = (ROOT / "front-end" / "Admin.html").read_text(encoding="utf-8")
        reporter = (ROOT / "front-end" / "js" / "error-reporter.js").read_text(encoding="utf-8")
        self.assertIn("CREATE TABLE IF NOT EXISTS system_errors", migration)
        self.assertIn("CREATE TABLE IF NOT EXISTS system_error_occurrences", migration)
        self.assertIn('data-admin-section="errors"', admin)
        self.assertIn("error-create-support", admin)
        self.assertIn("unhandledrejection", reporter)
        self.assertIn("response.status>=500", reporter)
        self.assertNotIn("localStorage", reporter)


if __name__ == "__main__":
    unittest.main()
