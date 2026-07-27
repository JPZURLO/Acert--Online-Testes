"""
tests/test_knowledge_base_editor.py

Testes automatizados do novo Editor Visual Inline por Blocos da Base de Conhecimento.
Testa rotas de upload seguro de imagens, salvamento de rascunhos, publicação e listagem pública.
"""
import json
import io
import os
import shutil
import tempfile
import unittest

import secure_app
from secure_app import app, issue_token, JWT_COOKIE_NAME, CSRF_COOKIE_NAME


class TestKnowledgeBaseEditor(unittest.TestCase):

    def setUp(self):
        self.original_root_path = app.root_path
        self.tempdir = tempfile.mkdtemp(prefix="kb-editor-test-")
        os.makedirs(os.path.join(self.tempdir, "data"), exist_ok=True)
        os.makedirs(
            os.path.join(self.tempdir, "front-end", "assets", "images", "base-conhecimento"),
            exist_ok=True,
        )
        app.root_path = self.tempdir
        self.app = app.test_client()
        self.app.testing = True
        self.admin_token = issue_token(1, "admin")
        self.csrf_token = "test_csrf_token"
        self.app.set_cookie(JWT_COOKIE_NAME, self.admin_token)
        self.app.set_cookie(CSRF_COOKIE_NAME, self.csrf_token)
        self.headers = {"X-CSRF-Token": self.csrf_token}

    def tearDown(self):
        app.root_path = self.original_root_path
        shutil.rmtree(self.tempdir, ignore_errors=True)

    def test_list_knowledge_base_admin(self):
        res = self.app.get("/api/admin/knowledge-base")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIsInstance(data.get("articles"), list)

    def test_upload_image_validation(self):
        # 1. Envio sem arquivo
        res_empty = self.app.post("/api/admin/knowledge-base/upload-image", headers=self.headers)
        self.assertEqual(res_empty.status_code, 400)

        # 2. Envio de formato não permitido (ex: .exe)
        bad_file = (io.BytesIO(b"malicious content"), "script.exe")
        res_bad = self.app.post(
            "/api/admin/knowledge-base/upload-image",
            data={"file": bad_file, "slug": "test-slug"},
            headers=self.headers,
            content_type="multipart/form-data"
        )
        self.assertEqual(res_bad.status_code, 400)
        self.assertIn("Formato de imagem não suportado", res_bad.get_json().get("message"))

        # 3. Envio de imagem PNG válida
        png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        good_file = (io.BytesIO(png_data), "screen.png")
        res_good = self.app.post(
            "/api/admin/knowledge-base/upload-image",
            data={"file": good_file, "slug": "teste-participante"},
            headers=self.headers,
            content_type="multipart/form-data"
        )
        self.assertEqual(res_good.status_code, 200)
        json_data = res_good.get_json()
        self.assertTrue(json_data.get("success"))
        self.assertIn("./assets/images/base-conhecimento/teste-participante/", json_data.get("url"))

    def test_save_and_publish_article(self):
        payload = {
            "id": "teste-artigo-editor-visual",
            "slug": "teste-artigo-editor-visual",
            "title": "Como Testar o Editor Visual",
            "category": "Participantes",
            "audience": "company",
            "readTime": "2 min de leitura",
            "lead": "Guia de teste automatizado do editor de blocos visual.",
            "status": "draft",
            "steps": [
                {
                    "num": 1,
                    "title": "Passo 1 do Teste",
                    "desc": "Descrição do primeiro passo",
                    "image": "./assets/images/base-conhecimento/teste.png",
                    "caption": "Legenda"
                }
            ],
            "blocks": [
                {
                    "type": "paragraph",
                    "content": "Texto de teste do parágrafo"
                }
            ]
        }

        # Salva como Rascunho
        res_save = self.app.post(
            "/api/admin/knowledge-base",
            data=json.dumps(payload),
            headers=self.headers,
            content_type="application/json"
        )
        self.assertEqual(res_save.status_code, 200)
        data_save = res_save.get_json()
        self.assertTrue(data_save.get("success"))
        self.assertEqual(data_save["article"]["status"], "draft")

        # Atualiza para Publicado
        payload["status"] = "published"
        res_pub = self.app.post(
            "/api/admin/knowledge-base",
            data=json.dumps(payload),
            headers=self.headers,
            content_type="application/json"
        )
        self.assertEqual(res_pub.status_code, 200)
        data_pub = res_pub.get_json()
        self.assertEqual(data_pub["article"]["status"], "published")

        # Limpeza
        del_res = self.app.delete(f"/api/admin/knowledge-base/{payload['id']}", headers=self.headers)
        self.assertEqual(del_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
