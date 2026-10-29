"""
test_webrtc_multi_candidate_grid.py

Testes de contrato e integração para a Sala de Monitoramento Multi-Candidato (ETAPA 7.2D).
Cobre:
- Grade responsiva de candidatos em Monitoramento.html (operations-cards-container).
- Reuso de RTCPeerConnection e remoteStream em proctorPeers por attemptId.
- Preservação do elemento <video> e srcObject durante atualização incremental por polling.
- Modal de visão ampliada que reutiliza o mesmo peer/stream sem gerar nova oferta SDP ou novo peer.
- Fechamento do modal preserva a conexão e o mini-player do card.
- Estado único de fala do proctor (currentSpeakingAttemptId).
- Filtros por nome, exame, filial, status e conexão ao vivo (live_only).
- Integridade total da gravação local do candidato.
"""

import unittest
from pathlib import Path


class TestWebRTCMultiCandidateGrid(unittest.TestCase):

    def setUp(self):
        self.candidate_js = Path("front-end/js/participant-application.js").read_text(encoding="utf-8")
        self.proctor_js = Path("front-end/js/company-operations.js").read_text(encoding="utf-8")
        self.monitor_html = Path("front-end/Monitoramento.html").read_text(encoding="utf-8")

    def test_monitoramento_html_contains_grid_and_modal_elements(self):
        self.assertIn('id="operations-cards-container"', self.monitor_html)
        self.assertIn('id="expanded-candidate-modal"', self.monitor_html)
        self.assertIn('id="modal-stream-player"', self.monitor_html)
        self.assertIn('id="view-mode-grid"', self.monitor_html)
        self.assertIn('id="view-mode-table"', self.monitor_html)
        self.assertIn('id="operation-filter-exam"', self.monitor_html)
        self.assertIn('id="operation-filter-unit"', self.monitor_html)
        self.assertIn('id="operation-filter-live"', self.monitor_html)

    def test_proctor_peers_map_stores_remote_stream(self):
        self.assertIn("const proctorPeers = new Map()", self.proctor_js)
        self.assertIn("remoteStream: null", self.proctor_js)
        self.assertIn("entry.remoteStream = event.streams[0]", self.proctor_js)

    def test_video_element_preserved_during_polling(self):
        # Verifica se renderOperationsGrid faz update incremental do card existente sem remover/substituir o card ou o video
        self.assertIn("document.getElementById(`candidate-card-${item.id}`)", self.proctor_js)
        self.assertIn("statusSpan.textContent = operationLabels[item.status]", self.proctor_js)
        self.assertIn("timeDd.textContent = operationRemaining", self.proctor_js)

    def test_expanded_modal_reuses_existing_stream_without_new_peer(self):
        # Verifica se openExpandedModal reutiliza proctorPeers.get(attemptId) sem chamar initProctorWebRTC
        start_idx = self.proctor_js.find("function openExpandedModal")
        end_idx = self.proctor_js.find("function closeExpandedModal")
        modal_code = self.proctor_js[start_idx:end_idx]

        self.assertIn("proctorPeers.get(attemptId)", modal_code)
        self.assertIn("attachStreamToPlayers(attemptId, entry.remoteStream)", modal_code)
        self.assertNotIn("new RTCPeerConnection", modal_code)
        self.assertNotIn("initProctorWebRTC", modal_code)
        self.assertNotIn("createOffer", modal_code)

    def test_close_expanded_modal_does_not_close_peer(self):
        start_idx = self.proctor_js.find("function closeExpandedModal")
        end_idx = self.proctor_js.find("function clearModalChat")
        close_code = self.proctor_js[start_idx:end_idx]

        self.assertNotIn("pc.close()", close_code)
        self.assertNotIn("proctorPeers.delete", close_code)
        self.assertNotIn("track.stop()", close_code)

    def test_single_speaking_state_source_of_truth(self):
        self.assertIn("let currentSpeakingAttemptId = null;", self.proctor_js)
        self.assertIn("updateProctorTalkButtonState", self.proctor_js)
        self.assertIn("toggleProctorSpeaking", self.proctor_js)
        self.assertIn("stopProctorSpeaking", self.proctor_js)

    def test_explicit_attempt_id_for_all_actions(self):
        self.assertIn("runAttemptActionForId(attemptId, action)", self.proctor_js)
        self.assertIn("card-auth-btn-", self.proctor_js)
        self.assertIn("card-pause-btn-", self.proctor_js)
        self.assertIn("card-resume-btn-", self.proctor_js)
        self.assertIn("card-close-btn-", self.proctor_js)

    def test_advanced_filters_implementation(self):
        self.assertIn("filteredOperations()", self.proctor_js)
        self.assertIn("operation-filter-exam", self.proctor_js)
        self.assertIn("operation-filter-unit", self.proctor_js)
        self.assertIn("operation-filter-live", self.proctor_js)

    def test_candidate_recording_pipeline_remains_intact(self):
        self.assertIn("drawMonitoringFrame", self.candidate_js)
        self.assertIn("MediaRecorder", self.candidate_js)
        self.assertIn("queueRecordingChunk", self.candidate_js)


if __name__ == "__main__":
    unittest.main()
