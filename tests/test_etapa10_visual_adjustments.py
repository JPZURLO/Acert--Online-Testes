import unittest
import os

from exam_documents import check_pending_mandatory_documents


class Etapa10VisualAdjustmentsTests(unittest.TestCase):

    def setUp(self):
        self.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    def test_participante_html_uses_instituicao_label(self):
        path = os.path.join(self.base_dir, "front-end", "Participante.html")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Visual label MUST be Instituição instead of Filial in header and filters
        self.assertIn("<th>Instituição</th>", content)
        self.assertIn('aria-label="Filtrar por instituição"', content)
        self.assertIn("Todas as instituições", content)
        self.assertIn("Instituição:", content)

        # Exame vinculado MUST be a separate column
        self.assertIn("<th>Exame vinculado</th>", content)

    def test_participants_dashboard_js_uses_instituicao_fallback(self):
        path = os.path.join(self.base_dir, "front-end", "js", "participants-dashboard.js")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Visual fallback uses 'Sem instituição' and 'Todas as instituições'
        self.assertIn("Sem instituição", content)
        self.assertIn("Todas as instituições", content)

        # Internal property unitName MUST be preserved
        self.assertIn("p.unitName", content)
        self.assertIn("participant.unitName", content)

    def test_login_cliente_description_placeholder(self):
        path = os.path.join(self.base_dir, "front-end", "login_cliente.html")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        expected_placeholder = (
            'placeholder="Descreva aqui as orientações e informações '
            'que o candidato deverá ler antes de iniciar o exame."'
        )
        self.assertIn(expected_placeholder, content)

    def test_exam_documents_functionality_intact(self):
        # Confirm that check_pending_mandatory_documents module is intact and callable
        self.assertTrue(callable(check_pending_mandatory_documents))


if __name__ == "__main__":
    unittest.main()
