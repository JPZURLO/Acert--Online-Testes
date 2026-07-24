import json
import unittest

from company_api import clean_exam, clean_question
from participant_api import score_answers, safe_questions


class QuestionTypesRestructuringTests(unittest.TestCase):

    def test_single_choice_creation_and_single_correct_validation(self):
        # Questão single_choice com exatamente 1 resposta correta
        raw_question = {
            "id": "q1",
            "type": "single_choice",
            "prompt": "Qual o planeta mais próximo do Sol?",
            "points": 10,
            "structuredOptions": [
                {"id": "opt-1", "text": "Mercúrio", "isCorrect": True},
                {"id": "opt-2", "text": "Vênus", "isCorrect": False},
                {"id": "opt-3", "text": "Terra", "isCorrect": False},
            ],
        }
        cleaned = clean_question(raw_question, 0)
        self.assertEqual(cleaned["type"], "single_choice")
        self.assertEqual(cleaned["correctAnswers"], ["Mercúrio"])
        self.assertEqual(len(cleaned["structuredOptions"]), 3)

        # Impedir múltiplas respostas corretas em single_choice
        invalid_question = {
            "id": "q2",
            "type": "single_choice",
            "prompt": "Questão inválida",
            "structuredOptions": [
                {"id": "opt-1", "text": "A", "isCorrect": True},
                {"id": "opt-2", "text": "B", "isCorrect": True},
            ],
        }
        with self.assertRaises(ValueError) as ctx:
            clean_question(invalid_question, 1)
        self.assertIn("exatamente uma alternativa correta", str(ctx.exception))

    def test_multiple_choice_with_multiple_correct_options(self):
        # Criar questão múltipla seleção com 3 alternativas corretas e 2 incorretas
        raw_question = {
            "id": "q-multi",
            "type": "multiple_choice",
            "prompt": "Quais são linguagens de programação?",
            "points": 20,
            "structuredOptions": [
                {"id": "opt-1", "text": "Python", "isCorrect": True},
                {"id": "opt-2", "text": "HTML", "isCorrect": False},
                {"id": "opt-3", "text": "JavaScript", "isCorrect": True},
                {"id": "opt-4", "text": "CSS", "isCorrect": False},
                {"id": "opt-5", "text": "C++", "isCorrect": True},
            ],
        }
        cleaned = clean_question(raw_question, 0)
        self.assertEqual(cleaned["type"], "multiple_choice")
        self.assertEqual(set(cleaned["correctAnswers"]), {"Python", "JavaScript", "C++"})

    def test_multiple_choice_scoring_all_or_nothing(self):
        question = {
            "id": "q-multi",
            "type": "multiple_choice",
            "prompt": "Selecione as corretas",
            "points": 100,
            "correctAnswers": ["Python", "JavaScript", "C++"],
        }

        # Seleção totalmente certa -> 100% dos pontos
        answers, points, total, percentage, correct, _ = score_answers(
            [question],
            {"q-multi": json.dumps(["Python", "JavaScript", "C++"])}
        )
        self.assertEqual(points, 100)
        self.assertTrue(answers[0]["isCorrect"])

        # Seleção com 1 incorreta a mais -> 0 pontos (tudo ou nada)
        answers, points, total, percentage, correct, _ = score_answers(
            [question],
            {"q-multi": json.dumps(["Python", "JavaScript", "C++", "HTML"])}
        )
        self.assertEqual(points, 0)
        self.assertFalse(answers[0]["isCorrect"])

        # Seleção incompleta (faltando 1 correta) -> 0 pontos
        answers, points, total, percentage, correct, _ = score_answers(
            [question],
            {"q-multi": json.dumps(["Python", "JavaScript"])}
        )
        self.assertEqual(points, 0)
        self.assertFalse(answers[0]["isCorrect"])

    def test_true_false_scoring(self):
        question = {
            "id": "q-tf",
            "type": "true_false",
            "prompt": "O Sol é uma estrela.",
            "points": 15,
            "correctAnswer": "Verdadeiro",
        }

        answers, points, total, percentage, correct, _ = score_answers([question], {"q-tf": "Verdadeiro"})
        self.assertEqual(points, 15)
        self.assertTrue(answers[0]["isCorrect"])

        answers, points, total, percentage, correct, _ = score_answers([question], {"q-tf": "Falso"})
        self.assertEqual(points, 0)
        self.assertFalse(answers[0]["isCorrect"])

    def test_short_answer_scoring_ignore_case_and_whitespace(self):
        question = {
            "id": "q-short",
            "type": "short_answer",
            "prompt": "Qual a capital da França?",
            "points": 25,
            "acceptedAnswers": ["Paris", "Cidade de Paris"],
        }

        # Exato com maiúscula/minúscula misturada e espaços adicionais
        answers, points, total, percentage, correct, _ = score_answers([question], {"q-short": "   pArIS  "})
        self.assertEqual(points, 25)
        self.assertTrue(answers[0]["isCorrect"])

        # Outra resposta aceita na lista
        answers, points, total, percentage, correct, _ = score_answers([question], {"q-short": "cidade de paris"})
        self.assertEqual(points, 25)
        self.assertTrue(answers[0]["isCorrect"])

        # Incorreta
        answers, points, total, percentage, correct, _ = score_answers([question], {"q-short": "Londres"})
        self.assertEqual(points, 0)
        self.assertFalse(answers[0]["isCorrect"])

    def test_long_answer_sent_to_manual_correction(self):
        question = {
            "id": "q-long",
            "type": "long_answer",
            "prompt": "Descreva a importância da reciclagem.",
            "points": 50,
            "minCharacters": 20,
            "maxCharacters": 2000,
        }

        answers, points, total, percentage, correct, has_essay = score_answers(
            [question],
            {"q-long": "A reciclagem diminui a quantidade de lixo nos aterros e preserva recursos naturais."}
        )
        self.assertEqual(points, 0)
        self.assertIsNone(answers[0]["isCorrect"])
        self.assertEqual(answers[0]["correctionStatus"], "aguardando_correcao")
        self.assertTrue(has_essay)

    def test_legacy_questions_backward_compatibility(self):
        legacy_questions = [
            {
                "id": "legacy-1",
                "type": "multiple_choice",
                "prompt": "Questão antiga de escolha única",
                "points": 30,
                "options": ["A", "B", "C"],
                "correctAnswer": "B",
            },
            {
                "id": "legacy-2",
                "type": "essay",
                "prompt": "Questão antiga dissertativa",
                "points": 70,
            },
        ]
        cleaned_exam = clean_exam({"title": "Exame Legado", "questions": legacy_questions})
        q1 = cleaned_exam["questions"][0]
        q2 = cleaned_exam["questions"][1]

        self.assertEqual(q1["type"], "single_choice")
        self.assertEqual(q1["correctAnswers"], ["B"])

        self.assertEqual(q2["type"], "long_answer")
        self.assertTrue(q2["manualCorrection"])

        # Correção com sanitização de participante
        sanit = safe_questions(cleaned_exam["questions"])
        self.assertEqual(sanit[0]["type"], "single_choice")
        self.assertEqual(sanit[1]["type"], "long_answer")

        answers, points, total, percentage, correct, has_essay = score_answers(
            cleaned_exam["questions"],
            {"legacy-1": "B", "legacy-2": "Texto da resposta"}
        )
        self.assertEqual(points, 30)
        self.assertEqual(total, 100)
        self.assertTrue(has_essay)

    def test_empty_option_validation(self):
        invalid_question = {
            "id": "q-empty",
            "type": "single_choice",
            "prompt": "Teste",
            "structuredOptions": [
                {"text": "Valida"},
                {"text": "   "},
            ],
        }
        with self.assertRaises(ValueError) as ctx:
            clean_question(invalid_question, 0)
        self.assertIn("Não é permitido salvar alternativa vazia", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
