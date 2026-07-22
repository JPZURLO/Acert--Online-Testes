import unittest
from pathlib import Path

from license_service import ALL_LICENSE_FEATURES


ROOT = Path(__file__).resolve().parents[1]


class PublicPlanSyncTests(unittest.TestCase):
    def test_migration_matches_public_plan_names(self):
        public_page = (ROOT / "front-end" / "NossosPlanos.html").read_text(encoding="utf-8")
        migration = (ROOT / "migrations" / "013_sync_public_plans.sql").read_text(encoding="utf-8")
        for name in ("Essencial", "Pró", "Enterprise", "Plano Flex"):
            self.assertIn(f"<h2>{name}</h2>", public_page)
            self.assertIn(f"'{name}'", migration)

    def test_enterprise_and_flex_features_are_supported(self):
        self.assertTrue({"sso", "dedicated_support", "prepaid_credits"}.issubset(ALL_LICENSE_FEATURES))
        admin = (ROOT / "front-end" / "js" / "admin-dashboard.js").read_text(encoding="utf-8")
        for feature in ("sso", "dedicated_support", "prepaid_credits"):
            self.assertIn(f"'{feature}'", admin)


if __name__ == "__main__":
    unittest.main()
