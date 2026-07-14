import os
import unittest
from html.parser import HTMLParser
from pathlib import Path

from flask import Flask, jsonify

from overview_api import create_overview_blueprint, percentage_change


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


class OverviewWorkspaceTests(unittest.TestCase):
    def test_percentage_change_handles_growth_decline_and_empty_period(self):
        self.assertEqual(percentage_change(15, 10), 50)
        self.assertEqual(percentage_change(5, 10), -50)
        self.assertEqual(percentage_change(4, 0), 100)
        self.assertEqual(percentage_change(0, 0), 0)

    def test_route_requires_company_session(self):
        app = Flask(__name__)

        def reject_session(_expected_type):
            return None, (jsonify({"message": "Acesso não autorizado."}), 403)

        def should_not_open_database():
            raise AssertionError("O banco não deve abrir sem autenticação")

        app.register_blueprint(create_overview_blueprint(should_not_open_database, reject_session))
        self.assertEqual(app.test_client().get("/api/company/overview").status_code, 403)

    def test_overview_contract_navigation_and_registered_route(self):
        html = Path("front-end/VisaoGeral.html").read_text(encoding="utf-8")
        parser = IdCollector()
        parser.feed(html)
        duplicates = {item for item in parser.ids if parser.ids.count(item) > 1}
        self.assertEqual(duplicates, set())
        self.assertIn("./css/styleVisaoGeral.css", html)
        self.assertIn("./js/overview-dashboard.js", html)
        self.assertIn("/api/company/overview", {rule.rule for rule in server.app.url_map.iter_rules()})
        self.assertEqual(server.app.test_client().get("/api/company/overview").status_code, 401)
        for page in ("login_cliente.html", "Participante.html", "Resultados.html"):
            self.assertIn("./VisaoGeral.html", Path("front-end", page).read_text(encoding="utf-8"))

    def test_company_login_opens_overview(self):
        script = Path("front-end/js/scriptLoginEmpresa.js").read_text(encoding="utf-8")
        self.assertIn("window.location.replace('VisaoGeral.html')", script)


if __name__ == "__main__":
    unittest.main()
