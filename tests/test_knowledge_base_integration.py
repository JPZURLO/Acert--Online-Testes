import unittest
from pathlib import Path

from secure_app import app as flask_app


class KnowledgeBaseIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parent.parent
        self.js_path = self.root / "front-end" / "js" / "knowledge-base.js"
        self.html_path = self.root / "front-end" / "login_cliente.html"

    def test_knowledge_base_js_exists_and_valid(self):
        self.assertTrue(self.js_path.exists(), "knowledge-base.js deve existir")
        content = self.js_path.read_text(encoding="utf-8")
        self.assertIn("KNOWLEDGE_ARTICLES", content)

    def test_public_routes_removed_for_knowledge_base(self):
        client = flask_app.test_client()
        r1 = client.get("/base-de-conhecimento")
        self.assertNotIn("kb-catalog-view", r1.get_data(as_text=True))

        r2 = client.get("/base-conhecimento")
        self.assertNotIn("kb-catalog-view", r2.get_data(as_text=True))

    def test_company_dashboard_contains_knowledge_base_modal(self):
        self.assertTrue(self.html_path.exists(), "login_cliente.html deve existir")
        content = self.html_path.read_text(encoding="utf-8")
        self.assertIn('id="kb-company-modal"', content)
        self.assertIn('id="btn-open-help-kb"', content)
        self.assertIn('src="./js/knowledge-base.js?v=2"', content)


if __name__ == "__main__":
    unittest.main()
