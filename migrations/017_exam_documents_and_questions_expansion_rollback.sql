-- Rollback da Migration 017: Expansão de exames e questões
-- Execute este script para reverter a migration 017.

DROP TABLE IF EXISTS exam_import_drafts;
DROP TABLE IF EXISTS exam_document_acceptances;
DROP TABLE IF EXISTS company_exam_documents;

ALTER TABLE company_exams
    DROP COLUMN IF EXISTS display_mode,
    DROP COLUMN IF EXISTS questions_per_page,
    DROP COLUMN IF EXISTS allow_back_navigation,
    DROP COLUMN IF EXISTS allow_skip,
    DROP COLUMN IF EXISTS require_answer_before_next,
    DROP COLUMN IF EXISTS show_navigator,
    DROP COLUMN IF EXISTS show_question_numbers,
    DROP COLUMN IF EXISTS show_status_indicators,
    DROP COLUMN IF EXISTS shuffle_options,
    DROP COLUMN IF EXISTS preserve_grouped_questions,
    DROP COLUMN IF EXISTS autosave_enabled,
    DROP COLUMN IF EXISTS allow_review_before_submit,
    DROP COLUMN IF EXISTS sections_json;
