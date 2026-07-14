import unittest

from flask import Flask, jsonify

from company_api import clean_branding, clean_exam, create_company_blueprint


class CompanyWorkspaceValidationTests(unittest.TestCase):
    def test_exam_is_normalized_and_points_are_calculated(self):
        exam = clean_exam(
            {
                "title": "  Avaliação técnica  ",
                "durationMinutes": 9999,
                "passingScore": -4,
                "questions": [
                    {"type": "true_false", "prompt": "Questão 1", "points": 20},
                    {"type": "essay", "prompt": "Questão 2", "points": 30},
                ],
            }
        )
        self.assertEqual(exam["title"], "Avaliação técnica")
        self.assertEqual(exam["durationMinutes"], 1440)
        self.assertEqual(exam["passingScore"], 0)
        self.assertEqual(exam["totalPoints"], 50)
        self.assertEqual(exam["questions"][0]["options"], ["Verdadeiro", "Falso"])

    def test_branding_rejects_unsafe_values(self):
        branding = clean_branding(
            {
                "logoData": "javascript:alert(1)",
                "primaryColor": "red",
                "fontFamily": "Comic Sans",
                "borderRadius": "enorme",
            }
        )
        self.assertEqual(branding["logoData"], "")
        self.assertEqual(branding["primaryColor"], "#2563EB")
        self.assertEqual(branding["fontFamily"], "Inter")
        self.assertEqual(branding["borderRadius"], "medium")

    def test_company_routes_require_company_session(self):
        app = Flask(__name__)

        def reject_session(_expected_type):
            return None, (jsonify({"message": "Acesso não autorizado."}), 403)

        def should_not_open_database():
            raise AssertionError("O banco não deve abrir sem autenticação")

        app.register_blueprint(create_company_blueprint(should_not_open_database, reject_session))
        client = app.test_client()
        self.assertEqual(client.get("/api/company/workspace").status_code, 403)
        self.assertEqual(client.put("/api/company/branding", json={}).status_code, 403)
        self.assertEqual(client.post("/api/company/exams", json={}).status_code, 403)


if __name__ == "__main__":
    unittest.main()
