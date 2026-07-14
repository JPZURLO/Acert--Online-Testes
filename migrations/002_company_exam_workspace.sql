CREATE TABLE IF NOT EXISTS company_brand_settings (
    company_id BIGINT NOT NULL PRIMARY KEY,
    logo_data MEDIUMTEXT NULL,
    primary_color CHAR(7) NOT NULL DEFAULT '#2563EB',
    accent_color CHAR(7) NOT NULL DEFAULT '#18A6C9',
    background_color CHAR(7) NOT NULL DEFAULT '#F4F7FB',
    font_family VARCHAR(32) NOT NULL DEFAULT 'Inter',
    border_radius VARCHAR(16) NOT NULL DEFAULT 'medium',
    candidate_instructions TEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_brand_company (company_id)
);

CREATE TABLE IF NOT EXISTS company_exams (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    total_points INT NOT NULL DEFAULT 0,
    passing_score INT NOT NULL DEFAULT 60,
    shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(16) NOT NULL DEFAULT 'draft',
    questions_json LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_exams_company_updated (company_id, updated_at),
    INDEX idx_exams_company_status (company_id, status)
);
