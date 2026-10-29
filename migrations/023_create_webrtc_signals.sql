-- Migration 023: Tabela de sinalização WebRTC efêmera
-- Compatível com o ambiente local e produção. Reversão: 023_create_webrtc_signals_rollback.sql

CREATE TABLE IF NOT EXISTS webrtc_signals (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    attempt_id BIGINT NOT NULL,
    sender_role VARCHAR(16) NOT NULL,    -- 'candidate' | 'proctor'
    recipient_role VARCHAR(16) NOT NULL, -- 'proctor' | 'candidate'
    signal_type VARCHAR(16) NOT NULL,    -- 'offer' | 'answer' | 'ice_candidate'
    payload TEXT NOT NULL,               -- JSON payload (máx 64KB)
    consumed_at DATETIME NULL,           -- Timestamp em que o sinal foi entregue
    expires_at DATETIME NOT NULL,        -- Timestamp de expiração (TTL de 60s)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webrtc_signals_lookup (attempt_id, recipient_role, consumed_at, expires_at),
    INDEX idx_webrtc_signals_ttl (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
