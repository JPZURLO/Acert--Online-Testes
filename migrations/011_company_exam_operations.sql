ALTER TABLE exam_attempts
    ADD COLUMN resume_code_hash VARCHAR(255) NULL AFTER resume_authorized,
    ADD COLUMN resume_code_expires_at DATETIME NULL AFTER resume_code_hash,
    ADD COLUMN resume_code_used_at DATETIME NULL AFTER resume_code_expires_at,
    ADD COLUMN paused_at DATETIME NULL AFTER resume_code_used_at,
    ADD COLUMN closed_by_company_at DATETIME NULL AFTER paused_at;

CREATE TABLE IF NOT EXISTS attempt_chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    sender_type VARCHAR(16) NOT NULL,
    sender_name VARCHAR(180) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    read_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attempt_chat_timeline (attempt_id, id),
    INDEX idx_attempt_chat_unread (attempt_id, sender_type, read_at)
);
