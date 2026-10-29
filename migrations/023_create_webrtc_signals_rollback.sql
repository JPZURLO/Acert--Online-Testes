-- Rollback da Migration 023: Tabela de sinalização WebRTC efêmera
-- Reverte a criação da tabela de sinalização WebRTC.

DROP TABLE IF EXISTS webrtc_signals;
