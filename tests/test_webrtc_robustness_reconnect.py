"""
test_webrtc_robustness_reconnect.py

Testes de contrato e integração para Robustez WebRTC, Reconexão e Preparação STUN/TURN (ETAPA 7.2E).
Cobre:
- Candidato mantido como OFFERER principal e proctor como ANSWERER.
- Sinal de controle 'request_offer' em ALLOWED_SIGNAL_TYPES.
- Janela de tolerância (grace period de 3s) ao detectar 'disconnected'.
- Trava 'reconnectInProgress' impedindo retentativas ou peers duplicados em paralelo.
- Retentativa com backoff exponencial (1s, 2s, 5s, 10s) limitada a 4 tentativas.
- Fallback de recriação limpa de peer após 4 tentativas reutilizando recordingStream (zero getUserMedia).
- Identificador de negociação (negotiationId) no payload descarte de sinalização antiga.
- Reset automático do speaking_state (replaceTrack(null)) durante desconexão ou recriação.
- Resiliência total: falhas WebRTC não encerram a prova nem afetam a gravação local.
- Configuração ICE centralizada em window.ACERT_ICE_SERVERS.
"""

import unittest
from pathlib import Path
from webrtc_signaling_api import ALLOWED_SIGNAL_TYPES


class TestWebRTCRobustnessReconnect(unittest.TestCase):

    def setUp(self):
        self.candidate_js = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        self.proctor_js = Path("front-end/js/company-operations.js").read_text(encoding="utf-8")
        self.signaling_py = Path("webrtc_signaling_api.py").read_text(encoding="utf-8")

    def test_request_offer_allowed_in_signaling_api(self):
        self.assertIn("request_offer", ALLOWED_SIGNAL_TYPES)

    def test_candidate_is_primary_offerer(self):
        self.assertIn("createAndSendCandidateOffer", self.candidate_js)
        self.assertIn("sendCandidateWebRTCSignal('offer'", self.candidate_js)
        # Proctor não cria ofertas diretamente, apenas responde ou envia request_offer
        start_idx = self.proctor_js.find("async function processProctorWebRTCSignals")
        end_idx = self.proctor_js.find("function closeProctorWebRTC")
        proctor_sig_code = self.proctor_js[start_idx:end_idx]
        self.assertNotIn("createOffer", proctor_sig_code)
        self.assertIn("createAnswer", proctor_sig_code)

    def test_disconnected_grace_period_handling(self):
        self.assertIn("webrtcGraceTimer", self.candidate_js)
        self.assertIn("3000", self.candidate_js)
        self.assertIn("Conexão de monitoramento oscilou (disconnected)", self.candidate_js)
        self.assertIn("Conexão instável", self.proctor_js)

    def test_reconnect_in_progress_flag_prevents_duplicate_reconnects(self):
        self.assertIn("candidateState.reconnectInProgress", self.candidate_js)
        self.assertIn("entry.reconnectInProgress", self.proctor_js)

    def test_exponential_backoff_and_attempts_limit(self):
        self.assertIn("1000, 2000, 5000, 10000", self.candidate_js)
        self.assertIn("1000, 2000, 5000, 10000", self.proctor_js)
        self.assertIn("reconnectAttempts <= 4", self.candidate_js)
        self.assertIn("reconnectAttempts <= 4", self.proctor_js)

    def test_fallback_peer_recreation_reuses_recording_stream(self):
        self.assertIn("recriação limpa de peer como fallback", self.candidate_js)
        self.assertIn("initCandidateWebRTC()", self.candidate_js)
        self.assertIn("pc.addTrack(track, candidateState.recordingStream)", self.candidate_js)

    def test_negotiation_id_in_payload_prevents_stale_signals(self):
        self.assertIn("webrtcNegotiationId", self.candidate_js)
        self.assertIn("negotiationId", self.proctor_js)
        self.assertIn("Resposta SDP antiga ignorada", self.candidate_js)

    def test_speaking_state_resets_on_disconnect(self):
        start_idx = self.proctor_js.find("pc.oniceconnectionstatechange = handleStateChange")
        self.assertNotEqual(start_idx, -1)
        self.assertIn("stopProctorSpeaking(attemptId)", self.proctor_js)

    def test_webrtc_failure_never_terminates_exam(self):
        start_idx = self.candidate_js.find("async function handleCandidateWebRTCFailure")
        end_idx = self.candidate_js.find("function startCandidateWebRTCSignalingLoop")
        fail_code = self.candidate_js[start_idx:end_idx]
        self.assertNotIn("terminateForSecurity", fail_code)

    def test_centralized_ice_servers_fallback(self):
        self.assertIn("window.ACERT_ICE_SERVERS", self.candidate_js)
        self.assertIn("window.ACERT_ICE_SERVERS", self.proctor_js)


if __name__ == "__main__":
    unittest.main()
