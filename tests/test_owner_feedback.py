import unittest
from pathlib import Path


class OwnerFeedbackTests(unittest.TestCase):
    public_pages = ("index.html", "QuemSomos.html", "solucoes.html", "NossosPlanos.html")

    def test_public_palette_uses_petrol_blue_and_dark_gray(self):
        css = Path("front-end/css/public-owner-feedback.css").read_text(encoding="utf-8")
        self.assertIn("#0f6f73", css)
        self.assertIn("#46515b", css)
        self.assertIn(".legacy-banner", css)

    def test_new_banners_are_mapped_to_public_pages(self):
        javascript = Path("front-end/js/public-navigation.js").read_text(encoding="utf-8")
        self.assertIn("'index.html': { src: './assets/images/public-banners/home-1920x450.png'", javascript)
        self.assertIn("'quemsomos.html': { src: './assets/images/public-banners/quem-somos-1920x450.png'", javascript)
        self.assertIn("'solucoes.html': { src: './assets/images/public-banners/solucoes-1920x450.png'", javascript)
        self.assertIn("'nossosplanos.html': { src: './assets/images/public-banners/planos-1920x450.jpg'", javascript)
        self.assertIn("image.width = 1920", javascript)
        self.assertIn("image.height = 450", javascript)
        self.assertIn("insertAdjacentElement('afterend', banner)", javascript)

    def test_owner_requested_public_content_is_present(self):
        home = Path("front-end/index.html").read_text(encoding="utf-8")
        about = Path("front-end/QuemSomos.html").read_text(encoding="utf-8")
        solutions = Path("front-end/solucoes.html").read_text(encoding="utf-8")
        faq = Path("front-end/FAQ.html").read_text(encoding="utf-8")
        self.assertIn("Centro de Testes", home)
        self.assertIn("Fale com um especialista", home)
        self.assertIn("parte do Grupo ACerT", about)
        self.assertIn("Exames de Certificação", solutions)
        self.assertIn("Perguntas frequentes", faq)

    def test_current_public_pages_have_no_social_media_links(self):
        for name in (*self.public_pages, "contato-prototipo.html", "FAQ.html", "PoliticaDePrivacidade.html"):
            content = Path("front-end", name).read_text(encoding="utf-8").lower()
            self.assertNotIn("instagram.com", content, name)
            self.assertNotIn("linkedin.com", content, name)


if __name__ == "__main__":
    unittest.main()
