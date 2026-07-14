import unittest
from pathlib import Path


class DashboardShellTests(unittest.TestCase):
    def test_all_company_pages_load_shared_shell_after_page_style(self):
        pages = {
            "login_cliente.html": "styleTelaCliente.css",
            "Participante.html": "styleTelaParticipante.css",
            "Resultados.html": "styleResultados.css",
            "VisaoGeral.html": "styleVisaoGeral.css",
        }
        for page, page_style in pages.items():
            html = Path("front-end", page).read_text(encoding="utf-8")
            self.assertIn("./css/dashboard-shell.css", html)
            self.assertLess(html.index(page_style), html.index("dashboard-shell.css"))

    def test_shared_shell_standardizes_header_sidebar_and_mobile_navigation(self):
        css = Path("front-end/css/dashboard-shell.css").read_text(encoding="utf-8")
        self.assertIn("grid-template-columns: 238px minmax(0, 1fr)", css)
        self.assertIn("height: 68px", css)
        self.assertIn("width: 35px", css)
        self.assertIn("body.sidebar-collapsed .app-shell", css)
        self.assertIn("body.menu-open .sidebar", css)
        self.assertIn(".sidebar.open", css)


if __name__ == "__main__":
    unittest.main()
