"""
test_webrtc_bidirectional_audio.py

Testes de contrato e integração para comunicação de áudio bidirecional Proctor -> Candidato (ETAPA 7.2C).
Cobre:
- Captura exclusiva de áudio do proctor: getUserMedia({ audio: true, video: false }) sem câmera.
- Reuso de stream/track do microfone do proctor entre diferentes candidatos.
- Transmissão seletiva 1-para-1 usando replaceTrack(proctorAudioTrack) / replaceTrack(null).
- Alternância de candidato (João -> Maria): desativa João antes de ativar Maria.
- Transceiver único de áudio ('sendrecv') criado uma única vez por RTCPeerConnection.
- Sinalização REST 'speaking_state' em ALLOWED_SIGNAL_TYPES.
- Elementos DOM no candidato (proctor-audio-player, proctor-speaking-indicator, proctor-audio-notice).
- Resiliência: recusa do microfone do proctor ou oscilação WebRTC não afeta a prova ou a gravação local.
"""

import unittest
from pathlib import Path
from webrtc_signaling_api import ALLOWED_SIGNAL_TYPES


class TestWebRTCBidirectionalAudio(unittest.TestCase):

    def setUp(self):
        self.candidate_js = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        self.proctor_js = Path("front-end/js/company-operations.js").read_text(encoding="utf-8")
        self.participant_html = Path("front-end/AreaParticipante.html").read_text(encoding="utf-8")
        self.monitor_html = Path("front-end/Monitoramento.html").read_text(encoding="utf-8")

    def test_allowed_signal_types_includes_speaking_state(self):
        self.assertIn("speaking_state", ALLOWED_SIGNAL_TYPES)

    def test_proctor_mic_request_audio_only_no_video(self):
        self.assertIn("navigator.mediaDevices.getUserMedia({ audio: true, video: false })", self.proctor_js)
        self.assertNotIn("getUserMedia({ audio: true, video: true })", self.proctor_js)

    def test_proctor_mic_reused_single_stream(self):
        self.assertIn("let proctorAudioStream = null;", self.proctor_js)
        self.assertIn("let proctorAudioTrack = null;", self.proctor_js)
        self.assertIn("getProctorAudioTrack", self.proctor_js)

    def test_single_audio_transceiver_per_peer(self):
        self.assertIn("pc.addTransceiver('audio', { direction: 'sendrecv' })", self.proctor_js)
        self.assertIn("proctorAudioSender: audioTransceiver.sender", self.proctor_js)

    def test_zero_sdp_renegotiation_audio_switching(self):
        self.assertIn("entry.proctorAudioSender.replaceTrack(track)", self.proctor_js)
        self.assertIn("entry.proctorAudioSender.replaceTrack(null)", self.proctor_js)

    def test_proctor_selective_one_to_one_candidate_switch(self):
        self.assertIn("toggleProctorSpeaking", self.proctor_js)
        self.assertIn("stopProctorSpeaking", self.proctor_js)
        self.assertIn("currentSpeakingAttemptId", self.proctor_js)

    def test_proctor_speaking_state_signaling(self):
        self.assertIn("sendProctorWebRTCSignal(attemptId, 'speaking_state', { speaking: true })", self.proctor_js)
        self.assertIn("sendProctorWebRTCSignal(attemptId, 'speaking_state', { speaking: false })", self.proctor_js)

    def test_proctor_ui_talk_button_in_monitoramento(self):
        self.assertIn('id="proctor-talk-button"', self.monitor_html)
        self.assertIn("Falar com candidato", self.monitor_html)

    def test_candidate_ui_audio_elements_in_area_participante(self):
        self.assertIn('id="proctor-audio-player"', self.participant_html)
        self.assertIn('id="proctor-speaking-indicator"', self.participant_html)
        self.assertIn('id="proctor-audio-notice"', self.participant_html)

    def test_candidate_ontrack_and_speaking_state_handling(self):
        self.assertIn("proctor-audio-player", self.candidate_js)
        self.assertIn("proctor-speaking-indicator", self.candidate_js)
        self.assertIn("sig.signalType === 'speaking_state'", self.candidate_js)

    def test_mic_denial_does_not_affect_exam(self):
        # Falha ou erro no microfone do proctor deve exibir toast/log sem quebrar nada
        self.assertIn("operationToast(error.message || 'Erro ao acessar o microfone do proctor.', 'error')", self.proctor_js)
        # Nenhuma referência a cancelamento de prova do candidato no código do proctor
        start_idx = self.proctor_js.find("async function toggleProctorSpeaking")
        end_idx = self.proctor_js.find("async function initProctorWebRTC")
        talking_code = self.proctor_js[start_idx:end_idx]
        self.assertNotIn("terminateForSecurity", talking_code)
        self.assertNotIn("cancelAttempt", talking_code)

    def test_candidate_recording_pipeline_remains_untouched(self):
        start_idx = self.candidate_js.find("function initCandidateWebRTC")
        candidate_webrtc_code = self.candidate_js[start_idx:]
        self.assertNotIn("recordingStream.stop", candidate_webrtc_code)
        self.assertNotIn("MediaRecorder.stop", candidate_webrtc_code)


if __name__ == "__main__":
    unittest.main()
