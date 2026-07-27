import unittest
from pathlib import Path

from secure_app import app as flask_app


class KnowledgeBaseIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parent.parent
        self.js_path = self.root / "front-end" / "js" / "knowledge-base.js"
        self.kb_html_path = self.root / "front-end" / "BaseConhecimento.html"
        self.login_html_path = self.root / "front-end" / "login_cliente.html"

    def test_knowledge_base_js_exists_and_references_images(self):
        self.assertTrue(self.js_path.exists(), "knowledge-base.js deve existir")
        content = self.js_path.read_text(encoding="utf-8")
        self.assertIn("KNOWLEDGE_ARTICLES", content)
        self.assertIn("IMG_BASE_PATH", content)
        self.assertIn("kb-step-figure", content)

    def test_standalone_company_base_conhecimento_page_exists(self):
        self.assertTrue(self.kb_html_path.exists(), "BaseConhecimento.html deve existir")
        content = self.kb_html_path.read_text(encoding="utf-8")
        self.assertIn('id="kb-catalog-view"', content)
        self.assertIn('id="kb-article-view"', content)
        self.assertIn('href="./BaseConhecimento.html"', content)

    def test_sidebar_nav_contains_base_conhecimento_link(self):
        content = self.login_html_path.read_text(encoding="utf-8")
        self.assertIn('BaseConhecimento.html', content)

    def test_public_standalone_route_removed(self):
        client = flask_app.test_client()
        r1 = client.get("/base-de-conhecimento")
        self.assertNotIn("kb-catalog-view", r1.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
