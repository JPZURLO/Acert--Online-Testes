import os
import unittest
from html.parser import HTMLParser
from pathlib import Path

from flask import Flask, jsonify

from participants_api import clean_participant, create_participants_blueprint


os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")

import server  # noqa: E402


class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []

    def handle_starttag(self, _tag, attrs):
        value = dict(attrs).get("id")
        if value:
            self.ids.append(value)


class ParticipantsWorkspaceTests(unittest.TestCase):
    def test_participant_is_normalized(self):
        participant = clean_participant(
            {
                "fullName": "  João da Silva  ",
                "email": " JOAO@EXEMPLO.COM ",
                "cpf": "123.456.789-00",
                "phone": "(11) 99999-8888",
                "status": "invalid",
            }
        )
        self.assertEqual(participant["fullName"], "João da Silva")
        self.assertEqual(participant["email"], "joao@exemplo.com")
        self.assertEqual(participant["cpf"], "12345678900")
        self.assertEqual(participant["phone"], "11999998888")
        self.assertEqual(participant["status"], "pending")

    def test_invalid_email_is_rejected(self):
        with self.assertRaises(ValueError):
            clean_participant({"fullName": "João", "email": "email-invalido"})

    def test_routes_require_company_session(self):
        app = Flask(__name__)

        def reject_session(_expected_type):
            return None, (jsonify({"message": "Acesso não autorizado."}), 403)

        def should_not_open_database():
            raise AssertionError("O banco não deve abrir sem autenticação")

        app.register_blueprint(create_participants_blueprint(should_not_open_database, reject_session))
        client = app.test_client()
        self.assertEqual(client.get("/api/company/participants").status_code, 403)
        self.assertEqual(client.post("/api/company/participants", json={}).status_code, 403)
        self.assertEqual(client.post("/api/company/participants/bulk", json={}).status_code, 403)
        self.assertEqual(client.post("/api/company/participants/import", json={}).status_code, 403)

    def test_dashboard_contract_and_registered_routes(self):
        html = Path("front-end/Participante.html").read_text(encoding="utf-8")
        parser = IdCollector()
        parser.feed(html)
        duplicates = {item for item in parser.ids if parser.ids.count(item) > 1}
        self.assertEqual(duplicates, set())
        self.assertIn("./css/styleTelaParticipante.css", html)
        self.assertIn("./js/participants-dashboard.js", html)
        routes = {rule.rule for rule in server.app.url_map.iter_rules()}
        self.assertIn("/api/company/participants", routes)
        self.assertIn("/api/company/participants/bulk", routes)
        self.assertIn("/api/company/participants/import", routes)
        response = server.app.test_client().get("/api/company/participants")
        self.assertEqual(response.status_code, 401)
        response.close()


if __name__ == "__main__":
    unittest.main()
