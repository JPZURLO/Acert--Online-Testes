"""
test_webrtc_signaling.py

Testes automatizados para a infraestrutura de sinalização WebRTC via REST (ETAPA 7.2A).
Cobre:
- Troca de mensagens entre candidato e proctor
- Derivação estrita de papéis e IDs pelo backend (sem falsificação de cliente)
- Defesa multi-tenant (bloqueio cross-company e cross-participant)
- Rejeição de tipos e payloads inválidos ou maiores que 64KB
- Consumo atômico e não-duplicação de entrega
- Expiração de TTL e limpeza
- Preservação da integridade da gravação e sala de espera
"""

import json
import unittest
from pathlib import Path
from datetime import datetime, timedelta
from flask import Flask, jsonify
from webrtc_signaling_api import create_webrtc_signaling_blueprint, ALLOWED_SIGNAL_TYPES


class TestWebRTCSignaling(unittest.TestCase):

    def setUp(self):
        # In-memory mock database simulation for WebRTC signals table & relational checks
        self.db_signals = []
        self.next_signal_id = 1

        self.mock_attempts = {
            10: {"id": 10, "company_id": 100, "exam_id": 1, "participant_id": 50, "user_id": 200, "status": "in_progress"},
            11: {"id": 11, "company_id": 101, "exam_id": 2, "participant_id": 51, "user_id": 201, "status": "in_progress"},  # Outra empresa
        }
        self.mock_users = {
            200: {"id": 200, "email": "candidato1@empresa100.com"},
            201: {"id": 201, "email": "candidato2@empresa101.com"},
        }

    def create_test_app(self, current_account_type="user", current_sub="200"):
        app = Flask(__name__)

        def mock_token(kind):
            if kind == current_account_type:
                return {"sub": str(current_sub), "account_type": kind}, None
            return None, (jsonify({"success": False, "message": "Token não fornecido."}), 401)

        test_case = self

        def mock_open_db():
            class DummyCursor:
                def __init__(self):
                    self.sql = ""
                    self.params = ()
                    self.lastrowid = None

                def execute(self, sql, params=()):
                    self.sql = sql
                    self.params = params

                    if "UPDATE webrtc_signals SET consumed_at = NOW()" in sql:
                        now = datetime.now()
                        for s in test_case.db_signals:
                            if s["id"] in params:
                                s["consumed_at"] = now

                    if "INSERT INTO webrtc_signals" in sql:
                        test_case.next_signal_id += 1
                        sig_id = test_case.next_signal_id
                        self.lastrowid = sig_id
                        # Parsed values from tuple
                        comp_id, ex_id, att_id, send_role, recip_role, sig_type, payload_str = params[:7]
                        now = datetime.now()
                        test_case.db_signals.append({
                            "id": sig_id,
                            "company_id": comp_id,
                            "exam_id": ex_id,
                            "attempt_id": att_id,
                            "sender_role": send_role,
                            "recipient_role": recip_role,
                            "signal_type": sig_type,
                            "payload": payload_str,
                            "consumed_at": None,
                            "expires_at": now + timedelta(seconds=60),
                            "created_at": now,
                        })

                def fetchone(self):
                    sql = self.sql
                    params = self.params
                    if "WHERE a.id = %s AND a.company_id = %s" in sql:
                        att_id, comp_id = params
                        att = test_case.mock_attempts.get(att_id)
                        if att and att["company_id"] == comp_id:
                            return att
                        return None

                    if "WHERE u.id = %s AND a.id = %s" in sql:
                        usr_id, att_id = params
                        att = test_case.mock_attempts.get(att_id)
                        if att and att["user_id"] == usr_id:
                            return att
                        return None

                    return None

                def fetchall(self):
                    sql = self.sql
                    params = self.params
                    if "FROM webrtc_signals" in sql:
                        att_id, recip_role, last_id = params[0], params[1], params[2]
                        now = datetime.now()
                        matching = []
                        for s in test_case.db_signals:
                            if (s["attempt_id"] == att_id and
                                s["recipient_role"] == recip_role and
                                s["consumed_at"] is None and
                                s["expires_at"] > now and
                                s["id"] > last_id):
                                matching.append(s)
                        return matching
                    return []

                def close(self):
                    pass

            class DummyConn:
                def cursor(self, dictionary=False):
                    return DummyCursor()
                def start_transaction(self):
                    pass
                def commit(self):
                    pass
                def rollback(self):
                    pass
                def close(self):
                    pass

            return DummyConn()

        app.register_blueprint(create_webrtc_signaling_blueprint(mock_open_db, mock_token))
        return app.test_client()

    def test_candidate_sends_valid_signal(self):
        client = self.create_test_app(current_account_type="user", current_sub="200")
        res = client.post("/api/webrtc/signal", json={
            "attemptId": 10,
            "signalType": "offer",
            "payload": {"sdp": "v=0\r\no=- 123456...", "type": "offer"}
        })
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("signalId", data)
        self.assertEqual(len(self.db_signals), 1)
        inserted = self.db_signals[0]
        self.assertEqual(inserted["attempt_id"], 10)
        self.assertEqual(inserted["sender_role"], "candidate")
        self.assertEqual(inserted["recipient_role"], "proctor")
        self.assertEqual(inserted["company_id"], 100)
        self.assertEqual(inserted["exam_id"], 1)

    def test_proctor_polls_and_consumes_signal(self):
        # 1. Candidato envia sinal
        cand_client = self.create_test_app(current_account_type="user", current_sub="200")
        cand_client.post("/api/webrtc/signal", json={
            "attemptId": 10,
            "signalType": "offer",
            "payload": {"sdp": "candidate_offer_sdp"}
        })

        # 2. Proctor da empresa 100 busca sinais
        proctor_client = self.create_test_app(current_account_type="company", current_sub="100")
        res = proctor_client.get("/api/webrtc/signals?attemptId=10")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["signals"][0]["signalType"], "offer")
        self.assertEqual(data["signals"][0]["senderRole"], "candidate")
        self.assertEqual(data["signals"][0]["payload"], {"sdp": "candidate_offer_sdp"})

        # 3. Próxima busca não deve retornar a mesma mensagem (entrega única)
        res_empty = proctor_client.get("/api/webrtc/signals?attemptId=10")
        self.assertEqual(res_empty.status_code, 200)
        self.assertEqual(res_empty.get_json()["count"], 0)

    def test_proctor_sends_answer_and_candidate_receives(self):
        # 1. Proctor envia resposta
        proctor_client = self.create_test_app(current_account_type="company", current_sub="100")
        res_post = proctor_client.post("/api/webrtc/signal", json={
            "attemptId": 10,
            "signalType": "answer",
            "payload": {"sdp": "proctor_answer_sdp"}
        })
        self.assertEqual(res_post.status_code, 201)

        # 2. Candidato consulta sinais
        cand_client = self.create_test_app(current_account_type="user", current_sub="200")
        res_get = cand_client.get("/api/webrtc/signals?attemptId=10")
        self.assertEqual(res_get.status_code, 200)
        data = res_get.get_json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["signals"][0]["signalType"], "answer")
        self.assertEqual(data["signals"][0]["senderRole"], "proctor")

    def test_cross_company_access_is_blocked(self):
        # Proctor da Empresa 100 tenta enviar/consultar sinais da tentativa 11 (que pertence à Empresa 101)
        proctor_100_client = self.create_test_app(current_account_type="company", current_sub="100")

        # Tentativa de POST em attempt de outra empresa
        res_post = proctor_100_client.post("/api/webrtc/signal", json={
            "attemptId": 11,
            "signalType": "offer",
            "payload": {"sdp": "malicious"}
        })
        self.assertEqual(res_post.status_code, 404)

        # Tentativa de GET em attempt de outra empresa
        res_get = proctor_100_client.get("/api/webrtc/signals?attemptId=11")
        self.assertEqual(res_get.status_code, 404)

    def test_cross_participant_access_is_blocked(self):
        # Candidato 200 tenta acessar a tentativa 11 (que pertence ao Candidato 201)
        cand_200_client = self.create_test_app(current_account_type="user", current_sub="200")

        res_post = cand_200_client.post("/api/webrtc/signal", json={
            "attemptId": 11,
            "signalType": "offer",
            "payload": {"sdp": "unauthorized"}
        })
        self.assertEqual(res_post.status_code, 404)

        res_get = cand_200_client.get("/api/webrtc/signals?attemptId=11")
        self.assertEqual(res_get.status_code, 404)

    def test_invalid_signal_type_rejected(self):
        client = self.create_test_app(current_account_type="user", current_sub="200")
        res = client.post("/api/webrtc/signal", json={
            "attemptId": 10,
            "signalType": "malicious_command",
            "payload": {"test": "123"}
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("signalType inválido", res.get_json()["message"])

    def test_payload_exceeding_max_size_rejected(self):
        client = self.create_test_app(current_account_type="user", current_sub="200")
        huge_payload = {"data": "X" * 70000}  # > 64KB
        res = client.post("/api/webrtc/signal", json={
            "attemptId": 10,
            "signalType": "offer",
            "payload": huge_payload
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("excede o tamanho máximo", res.get_json()["message"])

    def test_expired_signals_are_never_returned(self):
        now = datetime.now()
        # Adiciona sinal expirado no passado na "tabela"
        self.db_signals.append({
            "id": 99,
            "company_id": 100,
            "exam_id": 1,
            "attempt_id": 10,
            "sender_role": "proctor",
            "recipient_role": "candidate",
            "signal_type": "offer",
            "payload": '{"sdp":"expired"}',
            "consumed_at": None,
            "expires_at": now - timedelta(seconds=10),
            "created_at": now - timedelta(seconds=70),
        })

        cand_client = self.create_test_app(current_account_type="user", current_sub="200")
        res = cand_client.get("/api/webrtc/signals?attemptId=10")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["count"], 0)

    def test_client_cannot_spoof_roles_or_company_ids(self):
        # Candidato tenta enviar payload malicioso tentando forçar role "proctor" e company_id 999 no corpo JSON
        cand_client = self.create_test_app(current_account_type="user", current_sub="200")
        res = cand_client.post("/api/webrtc/signal", json={
            "attemptId": 10,
            "signalType": "offer",
            "payload": {"sdp": "test"},
            "senderRole": "proctor",       # Tentativa de spoofing
            "recipientRole": "candidate",  # Tentativa de spoofing
            "companyId": 999               # Tentativa de spoofing
        })
        self.assertEqual(res.status_code, 201)
        inserted = self.db_signals[0]
        # Confirma que o backend IGNOROU os parâmetros do cliente e derivou corretamente
        self.assertEqual(inserted["sender_role"], "candidate")
        self.assertEqual(inserted["recipient_role"], "proctor")
        self.assertEqual(inserted["company_id"], 100)

    def test_front_end_signaling_helpers_contract(self):
        cand_js = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        proctor_js = Path("front-end/js/company-operations.js").read_text(encoding="utf-8")

        self.assertIn("sendCandidateWebRTCSignal", cand_js)
        self.assertIn("pollCandidateWebRTCSignals", cand_js)
        self.assertIn("sendProctorWebRTCSignal", proctor_js)
        self.assertIn("pollProctorWebRTCSignals", proctor_js)
        self.assertIn("/api/webrtc/signal", cand_js)
        self.assertIn("/api/webrtc/signals", cand_js)

    def test_recording_and_waiting_room_pipeline_remains_intact(self):
        cand_js = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        self.assertIn("candidateState.recordingStream", cand_js)
        self.assertIn("candidateState.recordingCanvas", cand_js)
        self.assertIn("MediaRecorder", cand_js)
        self.assertIn("drawMonitoringFrame", cand_js)
        self.assertIn("waiting_proctor", cand_js)


if __name__ == "__main__":
    unittest.main()
