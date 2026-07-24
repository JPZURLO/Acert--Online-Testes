-- Migration 017: Expansão completa do módulo de exames e questões
-- Suporte a Documentos do Exame (Termos de Aceite), Importação de Provas (GIFT, DOCX, PDF, XLSX, CSV),
-- Seções da Prova, Paginação e Novos Tipos de Questão (binary_choice, fill_blank, múltiplos limites).
-- Reversão: 017_exam_documents_and_questions_expansion_rollback.sql

-- 1. Novas colunas de configuração de exibição e seções em company_exams
ALTER TABLE company_exams
    ADD COLUMN display_mode VARCHAR(24) NOT NULL DEFAULT 'all' AFTER manual_review_required,
    ADD COLUMN questions_per_page INT UNSIGNED NULL AFTER display_mode,
    ADD COLUMN allow_back_navigation BOOLEAN NOT NULL DEFAULT TRUE AFTER questions_per_page,
    ADD COLUMN allow_skip BOOLEAN NOT NULL DEFAULT TRUE AFTER allow_back_navigation,
    ADD COLUMN require_answer_before_next BOOLEAN NOT NULL DEFAULT FALSE AFTER allow_skip,
    ADD COLUMN show_navigator BOOLEAN NOT NULL DEFAULT TRUE AFTER require_answer_before_next,
    ADD COLUMN show_question_numbers BOOLEAN NOT NULL DEFAULT TRUE AFTER show_navigator,
    ADD COLUMN show_status_indicators BOOLEAN NOT NULL DEFAULT TRUE AFTER show_question_numbers,
    ADD COLUMN shuffle_options BOOLEAN NOT NULL DEFAULT FALSE AFTER show_status_indicators,
    ADD COLUMN preserve_grouped_questions BOOLEAN NOT NULL DEFAULT FALSE AFTER shuffle_options,
    ADD COLUMN autosave_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER preserve_grouped_questions,
    ADD COLUMN allow_review_before_submit BOOLEAN NOT NULL DEFAULT TRUE AFTER autosave_enabled,
    ADD COLUMN sections_json LONGTEXT NULL AFTER allow_review_before_submit;

-- 2. Tabela de documentos e termos anexados ao exame
CREATE TABLE IF NOT EXISTS company_exam_documents (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    -- doc_type: rules | general_instructions | terms | support_material | other
    doc_type VARCHAR(32) NOT NULL DEFAULT 'general_instructions',
    storage_name VARCHAR(180) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(80) NOT NULL,
    size_bytes INT UNSIGNED NOT NULL,
    download_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    require_read BOOLEAN NOT NULL DEFAULT FALSE,
    require_acceptance BOOLEAN NOT NULL DEFAULT FALSE,
    require_return_signed BOOLEAN NOT NULL DEFAULT FALSE,
    return_deadline DATETIME NULL,
    system_send_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT UNSIGNED NOT NULL DEFAULT 1,
    -- Configurações específicas de termos (checkbox, aceite digital, upload assinado, etc)
    term_config_json LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_doc_company_exam (company_id, exam_id),
    INDEX idx_doc_exam_type (exam_id, doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de rastreamento de downloads, aceites e termos assinados de participantes
CREATE TABLE IF NOT EXISTS exam_document_acceptances (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    participant_id BIGINT NOT NULL,
    attempt_id BIGINT NULL,
    document_id BIGINT NOT NULL,
    downloaded_at DATETIME NULL,
    accepted_at DATETIME NULL,
    ip_address VARCHAR(45) NULL,
    returned_storage_name VARCHAR(180) NULL,
    returned_original_name VARCHAR(255) NULL,
    returned_at DATETIME NULL,
    -- status: pendente | visualizado | baixado | aceito | enviado | aprovado | recusado
    status VARCHAR(24) NOT NULL DEFAULT 'pendente',
    reviewer_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_acceptance_participant_doc (participant_id, document_id),
    INDEX idx_accept_company_exam (company_id, exam_id),
    INDEX idx_accept_participant (participant_id),
    INDEX idx_accept_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de rascunhos de importação para a tela de revisão obrigatória
CREATE TABLE IF NOT EXISTS exam_import_drafts (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    exam_id BIGINT NULL,
    -- source_type: file_single | file_split | moodle_gift
    source_type VARCHAR(32) NOT NULL DEFAULT 'file_single',
    original_filename VARCHAR(255) NOT NULL,
    gabarito_filename VARCHAR(255) NULL,
    parsed_questions_json LONGTEXT NOT NULL,
    -- review_status: draft | reviewed | published
    review_status VARCHAR(24) NOT NULL DEFAULT 'draft',
    confidence_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    warnings_json LONGTEXT NULL,
    errors_json LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_draft_company (company_id),
    INDEX idx_draft_status (review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
