-- Migration 016: Reestruturação modular do módulo de questões
-- Compatível com questões e provas existentes. Reversão: 016_question_types_restructuring_rollback.sql

-- 1. Coluna de sinalização de necessidade de correção manual no exame
ALTER TABLE company_exams
    ADD COLUMN manual_review_required BOOLEAN NOT NULL DEFAULT FALSE AFTER show_answer_details;

-- 2. Tabela relacional indexada de questões dos exames
CREATE TABLE IF NOT EXISTS exam_question_items (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    question_identifier VARCHAR(80) NOT NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'single_choice',
    prompt TEXT NOT NULL,
    points INT UNSIGNED NOT NULL DEFAULT 10,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    min_characters INT UNSIGNED NULL,
    max_characters INT UNSIGNED NULL,
    manual_correction BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_question_exam_ident (exam_id, question_identifier),
    INDEX idx_question_company (company_id),
    INDEX idx_question_exam (exam_id),
    INDEX idx_question_type (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela relacional de alternativas individuais das questões
CREATE TABLE IF NOT EXISTS exam_question_options (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT NOT NULL,
    option_identifier VARCHAR(80) NOT NULL,
    option_text TEXT NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 1,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_option_question (question_id),
    INDEX idx_option_correct (question_id, is_correct)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de correções manuais individuais por questão
CREATE TABLE IF NOT EXISTS attempt_manual_corrections (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    attempt_id BIGINT NOT NULL,
    result_id BIGINT NULL,
    question_identifier VARCHAR(80) NOT NULL,
    question_type VARCHAR(32) NOT NULL DEFAULT 'long_answer',
    earned_score DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    max_score DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    feedback TEXT NULL,
    -- Status: automatico | aguardando_correcao | em_correcao | corrigido
    correction_status VARCHAR(24) NOT NULL DEFAULT 'aguardando_correcao',
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_manual_correction_attempt_question (attempt_id, question_identifier),
    INDEX idx_correction_company (company_id),
    INDEX idx_correction_attempt (attempt_id),
    INDEX idx_correction_status (correction_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
