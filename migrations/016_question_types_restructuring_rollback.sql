-- Rollback da Migration 016: Reestruturação modular do módulo de questões
-- Execute este script para reverter a migration 016.

DROP TABLE IF EXISTS attempt_manual_corrections;
DROP TABLE IF EXISTS exam_question_options;
DROP TABLE IF EXISTS exam_question_items;

ALTER TABLE company_exams
    DROP COLUMN IF EXISTS manual_review_required;
