import re
import unittest
from datetime import date, timedelta
from pathlib import Path

from flask import Flask, jsonify

import server
from support_finance_api import create_support_finance_blueprint, decimal_value, license_finance_from_row


class SupportFinanceTests(unittest.TestCase):
    def test_routes_are_registered(self):
        routes = {str(rule) for rule in server.app.url_map.iter_rules()}
        for route in (
            "/api/company/support",
            "/api/company/support/<int:ticket_id>",
            "/api/company/support/<int:ticket_id>/messages",
            "/api/admin/support",
            "/api/admin/support/<int:ticket_id>",
            "/api/admin/support/<int:ticket_id>/messages",
            "/api/admin/finance",
            "/api/admin/finance/payments",
            "/api/admin/finance/licenses/<int:company_id>",
        ):
            self.assertIn(route, routes)

    def test_routes_require_the_correct_session(self):
        app = Flask(__name__)

        def reject_session(_expected_type):
            return None, (jsonify({"message": "Acesso não autorizado."}), 403)

        def should_not_open_database():
            raise AssertionError("O banco não deve abrir sem sessão")

        app.register_blueprint(create_support_finance_blueprint(should_not_open_database, reject_session))
        client = app.test_client()
        self.assertEqual(client.get("/api/company/support").status_code, 403)
        self.assertEqual(client.post("/api/company/support", json={}).status_code, 403)
        self.assertEqual(client.get("/api/admin/support").status_code, 403)
        self.assertEqual(client.get("/api/admin/finance").status_code, 403)
        self.assertEqual(client.post("/api/admin/finance/payments", json={}).status_code, 403)

    def test_finance_helpers_normalize_values_and_overdue_status(self):
        self.assertEqual(decimal_value("129.905"), 129.91)
        self.assertEqual(decimal_value("inválido"), 0)
        row = {
            "company_id": 7,
            "company_name": "Empresa Teste",
            "monthly_value": 250,
            "payment_status": "pending",
            "next_due_at": date.today() - timedelta(days=1),
        }
        result = license_finance_from_row(row)
        self.assertEqual(result["paymentStatus"], "overdue")
        self.assertEqual(result["monthlyValue"], 250.0)

    def test_admin_and_company_pages_contain_the_new_modules(self):
        admin = Path("front-end/Admin.html").read_text(encoding="utf-8")
        self.assertIn('data-admin-section="support"', admin)
        self.assertIn('data-admin-section="finance"', admin)
        self.assertIn("admin-support-finance.js", admin)
        ids = re.findall(r'\bid="([^"]+)"', admin)
        self.assertEqual(len(ids), len(set(ids)), "O painel Admin possui IDs HTML repetidos")

        support_page = Path("front-end/SuporteEmpresa.html")
        self.assertTrue(support_page.exists())
        self.assertIn("company-support.js", support_page.read_text(encoding="utf-8"))
        for page in ("VisaoGeral.html", "login_cliente.html", "Participante.html", "Resultados.html"):
            self.assertIn("SuporteEmpresa.html", Path("front-end", page).read_text(encoding="utf-8"))

    def test_migration_contains_support_and_finance_schema(self):
        migration = Path("migrations/009_support_finance.sql").read_text(encoding="utf-8")
        for table in ("support_tickets", "support_messages", "financial_payments"):
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table}", migration)
        for column in ("monthly_price", "monthly_value", "payment_status", "next_due_at"):
            self.assertIn(column, migration)


if __name__ == "__main__":
    unittest.main()