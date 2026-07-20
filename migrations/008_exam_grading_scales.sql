ALTER TABLE company_exams
    ADD COLUMN grading_scale_json LONGTEXT NULL AFTER passing_score;

UPDATE company_exams
SET grading_scale_json = '{"type":"numeric","maximum":100,"decimals":0}'
WHERE grading_scale_json IS NULL OR grading_scale_json = '';
