CREATE TABLE IF NOT EXISTS company_units (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    name VARCHAR(140) NOT NULL,
    responsible_name VARCHAR(140) NULL,
    email VARCHAR(254) NULL,
    logo_data MEDIUMTEXT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_unit_name (company_id, name),
    INDEX idx_company_unit_company_status (company_id, status),
    INDEX idx_company_unit_default (company_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO company_units (company_id, name, is_default, status)
SELECT e.id, e.RazaoSocial, TRUE, 'active'
FROM empresas e
LEFT JOIN company_units u ON u.company_id = e.id AND u.is_default = TRUE
WHERE u.id IS NULL;

ALTER TABLE company_exams
    ADD COLUMN unit_id BIGINT NULL AFTER company_id,
    ADD INDEX idx_exams_company_unit_status (company_id, unit_id, status),
    ADD INDEX idx_exams_company_unit_updated (company_id, unit_id, updated_at);

UPDATE company_exams e
JOIN company_units u ON u.company_id = e.company_id AND u.is_default = TRUE
SET e.unit_id = u.id
WHERE e.unit_id IS NULL;

ALTER TABLE company_participants
    ADD COLUMN unit_id BIGINT NULL AFTER company_id,
    ADD INDEX idx_participant_company_unit_status (company_id, unit_id, status),
    ADD INDEX idx_participant_company_unit_exam (company_id, unit_id, exam_id);

UPDATE company_participants p
JOIN company_units u ON u.company_id = p.company_id AND u.is_default = TRUE
SET p.unit_id = u.id
WHERE p.unit_id IS NULL;

ALTER TABLE company_results
    ADD COLUMN unit_id BIGINT NULL AFTER company_id,
    ADD INDEX idx_results_company_unit_completed (company_id, unit_id, completed_at);

UPDATE company_results r
JOIN company_units u ON u.company_id = r.company_id AND u.is_default = TRUE
SET r.unit_id = u.id
WHERE r.unit_id IS NULL;

ALTER TABLE company_question_bank
    ADD COLUMN unit_id BIGINT NULL AFTER company_id,
    ADD INDEX idx_question_bank_company_unit_updated (company_id, unit_id, updated_at);

UPDATE company_question_bank q
JOIN company_units u ON u.company_id = q.company_id AND u.is_default = TRUE
SET q.unit_id = u.id
WHERE q.unit_id IS NULL;
