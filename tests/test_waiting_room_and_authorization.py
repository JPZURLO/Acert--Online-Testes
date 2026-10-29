import unittest
from pathlib import Path
from flask import Flask, jsonify
from company_operations_api import create_company_operations_blueprint
from participant_api import create_participant_blueprint, AUDIT_EVENT_TYPES


class TestWaitingRoomAndAuthorization(unittest.TestCase):
    def test_waiting_room_contract_and_html_elements_present(self):
        candidate_html = Path("front-end/AreaParticipante.html").read_text(encoding="utf-8")
        candidate_js = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        monitor_html = Path("front-end/Monitoramento.html").read_text(encoding="utf-8")
        monitor_js = Path("front-end/js/company-operations.js").read_text(encoding="utf-8")

        # Candidate Waiting Room UI elements
        self.assertIn('id="waiting-room-view"', candidate_html)
        self.assertIn('id="waiting-room-logo"', candidate_html)
        self.assertIn('id="waiting-room-company"', candidate_html)
        self.assertIn('id="waiting-room-exam-title"', candidate_html)
        self.assertIn('id="waiting-room-candidate-name"', candidate_html)
        self.assertIn('Aguardando liberação do proctor', candidate_html)
        self.assertIn('id="waiting-chat-messages"', candidate_html)

        # Candidate JS waiting room logic
        self.assertIn("waiting_proctor", candidate_js)
        self.assertIn("enterWaitingRoom", candidate_js)
        self.assertIn("startWaitingRoomPolling", candidate_js)

        # Proctor UI elements & operations script
        self.assertIn('id="authorize-attempt"', monitor_html)
        self.assertIn('value="waiting_proctor"', monitor_html)
        self.assertIn("authorize_start", monitor_js)
        self.assertIn("operations-waiting", monitor_js)

    def test_audit_event_types_include_preflight_and_authorization(self):
        self.assertIn("preflight_completed", AUDIT_EVENT_TYPES)
        self.assertIn("proctor_authorized", AUDIT_EVENT_TYPES)

    def test_company_operations_authorize_start_route(self):
        app = Flask(__name__)

        def mock_token(kind):
            if kind == "company":
                return {"sub": "100"}, None
            return None, (jsonify({"message": "Não autorizado"}), 401)

        def mock_open_db():
            class DummyCursor:
                def __init__(self):
                    self.sql = ""
                    self.params = ()
                    self.rowcount = 1
                def execute(self, sql, params=()):
                    self.sql = sql
                    self.params = params
                    self.rowcount = 1
                def fetchone(self):
                    if "SELECT" in self.sql:
                        return {"id": 5, "company_id": 100, "status": "waiting_proctor", "duration_minutes": 60, "participant_id": 10}
                    return None
                def close(self):
                    pass
            class DummyConn:
                def cursor(self, dictionary=False):
                    return DummyCursor()
                def commit(self):
                    pass
                def rollback(self):
                    pass
                def close(self):
                    pass
            return DummyConn()

        app.register_blueprint(create_company_operations_blueprint(mock_open_db, mock_token))
        client = app.test_client()

        # Test authorize-start endpoint exists and calls successfully
        res = client.post("/api/company/attempts/5/authorize-start", json={})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("status"), "in_progress")

    def test_cross_company_authorization_prevention(self):
        app = Flask(__name__)

        # Session belongs to Company 100
        def mock_token(kind):
            if kind == "company":
                return {"sub": "100"}, None
            return None, (jsonify({"message": "Não autorizado"}), 401)

        # Attempt 5 belongs to Company 200 (Cross-company)
        def mock_open_db():
            class DummyCursor:
                def __init__(self):
                    self.rowcount = 0
                def execute(self, sql, params=()):
                    pass
                def fetchone(self):
                    # Query filtering by company_id=100 will return None
                    return None
                def close(self):
                    pass
            class DummyConn:
                def cursor(self, dictionary=False):
                    return DummyCursor()
                def rollback(self):
                    pass
                def close(self):
                    pass
            return DummyConn()

        app.register_blueprint(create_company_operations_blueprint(mock_open_db, mock_token))
        client = app.test_client()

        # Company 100 trying to authorize Company 200's attempt must fail with 404
        res = client.post("/api/company/attempts/5/authorize-start", json={})
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data.get("success"))


if __name__ == "__main__":
    unittest.main()
