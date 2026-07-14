import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import safe_join

from company_api import create_company_blueprint
from participants_api import create_participants_blueprint

load_dotenv()
app = Flask(__name__, static_folder="front-end")
JWT_COOKIE_NAME = "acert_access_token"
JWT_TTL = timedelta(hours=1)
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


def required_setting(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"A variável de ambiente {name} não foi configurada.")
    return value


def open_database():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=required_setting("DB_USER"),
        password=required_setting("DB_PASSWORD"),
        database=os.getenv("DB_NAME", "acert"),
    )


def password_matches(stored_password, supplied_password):
    if not stored_password or not supplied_password:
        return False, False
    try:
        if check_password_hash(stored_password, supplied_password):
            return True, False
    except (ValueError, TypeError):
        pass
    legacy_match = hmac.compare_digest(str(stored_password), str(supplied_password))
    return legacy_match, legacy_match


def issue_token(account_id, account_type):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(account_id), "account_type": account_type, "iat": now, "exp": now + JWT_TTL},
        required_setting("JWT_SECRET"),
        algorithm="HS256",
    )


def login_response(account_id, account_type, **public_data):
    response = make_response(jsonify({"success": True, "message": "Login realizado com sucesso!", **public_data}))
    response.set_cookie(
        JWT_COOKIE_NAME,
        issue_token(account_id, account_type),
        max_age=int(JWT_TTL.total_seconds()),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Strict",
        path="/",
    )
    return response


def token_payload(expected_account_type):
    token = request.cookies.get(JWT_COOKIE_NAME)
    if not token:
        parts = request.headers.get("Authorization", "").split()
        if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
            return None, (jsonify({"success": False, "message": "Token não fornecido."}), 401)
        token = parts[1]
    try:
        payload = jwt.decode(
            token,
            required_setting("JWT_SECRET"),
            algorithms=["HS256"],
            options={"require": ["sub", "account_type", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"success": False, "message": "Token expirado."}), 401)
    except (jwt.InvalidTokenError, RuntimeError):
        return None, (jsonify({"success": False, "message": "Token inválido."}), 401)
    if payload.get("account_type") != expected_account_type:
        return None, (jsonify({"success": False, "message": "Acesso não autorizado."}), 403)
    return payload, None


def request_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


app.register_blueprint(create_company_blueprint(open_database, token_payload))
app.register_blueprint(create_participants_blueprint(open_database, token_payload))


@app.post("/login")
def login():
    data = request_json()
    email = str(data.get("email", "")).strip()
    supplied_password = data.get("senha")
    if not email or not supplied_password:
        return jsonify({"success": False, "message": "E-mail e senha são obrigatórios."}), 400
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, NomeCompleto, senha FROM users WHERE email = %s LIMIT 1", (email,))
        user = cursor.fetchone()
        valid, needs_upgrade = password_matches(user.get("senha") if user else None, supplied_password)
        if not valid:
            return jsonify({"success": False, "message": "Credenciais inválidas."}), 401
        if needs_upgrade:
            cursor.execute("UPDATE users SET senha = %s WHERE id = %s", (generate_password_hash(supplied_password, method="pbkdf2:sha256"), user["id"]))
            connection.commit()
        return login_response(user["id"], "user", NomeCompleto=user["NomeCompleto"])
    finally:
        cursor.close()
        connection.close()


@app.post("/login_empresa")
def login_empresa():
    data = request_json()
    cnpj = str(data.get("CNPJ", "")).strip()
    supplied_password = data.get("senha")
    if not cnpj or not supplied_password:
        return jsonify({"success": False, "message": "CNPJ e senha são obrigatórios."}), 400
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, RazaoSocial, senha FROM empresas WHERE CNPJ = %s LIMIT 1", (cnpj,))
        company = cursor.fetchone()
        valid, needs_upgrade = password_matches(company.get("senha") if company else None, supplied_password)
        if not valid:
            return jsonify({"success": False, "message": "Credenciais inválidas."}), 401
        if needs_upgrade:
            cursor.execute("UPDATE empresas SET senha = %s WHERE id = %s", (generate_password_hash(supplied_password, method="pbkdf2:sha256"), company["id"]))
            connection.commit()
        return login_response(company["id"], "company", RazaoSocial=company["RazaoSocial"])
    finally:
        cursor.close()
        connection.close()


@app.get("/api/obterNomeCompleto")
def obter_nome_completo():
    payload, error = token_payload("user")
    if error:
        return error
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT NomeCompleto FROM users WHERE id = %s", (payload["sub"],))
        user = cursor.fetchone()
        if not user:
            return jsonify({"success": False, "message": "Usuário não encontrado."}), 404
        return jsonify({"NomeCompleto": user["NomeCompleto"], "accountType": "user"})
    finally:
        cursor.close()
        connection.close()


@app.get("/api/obterRazaoSocial")
def obter_razao_social():
    payload, error = token_payload("company")
    if error:
        return error
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT RazaoSocial FROM empresas WHERE id = %s", (payload["sub"],))
        company = cursor.fetchone()
        if not company:
            return jsonify({"success": False, "message": "Empresa não encontrada."}), 404
        return jsonify({"RazaoSocial": company["RazaoSocial"], "accountType": "company"})
    finally:
        cursor.close()
        connection.close()


@app.post("/logout")
def logout():
    response = make_response(jsonify({"success": True}))
    response.delete_cookie(JWT_COOKIE_NAME, path="/", samesite="Strict")
    return response


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_file(path):
    if path.startswith("api/"):
        return jsonify({"success": False, "message": "Endpoint não encontrado."}), 404
    requested_file = safe_join(app.static_folder, path) if path else None
    if requested_file and os.path.isfile(requested_file):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(
        host=os.getenv("APP_HOST", "127.0.0.1"),
        port=int(os.getenv("APP_PORT", "5500")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
