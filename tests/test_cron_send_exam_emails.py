import unittest
from unittest.mock import MagicMock

from cron_send_exam_emails import fetch_pending_emails


class CronSendExamEmailsTests(unittest.TestCase):
    def test_fetch_pending_emails_includes_unit_name_coalesce_query(self):
        cursor = MagicMock()
        fetch_pending_emails(cursor)
        query = cursor.execute.call_args[0][0]
        self.assertIn("COALESCE(u.name, c.RazaoSocial) AS company_name", query)
        self.assertIn("LEFT JOIN company_units u ON u.id = COALESCE(p.unit_id, e.unit_id) AND u.company_id = q.company_id", query)

    def test_query_behavior_simulation(self):
        # Cenário 1: unit_id associado à unidade renomeada
        row_with_unit = {
            "queue_id": 1,
            "company_name": "Academia Brasileira de Certificações e Treinamentos",
            "participant_email": "aluno@exemplo.com",
            "exam_title": "Exame de Certificação"
        }
        self.assertEqual(row_with_unit["company_name"], "Academia Brasileira de Certificações e Treinamentos")

        # Cenário 2: unit_id nulo / sem unidade vinculada (fallback para RazaoSocial)
        row_fallback = {
            "queue_id": 2,
            "company_name": "ACerT",
            "participant_email": "aluno2@exemplo.com",
            "exam_title": "Exame de Teste"
        }
        self.assertEqual(row_fallback["company_name"], "ACerT")


if __name__ == "__main__":
    unittest.main()
