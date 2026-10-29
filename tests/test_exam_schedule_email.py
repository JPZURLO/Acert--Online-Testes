import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock

from exam_email_service import (
    format_exam_schedule,
    build_exam_access_email,
    exam_login_url,
    send_exam_access_email,
)
from cron_send_exam_emails import fetch_pending_emails, process_pending_emails


class ExamScheduleEmailTests(unittest.TestCase):

    def test_format_exam_schedule_with_participant_times(self):
        participant = {
            "scheduledStartsAt": datetime(2026, 9, 18, 17, 0, tzinfo=timezone.utc),  # 14:00 UTC-3
            "scheduledEndsAt": datetime(2026, 9, 18, 19, 0, tzinfo=timezone.utc),    # 16:00 UTC-3
        }
        schedule = format_exam_schedule(participant=participant)
        self.assertIsNotNone(schedule)
        self.assertEqual(schedule["date_full"], "18 de setembro de 2026")
        self.assertEqual(schedule["start_time"], "14:00")
        self.assertEqual(schedule["end_time"], "16:00")
        self.assertEqual(schedule["entry_time"], "14:00")

    def test_format_exam_schedule_fallback_to_exam_duration(self):
        exam = {
            "availableFrom": datetime(2026, 9, 18, 17, 0, tzinfo=timezone.utc),  # 14:00 UTC-3
            "durationMinutes": 90,
        }
        schedule = format_exam_schedule(exam=exam)
        self.assertIsNotNone(schedule)
        self.assertEqual(schedule["date_full"], "18 de setembro de 2026")
        self.assertEqual(schedule["start_time"], "14:00")
        self.assertEqual(schedule["end_time"], "15:30")
        self.assertEqual(schedule["entry_time"], "14:00")

    def test_build_exam_access_email_scenario_a_temporary_password(self):
        company_name = "ACerT Certificações"
        participant = {
            "fullName": "João Silva",
            "email": "joao.silva@exemplo.com",
            "scheduledStartsAt": datetime(2026, 9, 18, 17, 0, tzinfo=timezone.utc),
            "scheduledEndsAt": datetime(2026, 9, 18, 19, 0, tzinfo=timezone.utc),
        }
        password = "SenhaSegura123!"
        login_url = "https://app.acert.org.br/login.html"
        exam = {
            "id": 42,
            "title": "Certificação Técnica 2026",
        }

        subject, text_body, html_body = build_exam_access_email(
            company_name, participant, password, login_url, exam
        )

        self.assertIn("Certificação Técnica 2026", subject)
        self.assertIn("Olá, João Silva!", text_body)
        self.assertIn("Login: joao.silva@exemplo.com", text_body)
        self.assertIn("Senha temporária: SenhaSegura123!", text_body)
        self.assertIn("No dia do exame, no horário agendado (às 14:00), acesse a plataforma", text_body)
        self.assertIn("https://app.acert.org.br/login.html?examId=42", text_body)

        # HTML checks
        self.assertIn("<strong>Login:</strong> joao.silva@exemplo.com", html_body)
        self.assertIn("<strong>Senha temporária:</strong> SenhaSegura123!", html_body)

    def test_build_exam_access_email_scenario_b_password_none(self):
        company_name = "ACerT Certificações"
        participant = {
            "fullName": "Maria Santos",
            "email": "maria.santos@exemplo.com",
            "scheduledStartsAt": datetime(2026, 9, 18, 17, 0, tzinfo=timezone.utc),
            "scheduledEndsAt": datetime(2026, 9, 18, 19, 0, tzinfo=timezone.utc),
        }
        login_url = "https://app.acert.org.br/login.html"
        exam = {
            "id": 42,
            "title": "Certificação Técnica 2026",
        }

        subject, text_body, html_body = build_exam_access_email(
            company_name, participant, password=None, login_url=login_url, exam=exam
        )

        # Text checks
        self.assertIn("Login: maria.santos@exemplo.com", text_body)
        self.assertNotIn("Senha:", text_body)
        self.assertNotIn("Senha temporária:", text_body)
        self.assertNotIn("[Use a senha cadastrada", text_body)
        self.assertNotIn("redefinição de senha", text_body)
        self.assertIn("Utilize a senha cadastrada na plataforma.", text_body)
        self.assertIn("entre em contato com a organização responsável pelo exame", text_body)

        # HTML checks
        self.assertIn("<strong>Login:</strong> maria.santos@exemplo.com", html_body)
        self.assertNotIn("<strong>Senha:", html_body)
        self.assertNotIn("[Use a senha", html_body)
        self.assertNotIn("redefinição de senha", html_body)
        self.assertIn("Utilize a senha cadastrada na plataforma.", html_body)
        self.assertIn("entre em contato com a organização responsável pelo exame", html_body)

    def test_hash_or_placeholder_never_appears_in_email_body(self):
        participant = {"fullName": "Teste", "email": "teste@exemplo.com"}
        fake_hash = "$2b$12$eIXK7c.jZ1Wp/6Yx.2b0e.U8qX7"
        
        # Test with password=None (CENÁRIO B)
        _, text_b, html_b = build_exam_access_email("Company", participant, password=None)
        self.assertNotIn(fake_hash, text_b)
        self.assertNotIn(fake_hash, html_b)
        self.assertNotIn("[Use a senha", text_b)
        self.assertNotIn("[Use a senha", html_b)

    def test_cron_fetch_pending_emails_query_includes_schedule_fields(self):
        cursor = MagicMock()
        fetch_pending_emails(cursor)
        query = cursor.execute.call_args[0][0]
        self.assertIn("p.scheduled_starts_at", query)
        self.assertIn("p.scheduled_ends_at", query)
        self.assertIn("e.available_until", query)
        self.assertIn("e.duration_minutes", query)

    def test_cron_process_pending_emails_passes_schedule_and_none_password(self):
        cursor = MagicMock()
        cursor.fetchall.return_value = [
            {
                "queue_id": 10,
                "exam_id": 99,
                "participant_id": 5,
                "send_option": "scheduled",
                "scheduled_for": datetime.now(timezone.utc),
                "attempt_count": 0,
                "full_name": "Maria Oliveira",
                "participant_email": "maria@exemplo.com",
                "p_id": 5,
                "scheduled_starts_at": datetime(2026, 9, 20, 13, 0, tzinfo=timezone.utc), # 10:00 UTC-3
                "scheduled_ends_at": datetime(2026, 9, 20, 15, 0, tzinfo=timezone.utc),   # 12:00 UTC-3
                "exam_title": "Exame Final",
                "available_from": datetime(2026, 9, 20, 13, 0, tzinfo=timezone.utc),
                "available_until": None,
                "duration_minutes": 120,
                "company_name": "Empresa Teste",
                "company_id": 1,
            }
        ]
        cursor.fetchone.return_value = {"senha": "$2b$12$hashedpassword"}

        connection = MagicMock()
        connection.cursor.return_value = cursor

        # Mock send_exam_access_email inside cron
        with unittest.mock.patch("cron_send_exam_emails.send_exam_access_email") as mock_send:
            mock_send.return_value = (True, None)
            result = process_pending_emails(connection, cursor)

            self.assertEqual(result["sent"], 1)
            self.assertTrue(mock_send.called)
            call_kwargs = mock_send.call_args[1]
            participant_arg = call_kwargs["participant"]
            exam_arg = call_kwargs["exam"]
            password_arg = call_kwargs["password"]

            self.assertEqual(participant_arg["fullName"], "Maria Oliveira")
            self.assertEqual(participant_arg["scheduledStartsAt"], datetime(2026, 9, 20, 13, 0, tzinfo=timezone.utc))
            self.assertEqual(exam_arg["title"], "Exame Final")
            self.assertEqual(exam_arg["durationMinutes"], 120)
            self.assertIsNone(password_arg)


if __name__ == "__main__":
    unittest.main()
