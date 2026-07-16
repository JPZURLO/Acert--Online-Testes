import hmac
import os

from flask import jsonify, request

from secure_app import *  # noqa: F401,F403


def protect_same_origin_writes():
    if request.method in {"GET", "HEAD", "OPTIONS"} or request.path in {"/login", "/login_empresa", "/login_admin", "/api/access-requests"}:
        return None
    if not request.cookies.get(JWT_COOKIE_NAME):
        return None
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
    header_token = request.headers.get("X-CSRF-Token", "")
    if cookie_token and header_token and hmac.compare_digest(cookie_token, header_token):
        return None
    origin = request.headers.get("Origin", "").rstrip("/")
    expected_origin = request.host_url.rstrip("/")
    if origin and hmac.compare_digest(origin, expected_origin):
        return None
    return jsonify({"success": False, "message": "Requisição de segurança inválida. Atualize a página e tente novamente."}), 403


app.before_request_funcs[None] = [
    callback
    for callback in app.before_request_funcs.get(None, [])
    if callback.__name__ != "protect_cookie_authenticated_writes"
]
app.before_request(protect_same_origin_writes)


if __name__ == "__main__":
    app.run(
        host=os.getenv("APP_HOST", "127.0.0.1"),
        port=int(os.getenv("APP_PORT", "5500")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
