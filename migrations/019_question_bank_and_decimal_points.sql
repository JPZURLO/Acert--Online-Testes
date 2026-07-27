ALTER TABLE company_exams
    MODIFY total_points DECIMAL(8,2) NOT NULL DEFAULT 0;

ALTER TABLE company_results
    MODIFY max_score DECIMAL(8,2) NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS company_question_bank (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    title VARCHAR(180) NOT NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'single_choice',
    points DECIMAL(8,2) NOT NULL DEFAULT 0,
    question_json LONGTEXT NOT NULL,
    usage_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_question_bank_company_updated (company_id, updated_at),
    INDEX idx_question_bank_company_type (company_id, question_type),
    FULLTEXT KEY ft_question_bank_title (title, question_json)
);
