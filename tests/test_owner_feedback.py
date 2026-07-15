import unittest
from pathlib import Path


class OwnerFeedbackTests(unittest.TestCase):
    public_pages = ("index.html", "QuemSomos.html", "solucoes.html", "NossosPlanos.html")

    def test_public_palette_uses_petrol_blue_and_dark_gray(self):
        css = Path("front-end/css/public-owner-feedback.css").read_text(encoding="utf-8")
        self.assertIn("#0f6f73", css)
        self.assertIn("#46515b", css)
        self.assertIn(".legacy-banner", css)

    def test_original_banners_are_mapped_to_public_pages(self):
        javascript = Path("front-end/js/public-navigation.js").read_text(encoding="utf-8")
        self.assertIn("'index.html': { src: './assets/images/banner.png'", javascript)
        self.assertIn("'quemsomos.html': { src: './assets/images/banner.png'", javascript)
        self.assertIn("'solucoes.html': { src: './assets/images/foto 1.jpg'", javascript)
        self.assertIn("'nossosplanos.html': { src: './assets/images/foto 3.jpg'", javascript)
        self.assertIn("insertAdjacentElement('afterend', banner)", javascript)

    def test_visible_frontend_copy_uses_teste_instead_of_exame(self):
        for path in Path("front-end").rglob("*"):
            if not path.is_file() or path.suffix.lower() not in {".html", ".js"}:
                continue
            if "node_modules" in path.parts:
                continue
            content = path.read_text(encoding="utf-8")
            self.assertNotRegex(content, r"(?i)\bexames?\b", str(path))


if __name__ == "__main__":
    unittest.main()
