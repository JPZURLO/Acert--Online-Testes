import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONT_END = ROOT / "front-end"


class InternalInternationalizationTests(unittest.TestCase):
    pages = (
        "Admin.html",
        "AreaParticipante.html",
        "Monitoramento.html",
        "Participante.html",
        "Resultados.html",
        "SuporteEmpresa.html",
        "VisaoGeral.html",
        "EsqueciSenha.html",
        "login_cliente.html",
    )

    def test_all_internal_pages_load_shared_language_assets(self):
        for page in self.pages:
            with self.subTest(page=page):
                html = (FRONT_END / page).read_text(encoding="utf-8")
                self.assertIn("./css/public-i18n.css?v=1", html)
                self.assertIn("./js/internal-i18n.js?v=1", html)
                self.assertIn("./js/public-i18n.js?v=1", html)
                self.assertLess(html.index("internal-i18n.js"), html.index("public-i18n.js"))

    def test_selector_is_inserted_into_internal_headers(self):
        javascript = (FRONT_END / "js" / "public-i18n.js").read_text(encoding="utf-8")
        self.assertIn('.admin-topbar, .topbar, .candidate-account', javascript)
        self.assertIn("ot-language-internal", javascript)

    def test_internal_dictionary_covers_each_workspace(self):
        javascript = (FRONT_END / "js" / "internal-i18n.js").read_text(encoding="utf-8")
        expected = (
            '"Clientes e licenças": "Clients and licenses"',
            '"Criar novo teste": "Create new test"',
            '"Gerencie convites, acessos e progresso em um só lugar.":',
            '"Resultados e auditoria": "Results and audit"',
            '"Monitoramento em tempo real": "Real-time monitoring"',
            '"Como podemos ajudar?": "How can we help?"',
            '"MEUS TESTES": "MY TESTS"',
        )
        for translation in expected:
            self.assertIn(translation, javascript)

    def test_dynamic_counts_are_translated(self):
        javascript = (FRONT_END / "js" / "public-i18n.js").read_text(encoding="utf-8")
        self.assertIn("translateDynamicText", javascript)
        self.assertIn("$1 participant(s)", javascript)
        self.assertIn("$1 result(s)", javascript)


if __name__ == "__main__":
    unittest.main()
