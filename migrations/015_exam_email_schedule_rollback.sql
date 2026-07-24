-- Rollback da Migration 015: Agendamento de e-mail de acesso ao exame
-- Execute este script para reverter completamente a migration 015.
-- AVISO: Remove a tabela exam_email_queue e todas as colunas adicionadas.

-- 1. Remove a tabela de fila de e-mails
DROP TABLE IF EXISTS exam_email_queue;

-- 2. Remove colunas de rastreamento de convite em company_participants
ALTER TABLE company_participants
    DROP COLUMN IF EXISTS invite_sent_at,
    DROP COLUMN IF EXISTS invite_failed_at,
    DROP COLUMN IF EXISTS invite_error;

-- 3. Remove colunas de opção de envio em company_exams
ALTER TABLE company_exams
    DROP COLUMN IF EXISTS email_send_option,
    DROP COLUMN IF EXISTS email_schedule_minutes_before;
