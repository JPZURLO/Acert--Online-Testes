-- Rollback da Migration 018: Expansão de ações e aprovação de documentos
-- Execute este script para reverter completamente a migration 018.

-- 1. Remove índices adicionados em exam_document_acceptances
ALTER TABLE exam_document_acceptances
    DROP INDEX IF EXISTS idx_accept_reviewed,
    DROP INDEX IF EXISTS idx_accept_doc_status;

-- 2. Remove colunas de rastreamento de exam_document_acceptances
ALTER TABLE exam_document_acceptances
    DROP COLUMN IF EXISTS action_type,
    DROP COLUMN IF EXISTS reviewed_by,
    DROP COLUMN IF EXISTS reviewed_at,
    DROP COLUMN IF EXISTS rejection_reason,
    DROP COLUMN IF EXISTS document_version;

-- 3. Remove colunas de configuração de company_exam_documents
ALTER TABLE company_exam_documents
    DROP COLUMN IF EXISTS participant_action,
    DROP COLUMN IF EXISTS mandatory,
    DROP COLUMN IF EXISTS blocks_exam_start,
    DROP COLUMN IF EXISTS requires_upload_approval,
    DROP COLUMN IF EXISTS deadline_type,
    DROP COLUMN IF EXISTS deadline_at;
