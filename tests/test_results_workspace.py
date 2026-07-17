import os
import unittest
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

from flask import Flask, jsonify

from results_api import compute_dashboard, create_results_blueprint, result_label


os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")

import server  # noqa: E402


class IdCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []

    def handle_starttag(self, _tag, attrs):
        value = dict(attrs).get("id")
        if value:
            self.ids.append(value)


class ResultsWorkspaceTests(unittest.TestCase):
    def test_result_labels_respect_passing_score(self):
        self.assertEqual(result_label(80, 70), "approved")
        self.assertEqual(result_label(65, 70), "review")
        self.assertEqual(result_label(45, 70), "failed")

    def test_dashboard_metrics_are_computed(self):
        rows = [
            {
                "score": 80,
                "passing_score": 60,
                "duration_seconds": 1200,
                "competency_scores_json": '{"Lógica": 90}',
                "completed_at": datetime.now(),
            },
            {
                "score": 50,
                "passing_score": 60,
                "duration_seconds": 600,
                "competency_scores_json": '{"Lógica": 70}',
                "completed_at": datetime.now(),
            },
        ]
        dashboard = compute_dashboard(rows)
        self.assertEqual(dashboard["stats"]["completed"], 2)
        self.assertEqual(dashboard["stats"]["averageScore"], 65)
        self.assertEqual(dashboard["stats"]["approvalRate"], 50)
        self.assertEqual(dashboard["stats"]["averageMinutes"], 15)
        self.assertEqual(dashboard["competencies"][0], {"name": "Lógica", "score": 80})

    def test_routes_require_company_session(self):
        app = Flask(__name__)

        def reject_session(_expected_type):
            return None, (jsonify({"message": "Acesso não autorizado."}), 403)

        def should_not_open_database():
            raise AssertionError("O banco não deve abrir sem autenticação")

        app.register_blueprint(create_results_blueprint(should_not_open_database, reject_session))
        client = app.test_client()
        self.assertEqual(client.get("/api/company/results").status_code, 403)
        self.assertEqual(client.get("/api/company/results/1").status_code, 403)

    def test_results_page_contract_and_registered_routes(self):
        html = Path("front-end/Resultados.html").read_text(encoding="utf-8")
        parser = IdCollector()
        parser.feed(html)
        duplicates = {item for item in parser.ids if parser.ids.count(item) > 1}
        self.assertEqual(duplicates, set())
        self.assertIn("./css/styleResultados.css", html)
        self.assertIn("./js/results-dashboard.js", html)
        routes = {rule.rule for rule in server.app.url_map.iter_rules()}
        self.assertIn("/api/company/results", routes)
        self.assertIn("/api/company/results/<int:result_id>", routes)
        self.assertIn("/api/company/attempts/<int:attempt_id>/recording", routes)
        response = server.app.test_client().get("/api/company/results")
        self.assertEqual(response.status_code, 401)
        response.close()


if __name__ == "__main__":
    unittest.main()
