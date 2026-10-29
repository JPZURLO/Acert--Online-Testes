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
        self.assertEqual(client.put("/api/company/participants/1", json={}).status_code, 403)
        self.assertEqual(client.delete("/api/company/participants/1").status_code, 403)
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
        self.assertIn('data-row-action="edit"', html)
        self.assertIn('data-row-action="delete"', html)
        self.assertIn('data-bulk="delete"', html)
        routes = {rule.rule for rule in server.app.url_map.iter_rules()}
        self.assertIn("/api/company/participants", routes)
        self.assertIn("/api/company/participants/<int:participant_id>", routes)
        self.assertIn("/api/company/participants/bulk", routes)
        self.assertIn("/api/company/participants/import", routes)
        response = server.app.test_client().get("/api/company/participants")
        self.assertEqual(response.status_code, 401)
        response.close()

    def test_participant_from_row_includes_unit_name(self):
        from participants_api import participant_from_row
        row_with_unit = {
            "id": 1,
            "full_name": "Maria Silva",
            "email": "maria@exemplo.com",
            "cpf": "12345678901",
            "phone": "11988887777",
            "city": "São Paulo",
            "status": "pending",
            "exam_id": 10,
            "exam_title": "Exame de Certificação",
            "unit_name": "Academia Brasileira de Certificações e Treinamentos",
            "scheduled_starts_at": None,
            "scheduled_ends_at": None,
            "progress": 50,
            "last_access": None,
            "invite_sent_at": None,
            "invite_failed_at": None,
            "invite_error": None,
            "created_at": None,
        }
        res = participant_from_row(row_with_unit)
        self.assertEqual(res["unitName"], "Academia Brasileira de Certificações e Treinamentos")
        self.assertEqual(res["city"], "São Paulo")
        self.assertEqual(res["examTitle"], "Exame de Certificação")

        row_without_unit = {**row_with_unit, "unit_name": None}
        res_no_unit = participant_from_row(row_without_unit)
        self.assertIsNone(res_no_unit["unitName"])

    def test_participante_html_has_10_columns_and_new_filters(self):
        html = Path("front-end/Participante.html").read_text(encoding="utf-8")
        self.assertIn("<th>Participante</th>", html)
        self.assertIn("<th>E-mail</th>", html)
        self.assertIn("<th>Telefone</th>", html)
        self.assertIn("<th>Cidade / UF</th>", html)
        self.assertIn("<th>Instituição</th>", html)
        self.assertIn("<th>Exame vinculado</th>", html)
        self.assertIn("<th>Progresso</th>", html)
        self.assertIn("<th>Situação</th>", html)
        self.assertIn('<th class="actions-cell">Ações</th>', html)

        self.assertNotIn("<th>Status</th>", html)
        self.assertNotIn("<th>Último acesso</th>", html)
        self.assertNotIn('data-row-action="resend_invite"', html)
        self.assertNotIn('data-bulk="resend"', html)

        self.assertIn('id="unit-filter"', html)
        self.assertIn('id="situation-filter"', html)
        self.assertIn('id="assign-exam-modal-backdrop"', html)
        self.assertIn('id="assign-exam-form"', html)
        self.assertIn('data-bulk="assign_exam"', html)

    def test_manual_password_validation(self):
        # 1. Mismatch
        with self.assertRaises(ValueError) as ctx:
            clean_participant({
                "fullName": "Maria Silva",
                "email": "maria@exemplo.com",
                "accessPassword": "senhaValida123",
                "confirmPassword": "outraSenha123",
            })
        self.assertIn("senhas não coincidem", str(ctx.exception))

        # 2. Too short (< 8 chars)
        with self.assertRaises(ValueError) as ctx:
            clean_participant({
                "fullName": "Maria Silva",
                "email": "maria@exemplo.com",
                "accessPassword": "123",
                "confirmPassword": "123",
            })
        self.assertIn("pelo menos 8 caracteres", str(ctx.exception))

        # 3. Required on creation if require_password=True
        with self.assertRaises(ValueError) as ctx:
            clean_participant({
                "fullName": "Maria Silva",
                "email": "maria@exemplo.com",
            }, require_password=True)
        self.assertIn("senha de acesso", str(ctx.exception))

        # 4. Valid manual password matching
        data = clean_participant({
            "fullName": "Maria Silva",
            "email": "maria@exemplo.com",
            "accessPassword": "senhaSegura123",
            "confirmPassword": "senhaSegura123",
        }, require_password=True)
        self.assertEqual(data["accessPassword"], "senhaSegura123")


if __name__ == "__main__":
    unittest.main()

