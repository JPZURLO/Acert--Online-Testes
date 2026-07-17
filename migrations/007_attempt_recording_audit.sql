ALTER TABLE exam_attempts
    ADD COLUMN screen_checked BOOLEAN NOT NULL DEFAULT FALSE AFTER microphone_checked,
    ADD COLUMN recording_status VARCHAR(24) NOT NULL DEFAULT 'not_required' AFTER screen_checked;

CREATE TABLE IF NOT EXISTS attempt_recordings (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    storage_name VARCHAR(255) NULL,
    content_type VARCHAR(80) NOT NULL DEFAULT 'video/webm',
    size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
    chunk_count INT UNSIGNED NOT NULL DEFAULT 0,
    sha256 CHAR(64) NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attempt_recording (attempt_id),
    INDEX idx_recording_status (status)
);

CREATE TABLE IF NOT EXISTS attempt_recording_chunks (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    sequence_number INT UNSIGNED NOT NULL,
    storage_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(80) NOT NULL,
    size_bytes INT UNSIGNED NOT NULL,
    duration_ms INT UNSIGNED NOT NULL DEFAULT 5000,
    sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attempt_recording_chunk (attempt_id, sequence_number),
    INDEX idx_recording_chunk_attempt (attempt_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS attempt_audit_events (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'info',
    details_json TEXT NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attempt_audit_timeline (attempt_id, occurred_at),
    INDEX idx_attempt_audit_severity (attempt_id, severity)
);

UPDATE exam_attempts
SET recording_status = CASE WHEN consent_recording THEN 'pending' ELSE 'not_required' END;
