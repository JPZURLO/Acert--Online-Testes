ALTER TABLE license_plans
    ADD COLUMN recording_retention_days SMALLINT UNSIGNED NOT NULL DEFAULT 5 AFTER result_retention_months;

ALTER TABLE company_licenses
    ADD COLUMN recording_contact_email VARCHAR(254) NULL AFTER last_paid_at;

ALTER TABLE attempt_recordings
    ADD COLUMN available_until DATETIME NULL AFTER completed_at,
    ADD COLUMN delete_after DATETIME NULL AFTER available_until,
    ADD COLUMN downloaded_at DATETIME NULL AFTER delete_after,
    ADD COLUMN first_notice_sent_at DATETIME NULL AFTER downloaded_at,
    ADD COLUMN reminder_sent_at DATETIME NULL AFTER first_notice_sent_at,
    ADD COLUMN deleted_at DATETIME NULL AFTER reminder_sent_at,
    ADD COLUMN deletion_reason VARCHAR(120) NULL AFTER deleted_at,
    ADD COLUMN notification_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER deletion_reason,
    ADD COLUMN notification_error VARCHAR(500) NULL AFTER notification_attempts,
    ADD INDEX idx_recording_retention (status, available_until, delete_after);

UPDATE attempt_recordings r
JOIN exam_attempts a ON a.id = r.attempt_id
LEFT JOIN company_licenses l ON l.company_id = a.company_id
LEFT JOIN license_plans p ON p.id = l.plan_id
SET r.available_until = DATE_ADD(COALESCE(r.completed_at, NOW()), INTERVAL COALESCE(p.recording_retention_days, 5) DAY),
    r.delete_after = DATE_ADD(DATE_ADD(COALESCE(r.completed_at, NOW()), INTERVAL COALESCE(p.recording_retention_days, 5) DAY), INTERVAL 2 DAY)
WHERE r.status = 'completed' AND r.available_until IS NULL;