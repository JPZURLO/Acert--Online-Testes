ALTER TABLE company_exams
    ADD COLUMN result_delivery VARCHAR(16) NOT NULL DEFAULT 'manual' AFTER status,
    ADD COLUMN available_from DATETIME NULL AFTER result_delivery,
    ADD COLUMN available_until DATETIME NULL AFTER available_from,
    ADD COLUMN require_identity BOOLEAN NOT NULL DEFAULT FALSE AFTER available_until,
    ADD COLUMN require_recording BOOLEAN NOT NULL DEFAULT FALSE AFTER require_identity,
    ADD COLUMN allow_resume BOOLEAN NOT NULL DEFAULT TRUE AFTER require_recording,
    ADD COLUMN show_answer_details BOOLEAN NOT NULL DEFAULT FALSE AFTER allow_resume;

CREATE TABLE IF NOT EXISTS exam_attempts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    participant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'not_started',
    identity_status VARCHAR(24) NOT NULL DEFAULT 'not_required',
    consent_recording BOOLEAN NOT NULL DEFAULT FALSE,
    camera_checked BOOLEAN NOT NULL DEFAULT FALSE,
    microphone_checked BOOLEAN NOT NULL DEFAULT FALSE,
    answers_json LONGTEXT NULL,
    objective_score DECIMAL(8,2) NOT NULL DEFAULT 0,
    manual_score DECIMAL(8,2) NOT NULL DEFAULT 0,
    final_score DECIMAL(8,2) NULL,
    review_status VARCHAR(24) NOT NULL DEFAULT 'not_required',
    resume_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    remaining_seconds INT UNSIGNED NULL,
    reviewer_notes TEXT NULL,
    started_at DATETIME NULL,
    submitted_at DATETIME NULL,
    reviewed_at DATETIME NULL,
    reviewed_by BIGINT NULL,
    expires_at DATETIME NULL,
    last_saved_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attempt_participant_exam (participant_id, exam_id),
    INDEX idx_attempt_company_status (company_id, status),
    INDEX idx_attempt_exam_status (exam_id, status),
    INDEX idx_attempt_user (user_id),
    INDEX idx_attempt_review (company_id, review_status)
);

CREATE TABLE IF NOT EXISTS attempt_identity_files (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    kind VARCHAR(16) NOT NULL,
    storage_name VARCHAR(180) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(80) NOT NULL,
    size_bytes INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attempt_identity_kind (attempt_id, kind),
    INDEX idx_identity_attempt (attempt_id)
);

ALTER TABLE company_results
    ADD COLUMN attempt_id BIGINT NULL AFTER id,
    ADD COLUMN result_status VARCHAR(24) NOT NULL DEFAULT 'review' AFTER competency_scores_json,
    ADD COLUMN release_status VARCHAR(24) NOT NULL DEFAULT 'pending' AFTER result_status,
    ADD COLUMN reviewer_notes TEXT NULL AFTER release_status,
    ADD UNIQUE KEY uq_company_result_attempt (attempt_id);


UPDATE company_results r JOIN company_exams e ON e.id = r.exam_id AND e.company_id = r.company_id
SET r.result_status = CASE WHEN r.score >= e.passing_score THEN 'approved' WHEN r.score >= GREATEST(0, e.passing_score - 10) THEN 'review' ELSE 'failed' END,
    r.release_status = 'released'
WHERE r.attempt_id IS NULL;

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id BIGINT NULL,
    details_json LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_audit_created (created_at),
    INDEX idx_admin_audit_entity (entity_type, entity_id)
);
