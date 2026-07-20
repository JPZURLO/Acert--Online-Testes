import unittest
from pathlib import Path
from unittest.mock import patch

from flask import Flask, jsonify

from company_operations_api import create_company_operations_blueprint
from participants_api import participant_license_usage


class _UsageCursor:
    def __init__(self, used):
        self.used = used
        self.sql = ""

    def execute(self, sql, _params):
        self.sql = sql

    def fetchone(self):
        return {"used": self.used}

    def close(self):
        pass


class _UsageConnection:
    def __init__(self, used):
        self.cursor_instance = _UsageCursor(used)

    def cursor(self, dictionary=False):
        return self.cursor_instance


class CompanyOperationsTests(unittest.TestCase):
    def test_operation_routes_require_authenticated_account(self):
        app = Flask(__name__)

        def reject(_kind):
            return None, (jsonify({"message": "Não autorizado"}), 403)

        app.register_blueprint(create_company_operations_blueprint(lambda: None, reject))
        client = app.test_client()
        self.assertEqual(client.get("/api/company/operations").status_code, 403)
        self.assertEqual(client.get("/api/participant/attempts/1/chat").status_code, 403)

    def test_monitoring_contract_and_migration_are_present(self):
        page = Path("front-end/Monitoramento.html").read_text(encoding="utf-8")
        company_script = Path("front-end/js/company-operations.js").read_text(encoding="utf-8")
        candidate_script = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        candidate_page = Path("front-end/AreaParticipante.html").read_text(encoding="utf-8")
        migration = Path("migrations/011_company_exam_operations.sql").read_text(encoding="utf-8")
        self.assertIn('id="resume-attempt"', page)
        self.assertIn('id="close-attempt"', page)
        self.assertIn('id="company-chat-form"', page)
        self.assertIn("generate_resume", company_script)
        self.assertIn("handleCompanyPause", candidate_script)
        self.assertIn('id="resume-code"', candidate_page)
        self.assertIn("attempt_chat_messages", migration)
        self.assertIn("resume_code_hash", migration)

    def test_inactive_participants_still_consume_monthly_limit(self):
        connection = _UsageConnection(2)
        snapshot = {"status": "active", "maxParticipantsMonth": 2}
        with patch("participants_api.company_license_snapshot", return_value=snapshot):
            with self.assertRaisesRegex(ValueError, "Inativar um participante não libera"):
                participant_license_usage(connection, 9, 1)
        self.assertNotIn("status", connection.cursor_instance.sql.lower())

    def test_company_has_no_participant_delete_endpoint(self):
        source = Path("participants_api.py").read_text(encoding="utf-8")
        self.assertNotIn('@blueprint.delete("/api/company/participants', source)
        self.assertIn('action not in {"deactivate", "activate", "assign_exam", "resend_invite"}', source)


if __name__ == "__main__":
    unittest.main()