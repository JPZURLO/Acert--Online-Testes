import io
import json
import unittest

from company_api import clean_question, clean_exam
from participant_api import score_answers
from gift_import import parse_gift_questions
from exam_documents import is_allowed_file


class ExamExpansionFeaturesTests(unittest.TestCase):

    def test_binary_choice_creation_and_scoring(self):
        raw_question = {
            "id": "q-bin",
            "type": "binary_choice",
            "prompt": "O servidor está em conformidade com as regras?",
            "points": 10,
            "option1Text": "Conforme",
            "option2Text": "Não conforme",
            "correctOption": "Conforme",
        }
        cleaned = clean_question(raw_question, 0)
        self.assertEqual(cleaned["type"], "binary_choice")
        self.assertEqual(cleaned["options"], ["Conforme", "Não conforme"])

        # Correção com seleção correta
        answers, points, _, _, _, _ = score_answers([cleaned], {"q-bin": "Conforme"})
        self.assertEqual(points, 10)
        self.assertTrue(answers[0]["isCorrect"])

        # Correção com seleção incorreta
        answers, points, _, _, _, _ = score_answers([cleaned], {"q-bin": "Não conforme"})
        self.assertEqual(points, 0)
        self.assertFalse(answers[0]["isCorrect"])

    def test_fill_blank_creation_and_scoring(self):
        raw_question = {
            "id": "q-blank",
            "type": "fill_blank",
            "prompt": "A linguagem ______ foi criada por ______.",
            "points": 20,
            "blanks": [
                {
                    "id": "blank-1",
                    "acceptedAnswers": ["Python", "python"],
                    "caseSensitive": False,
                    "accentInsensitive": True,
                },
                {
                    "id": "blank-2",
                    "acceptedAnswers": ["Guido van Rossum", "Guido"],
                    "caseSensitive": False,
                    "accentInsensitive": True,
                },
            ],
        }
        cleaned = clean_question(raw_question, 0)
        self.assertEqual(cleaned["type"], "fill_blank")
        self.assertEqual(len(cleaned["blanks"]), 2)

        # Correção com ambas as lacunas corretas
        user_input = json.dumps({"blank-1": "   pYtHoN ", "blank-2": "guido"})
        answers, points, _, _, _, _ = score_answers([cleaned], {"q-blank": user_input})
        self.assertEqual(points, 20)
        self.assertTrue(answers[0]["isCorrect"])

        # Correção com uma lacuna errada
        user_input_err = json.dumps({"blank-1": "Python", "blank-2": "Outro"})
        answers, points, _, _, _, _ = score_answers([cleaned], {"q-blank": user_input_err})
        self.assertEqual(points, 0)
        self.assertFalse(answers[0]["isCorrect"])

    def test_multiple_choice_selection_limits(self):
        question = {
            "id": "q-limit",
            "type": "multiple_choice",
            "prompt": "Selecione exatamente 2 linguagens de backend:",
            "points": 15,
            "correctAnswers": ["Python", "Java"],
            "exactSelections": 2,
        }

        # Exatamente 2 corretas -> OK
        answers, points, _, _, _, _ = score_answers(
            [question],
            {"q-limit": json.dumps(["Python", "Java"])}
        )
        self.assertEqual(points, 15)
        self.assertTrue(answers[0]["isCorrect"])

        # Selecionou 3 (violou exactSelections = 2) -> 0 pontos
        answers, points, _, _, _, _ = score_answers(
            [question],
            {"q-limit": json.dumps(["Python", "Java", "C++"])}
        )
        self.assertEqual(points, 0)
        self.assertFalse(answers[0]["isCorrect"])

    def test_gift_moodle_format_parser(self):
        gift_content = """
// Comentário do banco GIFT
$CATEGORY: Arquitetura/Backend

::Questão 1::
Qual é a capital do Brasil? {
=Brasília
~São Paulo
~Rio de Janeiro
}

::Questão 2::
A Terra gira ao redor do Sol. {TRUE}

::Questão 3::
Informe o valor aproximado de pi. {
#3.14
}

::Questão 4::
Associe os países às capitais. {
=Brasil -> Brasília
=França -> Paris
}

::Questão 5::
Explique o conceito de REST. {}
"""
        stream = io.BytesIO(gift_content.encode("utf-8"))
        res = parse_gift_questions(stream, return_dict=True)

        questions = res["questions"]
        self.assertEqual(len(questions), 5)
        self.assertGreaterEqual(res["confidenceScore"], 80)

        # Q1: single_choice
        self.assertEqual(questions[0]["type"], "single_choice")
        self.assertEqual(questions[0]["category"], "Arquitetura/Backend")
        self.assertEqual(questions[0]["correctAnswer"], "Brasília")

        # Q2: true_false
        self.assertEqual(questions[1]["type"], "true_false")
        self.assertEqual(questions[1]["correctAnswer"], "Verdadeiro")

        # Q3: numeric_answer
        self.assertEqual(questions[2]["type"], "numeric_answer")
        self.assertEqual(questions[2]["correctAnswer"], "3.14")

        # Q4: matching
        self.assertEqual(questions[3]["type"], "matching")
        self.assertIn("Brasil", questions[3]["correctAnswer"])

        # Q5: long_answer
        self.assertEqual(questions[4]["type"], "long_answer")

    def test_document_security_and_file_extensions(self):
        self.assertTrue(is_allowed_file("regras.pdf", "application/pdf"))
        self.assertTrue(is_allowed_file("termo.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
        self.assertTrue(is_allowed_file("instrucoes.txt", "text/plain"))
        self.assertTrue(is_allowed_file("material_apoio.zip", "application/zip"))
        self.assertFalse(is_allowed_file("script.exe", "application/octet-stream"))
        self.assertFalse(is_allowed_file("malicious.php", "text/plain"))

    def test_document_types_and_pending_gating(self):
        from exam_documents import ALLOWED_DOC_TYPES, check_pending_mandatory_documents

        # Valida que todos os tipos de documentos solicitados estão suportados
        expected_types = {"rules", "general_instructions", "terms", "support_material", "other"}
        self.assertEqual(ALLOWED_DOC_TYPES, expected_types)

        # Mock de conexão para testar check_pending_mandatory_documents
        class MockCursor:
            def execute(self, query, params):
                pass
            def fetchall(self):
                return [
                    {
                        "id": 1,
                        "title": "Regras do Exame",
                        "doc_type": "rules",
                        "acceptance_status": None,
                        "require_acceptance": True,
                        "require_read": False,
                        "require_return_signed": False,
                    }
                ]
            def close(self):
                pass

        class MockConn:
            def cursor(self, dictionary=False):
                return MockCursor()

        has_pending, pending_docs = check_pending_mandatory_documents(MockConn(), exam_id=10, participant_id=5)
        self.assertTrue(has_pending)
        self.assertEqual(len(pending_docs), 1)
        self.assertEqual(pending_docs[0]["title"], "Regras do Exame")
        self.assertEqual(pending_docs[0]["docType"], "rules")


if __name__ == "__main__":
    unittest.main()
