import unittest
from pathlib import Path

from admin_api import activation_token_hash, password_validation_message


ROOT = Path(__file__).resolve().parents[1]


class CompanyActivationTests(unittest.TestCase):
    def test_tokens_are_hashed_and_not_reversible(self):
        token = "private-activation-token"
        digest = activation_token_hash(token)
        self.assertEqual(len(digest), 64)
        self.assertNotIn(token, digest)
        self.assertEqual(digest, activation_token_hash(token))

    def test_password_policy_requires_length_case_and_number(self):
        self.assertTrue(password_validation_message("Abc1234"))
        self.assertTrue(password_validation_message("alllowercase123"))
        self.assertTrue(password_validation_message("ALLUPPERCASE123"))
        self.assertTrue(password_validation_message("NoNumbersHere"))
        self.assertEqual(password_validation_message("Senha123"), "")
        self.assertEqual(password_validation_message("SenhaSegura123"), "")

    def test_activation_schema_and_page_contract(self):
        migration = (ROOT / "migrations" / "012_company_activation.sql").read_text(encoding="utf-8")
        page = (ROOT / "front-end" / "AtivarEmpresa.html").read_text(encoding="utf-8")
        script = (ROOT / "front-end" / "js" / "company-activation.js").read_text(encoding="utf-8")
        admin = (ROOT / "front-end" / "Admin.html").read_text(encoding="utf-8")
        self.assertIn("company_activation_tokens", migration)
        self.assertIn("token_hash CHAR(64)", migration)
        self.assertIn("used_at", migration)
        self.assertIn("activation-password-confirmation", page)
        self.assertIn("/api/company-activation/complete", script)
        self.assertIn("request-approval-plan", admin)
        self.assertNotIn("Senha temporária", page)


if __name__ == "__main__":
    unittest.main()
