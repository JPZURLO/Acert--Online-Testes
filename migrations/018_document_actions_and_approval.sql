-- Migration 018: Expansão de ações e aprovação de documentos do exame
-- Adiciona colunas de controle de ação do participante, obrigatoriedade,
-- bloqueio de início, aprovação de upload e prazo.
-- Compatível com registros existentes (valores padrão seguros).
-- Reversão: 018_document_actions_rollback.sql

-- 1. Novos campos de configuração em company_exam_documents
ALTER TABLE company_exam_documents
    -- Tipo de ação exigida do participante
    ADD COLUMN participant_action VARCHAR(32) NOT NULL DEFAULT 'view_only'
        COMMENT 'view_only|confirm_read|accept_electronic|download_sign_return|upload_only|informative'
        AFTER term_config_json,
    -- Documento obrigatório (o participante deve concluir a ação)
    ADD COLUMN mandatory BOOLEAN NOT NULL DEFAULT FALSE AFTER participant_action,
    -- Se TRUE, impede início da prova até que a ação seja concluída
    ADD COLUMN blocks_exam_start BOOLEAN NOT NULL DEFAULT FALSE AFTER mandatory,
    -- Se TRUE, arquivo enviado pelo participante aguarda aprovação da empresa
    ADD COLUMN requires_upload_approval BOOLEAN NOT NULL DEFAULT FALSE AFTER blocks_exam_start,
    -- Tipo de prazo: before_exam | specific_datetime | none
    ADD COLUMN deadline_type VARCHAR(24) NOT NULL DEFAULT 'none' AFTER requires_upload_approval,
    -- Prazo específico (usado quando deadline_type = 'specific_datetime')
    ADD COLUMN deadline_at DATETIME NULL AFTER deadline_type;

-- 2. Novos campos de rastreamento em exam_document_acceptances
ALTER TABLE exam_document_acceptances
    -- Tipo de ação registrada no momento do aceite/envio
    ADD COLUMN action_type VARCHAR(32) NULL AFTER status,
    -- ID do usuário da empresa que aprovou ou recusou (referência a empresas.id)
    ADD COLUMN reviewed_by BIGINT NULL AFTER action_type,
    -- Data/hora da análise
    ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by,
    -- Motivo da recusa (obrigatório quando status='recusado')
    ADD COLUMN rejection_reason TEXT NULL AFTER reviewed_at,
    -- Documento da versão aceita (para controle de versão futura)
    ADD COLUMN document_version VARCHAR(32) NULL AFTER rejection_reason;

-- 3. Índice para facilitar consultas de acompanhamento por empresa
ALTER TABLE exam_document_acceptances
    ADD INDEX idx_accept_reviewed (reviewed_by, reviewed_at),
    ADD INDEX idx_accept_doc_status (document_id, status);
