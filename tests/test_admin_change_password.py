import unittest
from flask import Flask, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

import server
from admin_api import create_admin_blueprint


class MockCursor:
    def __init__(self, admin_data=None):
        self.admin_data = admin_data
        self.last_query = None
        self.last_params = None
        self.rowcount = 1

    def execute(self, query, params=None):
        self.last_query = query
        self.last_params = params

    def fetchone(self):
        return self.admin_data

    def close(self):
        pass


class MockConnection:
    def __init__(self, admin_data=None):
        self.cursor_obj = MockCursor(admin_data)
        self.committed = False

    def cursor(self, dictionary=False):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def rollback(self):
        pass

    def close(self):
        pass


class AdminChangePasswordTests(unittest.TestCase):
    def test_route_registered_in_server(self):
        routes = {str(rule) for rule in server.app.url_map.iter_rules()}
        self.assertIn("/api/admin/change-password", routes)

    def test_requires_admin_session(self):
        app = Flask(__name__)

        def reject_session(_expected_type):
            return None, (jsonify({"success": False, "message": "Acesso não autorizado."}), 401)

        def should_not_open_db():
            raise AssertionError("O banco não deve ser aberto sem sessão válida")

        app.register_blueprint(create_admin_blueprint(should_not_open_db, reject_session))
        client = app.test_client()

        response = client.put("/api/admin/change-password", json={
            "currentPassword": "Senha123",
            "newPassword": "NovaSenha123",
            "confirmPassword": "NovaSenha123",
        })
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json["success"])

    def test_validation_missing_fields(self):
        app = Flask(__name__)

        def mock_token_payload(_expected_type):
            return {"sub": "1"}, None

        def mock_open_db():
            return MockConnection()

        app.register_blueprint(create_admin_blueprint(mock_open_db, mock_token_payload))
        client = app.test_client()

        response = client.put("/api/admin/change-password", json={
            "currentPassword": "",
            "newPassword": "NovaSenha123",
            "confirmPassword": "NovaSenha123",
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json["message"], "Preencha todos os campos.")

    def test_validation_passwords_mismatch(self):
        app = Flask(__name__)

        def mock_token_payload(_expected_type):
            return {"sub": "1"}, None

        def mock_open_db():
            return MockConnection()

        app.register_blueprint(create_admin_blueprint(mock_open_db, mock_token_payload))
        client = app.test_client()

        response = client.put("/api/admin/change-password", json={
            "currentPassword": "SenhaAtual123",
            "newPassword": "NovaSenha123",
            "confirmPassword": "OutraSenha123",
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json["message"], "As novas senhas não coincidem.")

    def test_validation_same_as_current(self):
        app = Flask(__name__)

        def mock_token_payload(_expected_type):
            return {"sub": "1"}, None

        def mock_open_db():
            return MockConnection()

        app.register_blueprint(create_admin_blueprint(mock_open_db, mock_token_payload))
        client = app.test_client()

        response = client.put("/api/admin/change-password", json={
            "currentPassword": "SenhaAtual123",
            "newPassword": "SenhaAtual123",
            "confirmPassword": "SenhaAtual123",
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json["message"], "A nova senha deve ser diferente da senha atual.")

    def test_validation_too_short(self):
        app = Flask(__name__)

        def mock_token_payload(_expected_type):
            return {"sub": "1"}, None

        def mock_open_db():
            return MockConnection()

        app.register_blueprint(create_admin_blueprint(mock_open_db, mock_token_payload))
        client = app.test_client()

        response = client.put("/api/admin/change-password", json={
            "currentPassword": "SenhaAtual123",
            "newPassword": "123",
            "confirmPassword": "123",
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json["message"], "A nova senha deve ter pelo menos 8 caracteres.")

    def test_wrong_current_password(self):
        app = Flask(__name__)
        current_hash = generate_password_hash("SenhaCorreta123", method="pbkdf2:sha256")
        admin_data = {"id": 1, "password_hash": current_hash}
        conn = MockConnection(admin_data)

        def mock_token_payload(_expected_type):
            return {"sub": "1"}, None

        def mock_open_db():
            return conn

        app.register_blueprint(create_admin_blueprint(mock_open_db, mock_token_payload))
        client = app.test_client()

        response = client.put("/api/admin/change-password", json={
            "currentPassword": "SenhaErrada123",
            "newPassword": "NovaSenha123",
            "confirmPassword": "NovaSenha123",
        })
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json["message"], "Senha atual inválida.")

    def test_change_password_success(self):
        app = Flask(__name__)
        old_hash = generate_password_hash("SenhaVelha123", method="pbkdf2:sha256")
        admin_data = {"id": 1, "password_hash": old_hash}
        conn = MockConnection(admin_data)

        def mock_token_payload(_expected_type):
            return {"sub": "1"}, None

        def mock_open_db():
            return conn

        app.register_blueprint(create_admin_blueprint(mock_open_db, mock_token_payload))
        client = app.test_client()

        response = client.put("/api/admin/change-password", json={
            "currentPassword": "SenhaVelha123",
            "newPassword": "NovaSenhaSuperSegura456",
            "confirmPassword": "NovaSenhaSuperSegura456",
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["success"])
        self.assertEqual(response.json["message"], "Senha alterada com sucesso.")
        self.assertTrue(conn.committed)

        # Check that update query was executed with new hash
        self.assertIn("UPDATE admin_users SET password_hash", conn.cursor_obj.last_query)
        new_hash = conn.cursor_obj.last_params[0]
        self.assertTrue(check_password_hash(new_hash, "NovaSenhaSuperSegura456"))
        self.assertFalse(check_password_hash(new_hash, "SenhaVelha123"))


if __name__ == "__main__":
    unittest.main()
