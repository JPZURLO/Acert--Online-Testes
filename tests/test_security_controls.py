import os
import unittest
from pathlib import Path


os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.pop("ALLOW_LEGACY_PLAINTEXT_PASSWORDS", None)

import server  # noqa: E402


class SecurityControlsTests(unittest.TestCase):
    def setUp(self):
        server.login_rate_limiter.events.clear()
        self.client = server.app.test_client()

    def test_security_headers_and_private_cache_policy(self):
        response = self.client.get("/", base_url="https://localhost")
        self.assertEqual(response.status_code, 200)
        self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertIn("max-age=", response.headers["Strict-Transport-Security"])
        api_response = self.client.get("/api/company/workspace")
        self.assertEqual(api_response.headers["Cache-Control"], "no-store")

    def test_dangerous_public_files_are_blocked(self):
        for path in ("/assets/fonts/file.exe", "/assets/archive.zip", "/js/node_modules/pkg/index.js"):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_plaintext_passwords_are_rejected_by_default(self):
        self.assertEqual(server.password_matches("senha-legada", "senha-legada"), (False, False))

    def test_company_login_normalizes_masked_cnpj(self):
        self.assertEqual(server.normalize_cnpj("99.999.999/0001-99"), "99999999000199")
        login_script = Path("front-end/js/scriptLoginEmpresa.js").read_text(encoding="utf-8")
        self.assertIn(".replace(/\\D/g, '')", login_script)

    def test_login_limiter_blocks_after_configured_failures(self):
        limiter = server.LoginRateLimiter(attempts=2, window_seconds=60)
        self.assertEqual(limiter.retry_after("key"), 0)
        limiter.record_failure("key")
        limiter.record_failure("key")
        self.assertGreater(limiter.retry_after("key"), 0)
        limiter.reset("key")
        self.assertEqual(limiter.retry_after("key"), 0)

    def test_cookie_authenticated_write_requires_csrf_or_same_origin(self):
        self.client.set_cookie(server.JWT_COOKIE_NAME, "invalid-but-present")
        blocked = self.client.post("/logout")
        self.assertEqual(blocked.status_code, 403)
        allowed = self.client.post("/logout", headers={"Origin": "http://localhost"})
        self.assertEqual(allowed.status_code, 200)

    def test_request_size_is_limited(self):
        previous = server.app.config["MAX_CONTENT_LENGTH"]
        server.app.config["MAX_CONTENT_LENGTH"] = 64
        try:
            response = self.client.post(
                "/login",
                data=b'{' + b'"email":"' + b'a' * 100 + b'"}',
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 413)
        finally:
            server.app.config["MAX_CONTENT_LENGTH"] = previous

    def test_public_tree_contains_no_executables_or_archives(self):
        forbidden = {".exe", ".zip", ".msi", ".bat", ".cmd", ".ps1"}
        matches = [path for path in Path("front-end").rglob("*") if path.is_file() and path.suffix.lower() in forbidden]
        self.assertEqual(matches, [])


if __name__ == "__main__":
    unittest.main()
