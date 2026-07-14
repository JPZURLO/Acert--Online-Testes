import os
import unittest
from html.parser import HTMLParser
from pathlib import Path


os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")

import server  # noqa: E402


class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []

    def handle_starttag(self, _tag, attrs):
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.append(attributes["id"])


class DashboardContractTests(unittest.TestCase):
    def test_dashboard_has_unique_ids_and_required_assets(self):
        html_path = Path("front-end/login_cliente.html")
        html = html_path.read_text(encoding="utf-8")
        parser = IdCollector()
        parser.feed(html)
        duplicates = {item for item in parser.ids if parser.ids.count(item) > 1}
        self.assertEqual(duplicates, set())
        self.assertIn("./css/styleTelaCliente.css", html)
        self.assertIn("./js/company-dashboard.js", html)
        self.assertTrue(Path("front-end/css/styleTelaCliente.css").is_file())
        self.assertTrue(Path("front-end/js/company-dashboard.js").is_file())

    def test_company_routes_are_registered_and_protected(self):
        routes = {rule.rule for rule in server.app.url_map.iter_rules()}
        self.assertIn("/api/company/workspace", routes)
        self.assertIn("/api/company/branding", routes)
        self.assertIn("/api/company/exams", routes)
        self.assertIn("/api/company/exams/<int:exam_id>", routes)
        client = server.app.test_client()
        self.assertEqual(client.get("/api/company/workspace").status_code, 401)
        response = client.get("/login_cliente.html")
        self.assertEqual(response.status_code, 200)
        response.close()


if __name__ == "__main__":
    unittest.main()
