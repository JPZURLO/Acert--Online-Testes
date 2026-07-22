import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONT_END = ROOT / "front-end"


class PublicInternationalizationTests(unittest.TestCase):
    pages = (
        "index.html",
        "QuemSomos.html",
        "solucoes.html",
        "NossosPlanos.html",
        "contato-prototipo.html",
        "FAQ.html",
        "PoliticaDePrivacidade.html",
        "SolicitarAcesso.html",
        "login.html",
        "login_empresa.html",
        "login_admin.html",
    )

    def test_every_public_and_login_page_loads_i18n_assets(self):
        for page in self.pages:
            with self.subTest(page=page):
                html = (FRONT_END / page).read_text(encoding="utf-8")
                self.assertIn("./css/public-i18n.css?v=1", html)
                self.assertIn("./js/public-i18n.js?v=1", html)

    def test_language_choice_is_persisted_and_reapplied(self):
        javascript = (FRONT_END / "js" / "public-i18n.js").read_text(encoding="utf-8")
        self.assertIn('const STORAGE_KEY = "onlineTesteLanguage"', javascript)
        self.assertIn("localStorage.setItem(STORAGE_KEY, language)", javascript)
        self.assertIn("document.documentElement.lang = language", javascript)
        self.assertIn("window.location.reload()", javascript)

    def test_selector_supports_navigation_and_standalone_pages(self):
        javascript = (FRONT_END / "js" / "public-i18n.js").read_text(encoding="utf-8")
        self.assertIn('.public-navigation > .public-nav-list', javascript)
        self.assertIn("ot-language-floating", javascript)
        self.assertIn('data-language="pt-BR"', javascript)
        self.assertIn('data-language="en"', javascript)

    def test_mobile_navigation_has_room_for_language_selector(self):
        css = (FRONT_END / "css" / "public-i18n.css").read_text(encoding="utf-8")
        self.assertIn("grid-template-columns: repeat(6, minmax(0, 1fr))", css)

    def test_key_public_and_legal_content_has_english_translation(self):
        javascript = (FRONT_END / "js" / "public-i18n.js").read_text(encoding="utf-8")
        expected = (
            '"Sobre Nós": "About Us"',
            '"Solicitar proposta": "Request a proposal"',
            '"Política de Privacidade": "Privacy Policy"',
            '"LOGIN PARTICIPANTE": "PARTICIPANT LOGIN"',
            '"LOGIN INSTITUIÇÃO": "COMPANY LOGIN"',
        )
        for translation in expected:
            self.assertIn(translation, javascript)


if __name__ == "__main__":
    unittest.main()
