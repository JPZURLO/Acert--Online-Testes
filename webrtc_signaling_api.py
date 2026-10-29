"""
webrtc_signaling_api.py

Infraestrutura de Sinalização WebRTC via HTTP REST.
Permite a troca de mensagens de sinalização (offer, answer, ice_candidate)
entre participante (candidato) e monitoramento (proctor).

Requisitos de Segurança:
- Nenhuma role ou company_id é aceita a partir do cliente em texto livre.
- Roles (sender_role, recipient_role), company_id e exam_id são obrigatoriamente
  derivados da sessão/token JWT e da tentativa validada no banco de dados.
- Isolamento multi-tenant estrito (Empresa A jamais acessa tentativa da Empresa B).
- Consumo atômico das mensagens (SELECT ... FOR UPDATE + UPDATE consumed_at)
  garantindo entrega única e compatibilidade total com múltiplos workers Passenger.
"""

import json
import random
from flask import Blueprint, jsonify, request


ALLOWED_SIGNAL_TYPES = {"offer", "answer", "ice_candidate", "speaking_state", "request_offer"}
MAX_PAYLOAD_BYTES = 65536  # 64 KB


def parse_json_payload(raw_value):
    if raw_value is None:
        return None
    if isinstance(raw_value, (dict, list)):
        return raw_value
    if isinstance(raw_value, str):
        try:
            return json.loads(raw_value)
        except json.JSONDecodeError:
            return raw_value
    return None


def create_webrtc_signaling_blueprint(open_database, token_payload):
    blueprint = Blueprint("webrtc_signaling", __name__)

    def authenticate_user():
        """
        Determina se quem chama é 'proctor' (account_type='company') ou 'candidate' (account_type='user').
        Retorna (role, payload_or_id, error_response).
        """
        # Tenta autenticar como empresa (proctor)
        payload_company, error_company = token_payload("company")
        if not error_company and payload_company:
            try:
                company_id = int(payload_company["sub"])
                return "proctor", company_id, None
            except (KeyError, ValueError, TypeError):
                pass

        # Tenta autenticar como participante (candidate)
        payload_user, error_user = token_payload("user")
        if not error_user and payload_user:
            try:
                user_id = int(payload_user["sub"])
                return "candidate", user_id, None
            except (KeyError, ValueError, TypeError):
                pass

        return None, None, (jsonify({"success": False, "message": "Token de acesso não fornecido ou inválido."}), 401)

    def validate_attempt_for_role(cursor, role, entity_id, attempt_id):
        """
        Valida se o attempt_id pertence à entidade (company_id para proctor, user_id para candidate).
        Retorna (attempt_dict, error_response).
        """
        if role == "proctor":
            cursor.execute(
                "SELECT a.id AS attempt_id, a.company_id, a.exam_id, a.participant_id, a.status "
                "FROM exam_attempts a "
                "WHERE a.id = %s AND a.company_id = %s",
                (attempt_id, entity_id),
            )
            row = cursor.fetchone()
            if not row:
                return None, (jsonify({"success": False, "message": "Tentativa não encontrada ou não pertence à sua empresa."}), 404)
            return row, None

        elif role == "candidate":
            cursor.execute(
                "SELECT a.id AS attempt_id, a.company_id, a.exam_id, a.participant_id, a.status "
                "FROM users u "
                "JOIN company_participants p ON LOWER(p.email) = LOWER(u.email) "
                "JOIN exam_attempts a ON a.participant_id = p.id "
                "WHERE u.id = %s AND a.id = %s",
                (entity_id, attempt_id),
            )
            row = cursor.fetchone()
            if not row:
                return None, (jsonify({"success": False, "message": "Tentativa não encontrada ou não autorizada para seu usuário."}), 404)
            return row, None

        return None, (jsonify({"success": False, "message": "Papel de usuário inválido."}), 403)

    def opportunistic_ttl_cleanup(cursor):
        """
        Executa limpeza oportunística de sinais expirados com baixa frequência
        para evitar custo de DELETE pesado em cada requisição de sinalização.
        """
        if random.random() < 0.05:  # 5% de chance
            try:
                cursor.execute(
                    "DELETE FROM webrtc_signals WHERE expires_at <= NOW() OR consumed_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE) LIMIT 50"
                )
            except Exception:
                pass

    @blueprint.route("/api/webrtc/signal", methods=["POST"])
    def send_signal():
        role, entity_id, auth_error = authenticate_user()
        if auth_error:
            return auth_error

        data = request.get_json(silent=True) or {}
        try:
            attempt_id = int(data.get("attemptId") or 0)
        except (ValueError, TypeError):
            attempt_id = 0

        if attempt_id <= 0:
            return jsonify({"success": False, "message": "attemptId é obrigatório e deve ser numérico."}), 400

        signal_type = str(data.get("signalType") or "").strip().lower()
        if signal_type not in ALLOWED_SIGNAL_TYPES:
            return jsonify({"success": False, "message": f"signalType inválido. Permitidos: {', '.join(sorted(ALLOWED_SIGNAL_TYPES))}"}), 400

        raw_payload = data.get("payload")
        if raw_payload is None or raw_payload == "":
            return jsonify({"success": False, "message": "payload é obrigatório."}), 400

        if isinstance(raw_payload, (dict, list)):
            payload_str = json.dumps(raw_payload)
        elif isinstance(raw_payload, str):
            try:
                json.loads(raw_payload)
                payload_str = raw_payload
            except json.JSONDecodeError:
                return jsonify({"success": False, "message": "payload string deve conter um JSON válido."}), 400
        else:
            return jsonify({"success": False, "message": "Formato de payload inválido."}), 400

        if len(payload_str.encode("utf-8")) > MAX_PAYLOAD_BYTES:
            return jsonify({"success": False, "message": "Payload excede o tamanho máximo permitido de 64KB."}), 400

        # Derivação de papéis pelo backend (NÃO vem do cliente)
        sender_role = role
        recipient_role = "proctor" if role == "candidate" else "candidate"

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            attempt, attempt_error = validate_attempt_for_role(cursor, role, entity_id, attempt_id)
            if attempt_error:
                return attempt_error

            company_id = attempt["company_id"]
            exam_id = attempt["exam_id"]

            cursor.execute(
                "INSERT INTO webrtc_signals "
                "(company_id, exam_id, attempt_id, sender_role, recipient_role, signal_type, payload, expires_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, DATE_ADD(NOW(), INTERVAL 60 SECOND))",
                (company_id, exam_id, attempt_id, sender_role, recipient_role, signal_type, payload_str),
            )
            inserted_id = cursor.lastrowid

            opportunistic_ttl_cleanup(cursor)

            connection.commit()
            return jsonify({"success": True, "signalId": inserted_id, "message": "Sinal enviado com sucesso."}), 201
        except Exception as exc:
            connection.rollback()
            return jsonify({"success": False, "message": "Erro interno ao processar o sinal."}), 500
        finally:
            cursor.close()
            connection.close()

    @blueprint.route("/api/webrtc/signals", methods=["GET"])
    def get_signals():
        role, entity_id, auth_error = authenticate_user()
        if auth_error:
            return auth_error

        try:
            attempt_id = int(request.args.get("attemptId") or 0)
        except (ValueError, TypeError):
            attempt_id = 0

        if attempt_id <= 0:
            return jsonify({"success": False, "message": "attemptId é obrigatório na consulta."}), 400

        try:
            last_id = int(request.args.get("lastId") or 0)
        except (ValueError, TypeError):
            last_id = 0

        recipient_role = role  # O destinatário do sinal a ser buscado é o próprio chamador autenticado

        connection = open_database()
        cursor = connection.cursor(dictionary=True)
        try:
            attempt, attempt_error = validate_attempt_for_role(cursor, role, entity_id, attempt_id)
            if attempt_error:
                return attempt_error

            # Transação atômica com trava de linha (FOR UPDATE)
            connection.start_transaction()
            cursor.execute(
                "SELECT id, attempt_id, sender_role, signal_type, payload, created_at "
                "FROM webrtc_signals "
                "WHERE attempt_id = %s AND recipient_role = %s AND consumed_at IS NULL AND expires_at > NOW() AND id > %s "
                "ORDER BY id ASC LIMIT 50 FOR UPDATE",
                (attempt_id, recipient_role, last_id),
            )
            rows = cursor.fetchall() or []

            signals = []
            signal_ids = []
            for r in rows:
                signal_ids.append(r["id"])
                signals.append({
                    "id": r["id"],
                    "attemptId": r["attempt_id"],
                    "senderRole": r["sender_role"],
                    "signalType": r["signal_type"],
                    "payload": parse_json_payload(r["payload"]),
                    "createdAt": r["created_at"].isoformat() if r.get("created_at") else None,
                })

            if signal_ids:
                format_strings = ",".join(["%s"] * len(signal_ids))
                cursor.execute(
                    f"UPDATE webrtc_signals SET consumed_at = NOW() WHERE id IN ({format_strings})",
                    tuple(signal_ids),
                )

            connection.commit()
            return jsonify({"success": True, "signals": signals, "count": len(signals)})
        except Exception as exc:
            connection.rollback()
            return jsonify({"success": False, "message": "Erro interno ao consultar sinais."}), 500
        finally:
            cursor.close()
            connection.close()

    return blueprint
