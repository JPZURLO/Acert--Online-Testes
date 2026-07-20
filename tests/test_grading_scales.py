import unittest

from grading import grade_for_score, normalize_grading_scale


class GradingScaleTests(unittest.TestCase):
    def test_numeric_scales_convert_percentage(self):
        self.assertEqual(grade_for_score(82, {"type": "numeric", "maximum": 10})["value"], 8.2)
        self.assertEqual(grade_for_score(82, {"type": "numeric", "maximum": 5})["value"], 4.1)

    def test_concept_scale_uses_editable_ranges(self):
        scale = {
            "type": "concept",
            "bands": [
                {"min": 0, "code": "I", "label": "Irregular"},
                {"min": 50, "code": "R", "label": "Regular"},
                {"min": 70, "code": "B", "label": "Bom"},
                {"min": 90, "code": "MB", "label": "Muito bom"},
            ],
        }
        self.assertEqual(
            grade_for_score(75, scale),
            {"type": "concept", "value": "B", "label": "Bom", "maximum": None, "percent": 75.0},
        )

    def test_invalid_scale_returns_safe_default(self):
        scale = normalize_grading_scale({"type": "unknown", "maximum": 7})
        self.assertEqual(scale["type"], "numeric")
        self.assertEqual(scale["maximum"], 100)
        self.assertEqual(scale["bands"][0]["min"], 0)


if __name__ == "__main__":
    unittest.main()
