import json
import re
import unittest
from pathlib import Path

from flask import Flask
from secure_app import app as flask_app


class KnowledgeBaseIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parent.parent
        self.js_path = self.root / "front-end" / "js" / "knowledge-base.js"
        self.img_dir = self.root / "front-end" / "assets" / "images" / "base-conhecimento"
        self.manifest_path = self.root / "relatorios" / "preview-integracao-imagens.md"

    def test_knowledge_base_js_references_existing_images(self):
        self.assertTrue(self.js_path.exists(), "knowledge-base.js deve existir")
        content = self.js_path.read_text(encoding="utf-8")

        # Extrai os caminhos das imagens
        images = re.findall(r"IMG_BASE_PATH\s*\+\s*['\"]([^'\"]+)['\"]", content)
        self.assertGreater(len(images), 0, "Deve haver imagens referenciadas no JS")

        for img_name in images:
            img_path = self.img_dir / img_name
            self.assertTrue(
                img_path.exists(), f"A imagem referenciada '{img_name}' deve existir em {self.img_dir}"
            )

    def test_public_routes_for_knowledge_base(self):
        client = flask_app.test_client()
        r1 = client.get("/base-de-conhecimento")
        self.assertEqual(r1.status_code, 200, "/base-de-conhecimento deve responder 200 OK")
        self.assertIn("Base de Conhecimento", r1.get_data(as_text=True))

        r2 = client.get("/base-conhecimento")
        self.assertEqual(r2.status_code, 200, "/base-conhecimento deve responder 200 OK")

    def test_preview_report_exists_and_is_valid(self):
        self.assertTrue(self.manifest_path.exists(), "O relatório de preview de imagens deve existir")
        text = self.manifest_path.read_text(encoding="utf-8")
        self.assertIn("Relatório de Auditoria", text)
        self.assertIn("Total de Imagens Copiadas", text)


if __name__ == "__main__":
    unittest.main()
