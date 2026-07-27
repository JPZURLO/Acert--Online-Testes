import hashlib
import hmac
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import jwt
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, make_response, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import safe_join

from admin_api import create_admin_blueprint
from company_api import create_company_blueprint
from company_operations_api import create_company_operations_blueprint
from error_monitoring import create_error_monitoring_blueprint, install_error_handlers
from license_service import company_license_snapshot, license_block_message
from overview_api import create_overview_blueprint
from participants_api import create_participants_blueprint
from participant_api import create_participant_blueprint
from results_api import create_results_blueprint
from recording_retention import start_recording_maintenance
from support_finance_api import create_support_finance_blueprint

load_dotenv()
app = Flask(__name__, static_folder="front-end")
JWT_COOKIE_NAME = "acert_access_token"
CSRF_COOKIE_NAME = "acert_csrf_token"
ADMIN_RETURN_COOKIE_NAME = "acert_admin_return_token"
JWT_TTL = timedelta(hours=1)
PARTICIPANT_JWT_TTL = timedelta(hours=max(2, int(os.getenv("PARTICIPANT_SESSION_HOURS", "12"))))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
APP_ENV = os.getenv("APP_ENV", "development").lower()
MAX_LOGIN_ATTEMPTS = max(1, int(os.getenv("LOGIN_RATE_LIMIT_ATTEMPTS", "5")))
LOGIN_WINDOW_SECONDS = max(60, int(os.getenv("LOGIN_RATE_LIMIT_WINDOW_SECONDS", "300")))
BLOCKED_PUBLIC_EXTENSIONS = {".bat", ".cmd", ".env", ".exe", ".ini", ".log", ".msi", ".php", ".ps1", ".py", ".sh", ".sql", ".zip"}

app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", str(5 * 1024 * 1024)))
trusted_hosts = [host.strip() for host in os.getenv("APP_TRUSTED_HOSTS", "").split(",") if host.strip()]
if trusted_hosts:
    app.config["TRUSTED_HOSTS"] = trusted_hosts
if APP_ENV == "production" and not COOKIE_SECURE:
    raise RuntimeError("COOKIE_SECURE deve ser true em produção.")


class LoginRateLimiter:
    def __init__(self, attempts, window_seconds):
        self.attempts = attempts
        self.window_seconds = window_seconds
        self.events = defaultdict(deque)
        self.lock = threading.Lock()

    def _remove_expired(self, events, now):
        cutoff = now - self.window_seconds
        while events and events[0] <= cutoff:
            events.popleft()

    def retry_after(self, key):
        now = time.monotonic()
        with self.lock:
            events = self.events[key]
            self._remove_expired(events, now)
            if len(events) < self.attempts:
                return 0
            return max(1, int(self.window_seconds - (now - events[0])))

    def record_failure(self, key):
        now = time.monotonic()
        with self.lock:
            events = self.events[key]
            self._remove_expired(events, now)
            events.append(now)

    def reset(self, key):
        with self.lock:
            self.events.pop(key, None)


login_rate_limiter = LoginRateLimiter(MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_SECONDS)


def required_setting(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"A variável de ambiente {name} não foi configurada.")
    return value


def open_database():
    settings = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": required_setting("DB_USER"),
        "password": required_setting("DB_PASSWORD"),
        "database": os.getenv("DB_NAME", "acert"),
    }
    ssl_ca = os.getenv("DB_SSL_CA")
    if ssl_ca:
        settings.update({"ssl_ca": ssl_ca, "ssl_verify_cert": True, "ssl_verify_identity": True})
    return mysql.connector.connect(**settings)


def password_matches(stored_password, supplied_password):
    if not stored_password or not supplied_password:
        return False, False
    try:
        if check_password_hash(stored_password, supplied_password):
            return True, False
    except (ValueError, TypeError):
        pass
    if os.getenv("ALLOW_LEGACY_PLAINTEXT_PASSWORDS", "false").lower() != "true":
        return False, False
    legacy_match = hmac.compare_digest(str(stored_password), str(supplied_password))
    return legacy_match, legacy_match


def normalize_cnpj(value):
    return "".join(character for character in str(value or "") if character.isdigit())


def login_limit_key(account_type, identifier):
    remote_address = request.remote_addr or "unknown"
    raw_key = f"{account_type}|{remote_address}|{identifier.lower()}".encode("utf-8")
    return hashlib.sha256(raw_key).hexdigest()


def rate_limited_response(retry_after):
    response = jsonify({"success": False, "message": "Muitas tentativas. Aguarde alguns minutos e tente novamente."})
    response.status_code = 429
    response.headers["Retry-After"] = str(retry_after)
    return response


def account_ttl(account_type):
    return PARTICIPANT_JWT_TTL if account_type == "user" else JWT_TTL


def issue_token(account_id, account_type, extra_claims=None):
    now = datetime.now(timezone.utc)
    payload = {"sub": str(account_id), "account_type": account_type, "iat": now, "exp": now + account_ttl(account_type)}
    if isinstance(extra_claims, dict):
        payload.update(extra_claims)
    return jwt.encode(
        payload,
        required_setting("JWT_SECRET"),
        algorithm="HS256",
    )


def set_csrf_cookie(response, ttl=JWT_TTL):
    response.set_cookie(
        CSRF_COOKIE_NAME,
        secrets.token_urlsafe(32),
        max_age=int(ttl.total_seconds()),
        httponly=False,
        secure=COOKIE_SECURE,
        samesite="Strict",
        path="/",
    )



def login_response(account_id, account_type, **public_data):
    ttl = account_ttl(account_type)
    response = make_response(jsonify({"success": True, "message": "Login realizado com sucesso!", **public_data}))
    response.set_cookie(
        JWT_COOKIE_NAME,
        issue_token(account_id, account_type),
        max_age=int(ttl.total_seconds()),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Strict",
        path="/",
    )
    set_csrf_cookie(response, ttl)
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


def decode_cookie_token(cookie_name=JWT_COOKIE_NAME):
    token = request.cookies.get(cookie_name)
    if not token:
        return None
    try:
        return jwt.decode(
            token,
            required_setting("JWT_SECRET"),
            algorithms=["HS256"],
            options={"require": ["sub", "account_type", "exp"]},
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, RuntimeError):
        return None


def set_access_cookie(response, token, ttl=JWT_TTL):
    response.set_cookie(
        JWT_COOKIE_NAME,
        token,
        max_age=int(ttl.total_seconds()),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Strict",
        path="/",
    )
    set_csrf_cookie(response, ttl)
    return response


def request_json():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def current_impersonation_payload():
    payload = decode_cookie_token()
    return payload if payload and payload.get("admin_impersonation") else None


COMPANY_FEATURE_ROUTES = (
    ("/api/company/question-imports", "excel_import"),
    ("/api/company/branding", "branding"),
    ("/api/company/participants", "participants"),
    ("/api/company/operations", "exams"),
    ("/api/company/attempts", "exams"),
    ("/api/company/results", "results"),
    ("/api/company/exams", "exams"),
)


@app.before_request
def enforce_company_license():
    if not request.path.startswith("/api/company/"):
        return None
    payload, error = token_payload("company")
    if error:
        return None
    connection = open_database()
    try:
        snapshot = company_license_snapshot(connection, int(payload["sub"]))
        blocked_message = license_block_message(snapshot)
        if blocked_message:
            return jsonify({"success": False, "message": blocked_message, "license": snapshot}), 423
        required_feature = next(
            (feature for prefix, feature in COMPANY_FEATURE_ROUTES if request.path.startswith(prefix)),
            None,
        )
        if required_feature and required_feature not in snapshot["features"]:
            return jsonify({"success": False, "message": "Este recurso não está incluído na licença da empresa.", "feature": required_feature}), 402
        if request.method == "POST" and request.path == "/api/company/exams" and snapshot["maxExams"] is not None:
            cursor = connection.cursor(dictionary=True)
            try:
                cursor.execute("SELECT COUNT(*) AS total FROM company_exams WHERE company_id = %s", (payload["sub"],))
                if cursor.fetchone()["total"] >= snapshot["maxExams"]:
                    return jsonify({"success": False, "message": "O limite de testes da licença foi atingido."}), 409
            finally:
                cursor.close()
    finally:
        connection.close()
    return None


@app.before_request
def block_impersonation_writes():
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return None
    if request.path in {"/api/admin/impersonation/stop", "/logout"}:
        return None
    payload = current_impersonation_payload()
    if not payload:
        return None
    protected_prefixes = ("/api/company/", "/api/participant/", "/api/exam-documents/")
    if request.path.startswith(protected_prefixes):
        return jsonify({
            "success": False,
            "message": "Modo administrador de visualização: nenhuma alteração pode ser salva nesta simulação.",
            "impersonation": True,
        }), 423
    return None

@app.before_request
def protect_cookie_authenticated_writes():
    public_writes = {
        "/login", "/login_empresa", "/login_admin", "/api/access-requests",
        "/api/company-activation/validate", "/api/company-activation/complete",
    }
    if request.method in {"GET", "HEAD", "OPTIONS"} or request.path in public_writes:
        return None
    if not request.cookies.get(JWT_COOKIE_NAME):
        return None
    if not request.cookies.get(JWT_COOKIE_NAME):
        return None
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
    header_token = request.headers.get("X-CSRF-Token", "")
    if not cookie_token or not header_token or not hmac.compare_digest(cookie_token, header_token):
        return jsonify({"success": False, "message": "Requisição de segurança inválida. Atualize a página e tente novamente."}), 403
    return None


@app.after_request
def apply_security_headers(response):
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
        "form-action 'self'; script-src 'self'; connect-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.positus.global; "
        "font-src 'self' data: https://cdnjs.cloudflare.com; "
        "img-src 'self' data: blob: https://cdn.positus.global; media-src 'self' blob:"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    if request.is_secure or COOKIE_SECURE:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.path.startswith("/api/") or request.path in {"/login", "/login_empresa", "/login_admin", "/logout"}:
        response.headers["Cache-Control"] = "no-store"
    if request.cookies.get(JWT_COOKIE_NAME) and not request.cookies.get(CSRF_COOKIE_NAME):
        set_csrf_cookie(response)
    return response

@app.errorhandler(413)
def request_too_large(_error):
    if request.path.startswith("/api/") or request.path in {"/login", "/login_empresa", "/login_admin"}:
        return jsonify({"success": False, "message": "A requisição excede o tamanho permitido."}), 413
    return "Arquivo muito grande.", 413


from exam_documents import create_exam_documents_blueprint
app.register_blueprint(create_exam_documents_blueprint(open_database, token_payload))
app.register_blueprint(create_company_blueprint(open_database, token_payload))
app.register_blueprint(create_company_operations_blueprint(open_database, token_payload))
app.register_blueprint(create_overview_blueprint(open_database, token_payload))
app.register_blueprint(create_participants_blueprint(open_database, token_payload))
app.register_blueprint(create_participant_blueprint(open_database, token_payload))
app.register_blueprint(create_results_blueprint(open_database, token_payload))
app.register_blueprint(create_admin_blueprint(open_database, token_payload))
app.register_blueprint(create_support_finance_blueprint(open_database, token_payload))
app.register_blueprint(create_error_monitoring_blueprint(open_database, token_payload))
install_error_handlers(app, open_database, token_payload)
recording_maintenance_thread = start_recording_maintenance(open_database)

@app.post("/login")
def login():
    data = request_json()
    email = str(data.get("email", "")).strip()
    supplied_password = data.get("senha")
    if not email or not supplied_password:
        return jsonify({"success": False, "message": "E-mail e senha são obrigatórios."}), 400
    limit_key = login_limit_key("user", email)
    retry_after = login_rate_limiter.retry_after(limit_key)
    if retry_after:
        return rate_limited_response(retry_after)
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, NomeCompleto, senha FROM users WHERE email = %s LIMIT 1", (email,))
        user = cursor.fetchone()
        valid, needs_upgrade = password_matches(user.get("senha") if user else None, supplied_password)
        if not valid:
            login_rate_limiter.record_failure(limit_key)
            return jsonify({"success": False, "message": "Credenciais inválidas."}), 401
        if needs_upgrade:
            cursor.execute("UPDATE users SET senha = %s WHERE id = %s", (generate_password_hash(supplied_password, method="pbkdf2:sha256"), user["id"]))
            connection.commit()
        login_rate_limiter.reset(limit_key)
        return login_response(user["id"], "user", NomeCompleto=user["NomeCompleto"])
    finally:
        cursor.close()
        connection.close()


@app.post("/login_empresa")
def login_empresa():
    data = request_json()
    raw_cnpj = str(data.get("CNPJ", "")).strip()
    cnpj = normalize_cnpj(raw_cnpj)
    supplied_password = data.get("senha")
    if len(cnpj) != 14 or not supplied_password:
        return jsonify({"success": False, "message": "CNPJ e senha são obrigatórios."}), 400
    limit_key = login_limit_key("company", cnpj)
    retry_after = login_rate_limiter.retry_after(limit_key)
    if retry_after:
        return rate_limited_response(retry_after)
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, RazaoSocial, senha FROM empresas WHERE CNPJ IN (%s, %s) LIMIT 1",
            (cnpj, raw_cnpj),
        )
        company = cursor.fetchone()
        valid, needs_upgrade = password_matches(company.get("senha") if company else None, supplied_password)
        if not valid:
            login_rate_limiter.record_failure(limit_key)
            return jsonify({"success": False, "message": "Credenciais inválidas."}), 401
        if needs_upgrade:
            cursor.execute("UPDATE empresas SET senha = %s WHERE id = %s", (generate_password_hash(supplied_password, method="pbkdf2:sha256"), company["id"]))
            connection.commit()
        snapshot = company_license_snapshot(connection, company["id"])
        blocked_message = license_block_message(snapshot)
        if blocked_message:
            return jsonify({"success": False, "message": blocked_message}), 403
        login_rate_limiter.reset(limit_key)
        return login_response(company["id"], "company", RazaoSocial=company["RazaoSocial"], license=snapshot)
    finally:
        cursor.close()
        connection.close()


@app.post("/login_admin")
def login_admin():
    data = request_json()
    email = str(data.get("email", "")).strip().lower()
    supplied_password = data.get("senha")
    if not email or not supplied_password:
        return jsonify({"success": False, "message": "E-mail e senha são obrigatórios."}), 400
    limit_key = login_limit_key("admin", email)
    retry_after = login_rate_limiter.retry_after(limit_key)
    if retry_after:
        return rate_limited_response(retry_after)
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, email, password_hash, active FROM admin_users WHERE email = %s LIMIT 1", (email,))
        admin = cursor.fetchone()
        valid, _needs_upgrade = password_matches(admin.get("password_hash") if admin else None, supplied_password)
        if not admin or not admin.get("active") or not valid:
            login_rate_limiter.record_failure(limit_key)
            return jsonify({"success": False, "message": "Credenciais administrativas inválidas."}), 401
        login_rate_limiter.reset(limit_key)
        return login_response(admin["id"], "admin", AdminName=admin["name"], email=admin["email"])
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


@app.get("/api/knowledge-base/articles")
def public_knowledge_base_articles():
    import json, os
    kb_file = os.path.join(app.root_path, "data", "knowledge_base_articles.json")
    if os.path.exists(kb_file):
        try:
            with open(kb_file, "r", encoding="utf-8") as f:
                articles = json.load(f)
            return jsonify({"success": True, "articles": articles})
        except Exception:
            pass
    return jsonify({"success": True, "articles": []})


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


@app.get("/api/impersonation/status")
def impersonation_status():
    payload = current_impersonation_payload()
    if not payload:
        return jsonify({"active": False})
    return jsonify({
        "active": True,
        "mode": payload.get("impersonation_mode"),
        "targetName": payload.get("target_name") or "Conta",
        "adminId": payload.get("impersonated_by"),
        "readOnly": True,
    })


@app.get("/api/admin/impersonation/targets")
def admin_impersonation_targets():
    _admin_payload, error = token_payload("admin")
    if error:
        return error
    company_filter = request.args.get("companyId", "").strip()
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT e.id, e.RazaoSocial, e.CNPJ, COALESCE(l.status,'legacy') AS license_status, "
            "COALESCE(p.name,'Acesso legado') AS plan_name "
            "FROM empresas e "
            "LEFT JOIN company_licenses l ON l.company_id=e.id "
            "LEFT JOIN license_plans p ON p.id=l.plan_id "
            "ORDER BY e.RazaoSocial LIMIT 1000"
        )
        companies = [
            {
                "id": row["id"],
                "name": row["RazaoSocial"],
                "cnpj": row.get("CNPJ") or "",
                "status": row.get("license_status") or "legacy",
                "planName": row.get("plan_name") or "Acesso legado",
            }
            for row in cursor.fetchall()
        ]
        participants = []
        if company_filter.isdigit():
            cursor.execute(
                "SELECT p.id, p.company_id, p.full_name, p.email, p.status, e.title AS exam_title, u.id AS user_id "
                "FROM company_participants p "
                "LEFT JOIN company_exams e ON e.id=p.exam_id AND e.company_id=p.company_id "
                "LEFT JOIN users u ON LOWER(u.email)=LOWER(p.email) "
                "WHERE p.company_id=%s ORDER BY p.full_name LIMIT 300",
                (int(company_filter),),
            )
            participants = [
                {
                    "id": row["id"],
                    "companyId": row["company_id"],
                    "name": row["full_name"],
                    "email": row["email"],
                    "status": row.get("status") or "",
                    "examTitle": row.get("exam_title") or "Sem teste atribuído",
                    "hasUser": bool(row.get("user_id")),
                }
                for row in cursor.fetchall()
            ]
        return jsonify({"companies": companies, "participants": participants})
    finally:
        cursor.close()
        connection.close()


@app.post("/api/admin/impersonation/start")
def admin_impersonation_start():
    admin_payload, error = token_payload("admin")
    if error:
        return error
    data = request_json()
    mode = str(data.get("mode") or "").strip().lower()
    company_id = data.get("companyId")
    participant_id = data.get("participantId")
    if mode not in {"company", "participant"}:
        return jsonify({"success": False, "message": "Escolha Empresa ou Participante para visualizar."}), 400
    connection = open_database()
    cursor = connection.cursor(dictionary=True)
    try:
        target_id = None
        target_type = None
        target_name = ""
        redirect_url = "VisaoGeral.html"
        if mode == "company":
            if not str(company_id or "").isdigit():
                return jsonify({"success": False, "message": "Selecione uma empresa."}), 400
            cursor.execute("SELECT id, RazaoSocial FROM empresas WHERE id=%s LIMIT 1", (int(company_id),))
            company = cursor.fetchone()
            if not company:
                return jsonify({"success": False, "message": "Empresa não encontrada."}), 404
            target_id = company["id"]
            target_type = "company"
            target_name = company["RazaoSocial"]
        else:
            if not str(participant_id or "").isdigit():
                return jsonify({"success": False, "message": "Selecione um participante."}), 400
            cursor.execute(
                "SELECT p.id, p.full_name, p.email, p.company_id, u.id AS user_id "
                "FROM company_participants p "
                "LEFT JOIN users u ON LOWER(u.email)=LOWER(p.email) "
                "WHERE p.id=%s LIMIT 1",
                (int(participant_id),),
            )
            participant = cursor.fetchone()
            if not participant:
                return jsonify({"success": False, "message": "Participante não encontrado."}), 404
            if not participant.get("user_id"):
                return jsonify({"success": False, "message": "Este participante ainda não possui usuário de login vinculado."}), 409
            target_id = participant["user_id"]
            target_type = "user"
            target_name = participant["full_name"]
            redirect_url = "AreaParticipante.html"

        simulation_token = issue_token(
            target_id,
            target_type,
            {
                "admin_impersonation": True,
                "impersonated_by": str(admin_payload["sub"]),
                "impersonation_mode": mode,
                "target_name": target_name,
            },
        )
        admin_return_token = issue_token(admin_payload["sub"], "admin")
        response = make_response(jsonify({
            "success": True,
            "mode": mode,
            "targetName": target_name,
            "redirectUrl": redirect_url,
        }))
        response.set_cookie(
            ADMIN_RETURN_COOKIE_NAME,
            admin_return_token,
            max_age=int(JWT_TTL.total_seconds()),
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="Strict",
            path="/",
        )
        set_access_cookie(response, simulation_token, account_ttl(target_type))
        return response
    finally:
        cursor.close()
        connection.close()


@app.post("/api/admin/impersonation/stop")
def admin_impersonation_stop():
    admin_payload = decode_cookie_token(ADMIN_RETURN_COOKIE_NAME)
    if not admin_payload or admin_payload.get("account_type") != "admin":
        return jsonify({"success": False, "message": "Sessão administrativa de retorno não encontrada."}), 401
    response = make_response(jsonify({"success": True, "redirectUrl": "Admin.html"}))
    set_access_cookie(response, issue_token(admin_payload["sub"], "admin"), JWT_TTL)
    response.delete_cookie(ADMIN_RETURN_COOKIE_NAME, path="/", samesite="Strict")
    return response


@app.post("/logout")
def logout():
    response = make_response(jsonify({"success": True}))
    response.delete_cookie(JWT_COOKIE_NAME, path="/", samesite="Strict")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/", samesite="Strict")
    response.delete_cookie(ADMIN_RETURN_COOKIE_NAME, path="/", samesite="Strict")
    return response



@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_file(path):
    normalized_parts = path.replace("\\", "/").lower().split("/")
    extension = os.path.splitext(path)[1].lower()
    if path.startswith("api/") or "node_modules" in normalized_parts or extension in BLOCKED_PUBLIC_EXTENSIONS:
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
