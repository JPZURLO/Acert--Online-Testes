import unittest
from pathlib import Path

from flask import Flask, jsonify

import server
from admin_api import clean_features, create_admin_blueprint, proposal_message, slug
from license_service import ALL_LICENSE_FEATURES, company_license_snapshot, license_block_message


class FakeCursor:
    def __init__(self, row):
        self.row = row

    def execute(self, _query, _params):
        return None

    def fetchone(self):
        return self.row

    def close(self):
        return None


class FakeConnection:
    def __init__(self, row):
        self.row = row

    def cursor(self, dictionary=False):
        return FakeCursor(self.row)


class AdminSystemTests(unittest.TestCase):
    def test_admin_routes_are_registered(self):
        routes = {str(rule) for rule in server.app.url_map.iter_rules()}
        self.assertIn("/login_admin", routes)
        self.assertIn("/api/access-requests", routes)
        self.assertIn("/api/admin/overview", routes)
        self.assertIn("/api/admin/requests", routes)
        self.assertIn("/api/admin/plans", routes)
        self.assertIn("/api/admin/licenses", routes)
        self.assertIn("/api/company/license", routes)

    def test_admin_routes_require_admin_session(self):
        app = Flask(__name__)

        def reject_session(_expected_type):
            return None, (jsonify({"message": "Acesso não autorizado."}), 403)

        def should_not_open_database():
            raise AssertionError("O banco não deve abrir sem sessão Admin")

        app.register_blueprint(create_admin_blueprint(should_not_open_database, reject_session))
        client = app.test_client()
        self.assertEqual(client.get("/api/admin/overview").status_code, 403)
        self.assertEqual(client.get("/api/admin/requests").status_code, 403)
        self.assertEqual(client.get("/api/admin/plans").status_code, 403)
        self.assertEqual(client.get("/api/admin/licenses").status_code, 403)
        self.assertEqual(client.post("/api/admin/requests/1/decision", json={}).status_code, 403)

    def test_public_request_validation_happens_before_database(self):
        app = Flask(__name__)

        def should_not_open_database():
            raise AssertionError("Dados inválidos não devem abrir o banco")

        app.register_blueprint(create_admin_blueprint(should_not_open_database, lambda _kind: ({"sub": "1"}, None)))
        response = app.test_client().post("/api/access-requests", json={"email": "inválido"})
        self.assertEqual(response.status_code, 400)

    def test_legacy_companies_keep_all_features(self):
        snapshot = company_license_snapshot(FakeConnection(None), 7)
        self.assertTrue(snapshot["legacy"])
        self.assertEqual(set(snapshot["features"]), ALL_LICENSE_FEATURES)
        self.assertIsNone(license_block_message(snapshot))

    def test_blocked_license_prevents_access(self):
        row = {
            "company_id": 7,
            "status": "blocked",
            "starts_at": None,
            "ends_at": None,
            "max_exams_override": None,
            "max_participants_override": None,
            "features_override_json": None,
            "notes": "",
            "plan_id": 2,
            "plan_name": "Profissional",
            "max_exams": 50,
            "max_participants_month": 1000,
            "max_admin_users": 5,
            "result_retention_months": 24,
            "features_json": '["exams","participants"]',
        }
        snapshot = company_license_snapshot(FakeConnection(row), 7)
        self.assertEqual(snapshot["features"], ["exams", "participants"])
        self.assertIn("bloqueado", license_block_message(snapshot))

    def test_plan_values_are_normalized(self):
        self.assertEqual(slug("Plano Profissional Ágil"), "plano-profissional-agil")
        self.assertEqual(clean_features(["exams", "invalido", "exams", "results"]), ["exams", "results"])

    def test_proposal_email_contains_commercial_contact_details(self):
        subject, text_body, html_body = proposal_message({
            "contactName": "João da Silva",
            "companyName": "Empresa Exemplo",
            "email": "joao@exemplo.com",
            "phone": "(11) 99999-9999",
            "cnpj": "",
            "planInterest": "Plano Flex",
            "needs": "Aplicações sazonais.",
        })
        self.assertIn("Plano Flex", subject)
        self.assertIn("joao@exemplo.com", text_body)
        self.assertIn("(11) 99999-9999", html_body)

    def test_access_request_page_reports_email_delivery_status(self):
        page = Path("front-end/SolicitarAcesso.html").read_text(encoding="utf-8")
        script = Path("front-end/js/access-request.js").read_text(encoding="utf-8")
        self.assertIn('id="request-success-message"', page)
        self.assertIn("notificationSent", script)

    def test_public_plan_and_privacy_content(self):
        plans = Path("front-end/NossosPlanos.html").read_text(encoding="utf-8")
        privacy = Path("front-end/PoliticaDePrivacidade.html").read_text(encoding="utf-8")
        for plan in ("Essencial", "Pró", "Enterprise", "Plano Flex"):
            self.assertIn(plan, plans)
        self.assertEqual(plans.count("Solicitar proposta"), 4)
        self.assertIn("Política de Cookies do Centro de Testes", privacy)
        self.assertIn("Esta política é efetiva a partir de setembro de 2020", privacy)

    def test_admin_pages_and_public_links_exist(self):
        for path in ("front-end/login_admin.html", "front-end/Admin.html", "front-end/SolicitarAcesso.html"):
            self.assertTrue(Path(path).exists(), path)
        for page in ("index.html", "QuemSomos.html", "solucoes.html", "NossosPlanos.html"):
            content = Path("front-end", page).read_text(encoding="utf-8")
            self.assertIn("login_admin.html", content)
        index = Path("front-end/index.html").read_text(encoding="utf-8")
        self.assertIn("SolicitarAcesso.html", index)

    def test_migration_contains_all_admin_tables(self):
        migration = Path("migrations/005_admin_licenses.sql").read_text(encoding="utf-8")
        for table in ("admin_users", "access_requests", "license_plans", "company_licenses"):
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table}", migration)


if __name__ == "__main__":
    unittest.main()
