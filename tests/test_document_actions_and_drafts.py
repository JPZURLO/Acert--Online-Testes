import unittest
import json
from company_api import clean_exam
from exam_documents import (
    ALLOWED_DOC_TYPES,
    ALLOWED_PARTICIPANT_ACTIONS,
    ALLOWED_DEADLINE_TYPES,
    is_allowed_file,
    _serialize_document,
)


class DocumentActionsAndDraftsTests(unittest.TestCase):

    def test_draft_allows_titleless_and_incomplete_exam(self):
        # Exame totalmente vazio salvo como rascunho
        exam = clean_exam({"status": "draft"})
        self.assertEqual(exam["title"], "Rascunho sem título")
        self.assertEqual(exam["status"], "draft")
        self.assertEqual(exam["questions"], [])
        self.assertIsNone(exam["availableFrom"])

    def test_published_exam_requires_title(self):
        # Exame publicado sem título deve lançar erro
        with self.assertRaises(ValueError) as ctx:
            clean_exam({"status": "published", "title": ""})
        self.assertIn("título", str(ctx.exception).lower())

    def test_allowed_document_types_and_actions(self):
        self.assertIn("rules", ALLOWED_DOC_TYPES)
        self.assertIn("terms", ALLOWED_DOC_TYPES)
        self.assertIn("accept_electronic", ALLOWED_PARTICIPANT_ACTIONS)
        self.assertIn("download_sign_return", ALLOWED_PARTICIPANT_ACTIONS)
        self.assertIn("confirm_read", ALLOWED_PARTICIPANT_ACTIONS)

    def test_allowed_file_types(self):
        self.assertTrue(is_allowed_file("termo.pdf", "application/pdf"))
        self.assertTrue(is_allowed_file("imagem.png", "image/png"))
        self.assertFalse(is_allowed_file("script.exe", "application/x-msdownload"))
        self.assertFalse(is_allowed_file("virus.sh", "text/x-shellscript"))

    def test_serialize_document_structure(self):
        row = {
            "id": 10,
            "title": "Termo de Consentimento",
            "description": "Leia e aceite",
            "doc_type": "terms",
            "original_name": "termo.pdf",
            "content_type": "application/pdf",
            "size_bytes": 10240,
            "download_allowed": True,
            "require_read": False,
            "require_acceptance": True,
            "require_return_signed": False,
            "return_deadline": None,
            "system_send_allowed": False,
            "active": True,
            "display_order": 1,
            "term_config_json": json.dumps({"mode": "checkbox"}),
            "participant_action": "accept_electronic",
            "mandatory": True,
            "blocks_exam_start": True,
            "requires_upload_approval": False,
            "deadline_type": "before_exam",
            "deadline_at": None,
        }
        serialized = _serialize_document(row)
        self.assertEqual(serialized["id"], 10)
        self.assertEqual(serialized["participantAction"], "accept_electronic")
        self.assertTrue(serialized["mandatory"])
        self.assertTrue(serialized["blocksExamStart"])
        self.assertFalse(serialized["requiresUploadApproval"])


if __name__ == "__main__":
    unittest.main()
