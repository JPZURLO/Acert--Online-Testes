import unittest
from pathlib import Path

from flask import Flask, jsonify

from company_api import clean_exam
from participant_api import create_participant_blueprint, score_answers


class ApplicationWorkflowTests(unittest.TestCase):
    def test_exam_application_settings_are_normalized(self):
        exam = clean_exam({"title": "Teste seguro", "resultDelivery": "automatic", "availableFrom": "2026-07-20T09:00", "availableUntil": "2026-07-20T11:00", "requireIdentity": True, "requireRecording": True, "allowResume": False})
        self.assertEqual(exam["resultDelivery"], "automatic")
        self.assertEqual(exam["availableFrom"], "2026-07-20 09:00:00")
        self.assertTrue(exam["requireIdentity"])
        self.assertFalse(exam["allowResume"])

    def test_invalid_availability_window_is_rejected(self):
        with self.assertRaises(ValueError):
            clean_exam({"title": "Teste", "availableFrom": "2026-07-20T11:00", "availableUntil": "2026-07-20T09:00"})

    def test_objective_scoring_and_essay_review(self):
        questions = [{"id": "q1", "type": "multiple_choice", "prompt": "Objetiva", "points": 40, "correctAnswer": "A"}, {"id": "q2", "type": "essay", "prompt": "Dissertativa", "points": 60}]
        answers, points, total, percentage, correct, has_essay = score_answers(questions, {"q1": "A", "q2": "Texto"})
        self.assertEqual((points, total, percentage, correct), (40, 100, 40, 1))
        self.assertTrue(has_essay)
        self.assertIsNone(answers[1]["isCorrect"])

    def test_participant_routes_require_user_session(self):
        app = Flask(__name__)
        def reject(_account_type):
            return None, (jsonify({"message": "Não autorizado"}), 403)
        app.register_blueprint(create_participant_blueprint(lambda: None, reject))
        client = app.test_client()
        self.assertEqual(client.get("/api/participant/assignments").status_code, 403)
        self.assertEqual(client.post("/api/participant/exams/1/prepare").status_code, 403)

    def test_internal_pages_and_migration_are_present(self):
        page = Path("front-end/AreaParticipante.html").read_text(encoding="utf-8")
        login_script = Path("front-end/js/script2.js").read_text(encoding="utf-8")
        company_page = Path("front-end/login_cliente.html").read_text(encoding="utf-8")
        migration = Path("migrations/006_exam_application_workflow.sql").read_text(encoding="utf-8")
        self.assertIn("participant-application.js", page)
        self.assertIn("AreaParticipante.html", login_script)
        self.assertIn('id="application-settings"', company_page)
        self.assertIn("CREATE TABLE IF NOT EXISTS exam_attempts", migration)
        self.assertIn("CREATE TABLE IF NOT EXISTS admin_audit_log", migration)


    def test_candidate_event_elements_are_registered(self):
        import re
        script = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        registry = re.search(r"const candidateIds=\[(.*?)\];", script).group(1)
        registered = set(registry.replace("'", "").split(","))
        referenced = set(re.findall(r"candidateElements\['([^']+)'\]", script))
        self.assertEqual(referenced - registered, set())

if __name__ == "__main__":
    unittest.main()
