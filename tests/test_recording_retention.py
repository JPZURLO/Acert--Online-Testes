import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from recording_retention import available_message, purge_expired_recordings, recording_url, reminder_message, start_recording_maintenance


class FakeConnection:
    def __init__(self):
        self.commits = 0

    def commit(self):
        self.commits += 1


class PurgeCursor:
    def __init__(self, row):
        self.row = row
        self.queries = []

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchall(self):
        return [self.row]


class RecordingRetentionTests(unittest.TestCase):
    def sample(self, attempt_id=33):
        return {
            "recording_id": 8,
            "attempt_id": attempt_id,
            "participant_name": "Participante Teste",
            "exam_title": "Teste de Segurança",
            "company_name": "Empresa ACERT",
            "available_until": datetime(2026, 7, 25, 14, 0),
        }

    def test_messages_use_authenticated_links_instead_of_attachments(self):
        with patch.dict(os.environ, {"PUBLIC_BASE_URL": "https://testes.exemplo.com"}):
            subject, text, body = available_message(self.sample())
            self.assertIn("Gravação disponível", subject)
            self.assertIn("/api/company/attempts/33/recording?download=1", text)
            self.assertIn("não está anexado", text)
            self.assertIn("Baixar gravação", body)
            _, reminder_text, _ = reminder_message("Empresa ACERT", [self.sample()])
            self.assertIn("mais 48 horas", reminder_text)

    def test_background_worker_is_disabled_until_smtp_is_configured(self):
        with patch.dict(os.environ, {"RECORDING_MAINTENANCE_ENABLED": "false"}):
            self.assertIsNone(start_recording_maintenance(lambda: None))

    def test_purge_removes_private_file_and_preserves_audit_record(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            recording_folder = root / "33"
            recording_folder.mkdir()
            video = recording_folder / "auditoria.webm"
            video.write_bytes(b"evidencia")
            row = {
                "id": 8,
                "attempt_id": 33,
                "storage_name": "33/auditoria.webm",
                "downloaded_at": datetime.now(),
            }
            cursor = PurgeCursor(row)
            connection = FakeConnection()
            with patch.dict(os.environ, {"PRIVATE_RECORDING_DIR": folder}):
                self.assertEqual(purge_expired_recordings(connection, cursor), 1)
            self.assertFalse(video.exists())
            self.assertEqual(connection.commits, 1)
            statements = " ".join(query for query, _ in cursor.queries)
            self.assertIn("status='deleted'", statements)
            self.assertIn("recording_status='deleted'", statements)

    def test_migration_and_interfaces_contain_retention_contract(self):
        migration = Path("migrations/010_recording_retention.sql").read_text(encoding="utf-8")
        for field in (
            "recording_retention_days",
            "recording_contact_email",
            "available_until",
            "downloaded_at",
            "reminder_sent_at",
            "deleted_at",
        ):
            self.assertIn(field, migration)
        admin = Path("front-end/Admin.html").read_text(encoding="utf-8")
        self.assertIn('id="plan-recording-retention"', admin)
        self.assertIn('id="license-recording-email"', admin)
        results = Path("front-end/Resultados.html").read_text(encoding="utf-8")
        self.assertIn('id="audit-recording-download"', results)
        source = Path("participant_api.py").read_text(encoding="utf-8")
        self.assertIn("downloaded_at=COALESCE(downloaded_at,NOW())", source)


if __name__ == "__main__":
    unittest.main()