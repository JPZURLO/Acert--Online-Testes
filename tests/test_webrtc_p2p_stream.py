"""
test_webrtc_p2p_stream.py

Testes de contrato e integração para transmissão WebRTC P2P Candidato -> Proctor (ETAPA 7.2B).
Cobre:
- Reuso estrito do candidateState.recordingStream (zero novas chamadas getUserMedia/getDisplayMedia)
- Configuração STUN centralizada em window.ACERT_ICE_SERVERS
- Ciclo de vida de ofertas SDP, respostas e candidatos ICE
- Suporte a monitoramento ao vivo durante waiting_proctor e in_progress
- Gerenciamento de múltiplos peers por attemptId via Map proctorPeers
- Resiliência: falha/desconexão do WebRTC NÃO encerra a prova do candidato
- Preservação da gravação local, MediaRecorder e upload de fragmentos
"""

import unittest
from pathlib import Path


class TestWebRTCP2PStream(unittest.TestCase):

    def setUp(self):
        self.candidate_js = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        self.proctor_js = Path("front-end/js/company-operations.js").read_text(encoding="utf-8")
        self.monitor_html = Path("front-end/Monitoramento.html").read_text(encoding="utf-8")

    def test_centralized_ice_servers_configuration(self):
        self.assertIn("window.ACERT_ICE_SERVERS", self.candidate_js)
        self.assertIn("window.ACERT_ICE_SERVERS", self.proctor_js)
        self.assertIn("stun:stun.l.google.com:19302", self.candidate_js)
        self.assertIn("stun:stun.l.google.com:19302", self.proctor_js)

    def test_candidate_uses_existing_recording_stream_without_new_getusermedia(self):
        # Garante que initCandidateWebRTC reutiliza candidateState.recordingStream
        self.assertIn("candidateState.recordingStream", self.candidate_js)
        self.assertIn("pc.addTrack(track, candidateState.recordingStream)", self.candidate_js)
        # Confirma que initCandidateWebRTC verifica se o stream já existe e não faz novo getUserMedia
        self.assertIn("if (!candidateState.recordingStream || !candidateState.recordingStream.getTracks().length)", self.candidate_js)

    def test_candidate_prevents_duplicate_peers_and_duplicate_signaling_loops(self):
        self.assertIn("if (candidateState.peerConnection && candidateState.peerConnection.connectionState !== 'closed')", self.candidate_js)
        self.assertIn("if (candidateState.webrtcTimer) return;", self.candidate_js)

    def test_proctor_multi_peer_map_and_duplicate_prevention(self):
        self.assertIn("const proctorPeers = new Map()", self.proctor_js)
        self.assertIn("proctorPeers.get(attemptId)", self.proctor_js)
        self.assertIn("if (entry && entry.pc && entry.pc.connectionState !== 'closed')", self.proctor_js)

    def test_proctor_ui_elements_present_in_monitoramento_html(self):
        self.assertIn('id="live-stream-player"', self.monitor_html)
        self.assertIn('id="stream-status-badge"', self.monitor_html)
        self.assertIn('id="toggle-audio-button"', self.monitor_html)
        self.assertIn('id="live-stream-placeholder"', self.monitor_html)

    def test_proctor_autoplay_handling_and_audio_toggle(self):
        self.assertIn("bindAudioControls", self.proctor_js)
        self.assertIn("Ouvir candidato", self.proctor_js)
        self.assertIn("play().catch", self.proctor_js)

    def test_webrtc_disconnect_does_not_terminate_exam(self):
        # Confirma que falha no WebRTC do candidato apenas loga o aviso e NÃO executa terminateForSecurity
        start_idx = self.candidate_js.find("function initCandidateWebRTC")
        end_idx = self.candidate_js.find("function stopCandidateWebRTC")
        webrtc_code = self.candidate_js[start_idx:end_idx]
        self.assertNotIn("terminateForSecurity", webrtc_code)

    def test_stop_candidate_webrtc_does_not_stop_recording_tracks(self):
        start_idx = self.candidate_js.find("function stopCandidateWebRTC")
        stop_code = self.candidate_js[start_idx:start_idx+500]
        self.assertNotIn("track.stop()", stop_code)

    def test_recording_pipeline_remains_intact(self):
        self.assertIn("drawMonitoringFrame", self.candidate_js)
        self.assertIn("MediaRecorder", self.candidate_js)
        self.assertIn("queueRecordingChunk", self.candidate_js)
        self.assertIn("startProctoring", self.candidate_js)


if __name__ == "__main__":
    unittest.main()
