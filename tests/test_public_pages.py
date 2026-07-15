import unittest
from pathlib import Path


class PublicPagesTests(unittest.TestCase):
    pages = ("index.html", "QuemSomos.html", "solucoes.html", "NossosPlanos.html")

    def test_all_pages_use_the_new_shared_visual_system(self):
        for page in self.pages:
            html = Path("front-end", page).read_text(encoding="utf-8")
            self.assertIn('class="public-page"', html, page)
            self.assertIn("./css/public-site.css?v=1", html, page)
            self.assertEqual(html.count('class="public-footer"'), 1, page)
            self.assertNotIn("tinymce", html.lower(), page)

    def test_each_page_has_its_primary_content(self):
        expected = {
            "index.html": "Avaliações online simples",
            "QuemSomos.html": "Nosso propósito",
            "solucoes.html": "Soluções completas",
            "NossosPlanos.html": "Encontre o plano ideal",
        }
        for page, text in expected.items():
            self.assertIn(text, Path("front-end", page).read_text(encoding="utf-8"))

    def test_plan_page_has_no_published_prices(self):
        html = Path("front-end/NossosPlanos.html").read_text(encoding="utf-8")
        self.assertNotIn("R$", html)
        self.assertNotIn("/mês", html)
        self.assertEqual(html.count("Solicitar proposta"), 2)


if __name__ == "__main__":
    unittest.main()
