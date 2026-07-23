-- Migration 015: Agendamento de e-mail de acesso ao exame
-- Compatível com registros existentes. Reversão: 015_exam_email_schedule_rollback.sql

-- 1. Coluna de controle de envio em company_participants
--    invite_sent_at: data real do último e-mail de acesso enviado com sucesso
--    invite_failed_at: data do último erro
--    invite_error: mensagem do último erro (sem credenciais)
ALTER TABLE company_participants
    ADD COLUMN invite_sent_at DATETIME NULL AFTER invited_at,
    ADD COLUMN invite_failed_at DATETIME NULL AFTER invite_sent_at,
    ADD COLUMN invite_error VARCHAR(500) NULL AFTER invite_failed_at;

-- 2. Opção de envio de e-mail no exame
--    email_send_option: 'on_save' | 'scheduled' | 'manual' | 'none'
--    email_schedule_minutes_before: minutos antes do início para envio agendado
ALTER TABLE company_exams
    ADD COLUMN email_send_option VARCHAR(16) NOT NULL DEFAULT 'manual' AFTER show_answer_details,
    ADD COLUMN email_schedule_minutes_before INT UNSIGNED NULL AFTER email_send_option;

-- 3. Tabela de fila de e-mails de acesso ao exame
--    Usada para agendamento (opção B) e rastreamento de todos os envios
CREATE TABLE IF NOT EXISTS exam_email_queue (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    participant_id BIGINT NOT NULL,
    -- Opção escolhida no exame: 'on_save', 'scheduled', 'manual', 'resend'
    send_option VARCHAR(16) NOT NULL DEFAULT 'manual',
    -- Status: pending | processing | sent | failed | cancelled
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    -- Horário planejado para envio (em UTC)
    scheduled_for DATETIME NULL,
    -- Horário real em que o e-mail foi enviado
    sent_at DATETIME NULL,
    -- Última mensagem de erro (sem credenciais SMTP)
    last_error VARCHAR(500) NULL,
    -- Número de tentativas realizadas
    attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    -- Data de criação do registro
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Índices
    INDEX idx_email_queue_company (company_id),
    INDEX idx_email_queue_exam (exam_id),
    INDEX idx_email_queue_participant (participant_id),
    INDEX idx_email_queue_status_scheduled (status, scheduled_for),
    INDEX idx_email_queue_exam_participant (exam_id, participant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
