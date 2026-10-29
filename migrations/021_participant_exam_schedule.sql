ALTER TABLE company_participants
    ADD COLUMN scheduled_starts_at DATETIME NULL AFTER exam_id,
    ADD COLUMN scheduled_ends_at DATETIME NULL AFTER scheduled_starts_at,
    ADD INDEX idx_participant_company_schedule (company_id, scheduled_starts_at);

ALTER TABLE company_exams
    ADD COLUMN archived_at DATETIME NULL AFTER updated_at,
    ADD INDEX idx_exams_company_archived (company_id, archived_at);
