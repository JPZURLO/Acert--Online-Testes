CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admin_users_active (active)
);

CREATE TABLE IF NOT EXISTS access_requests (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    contact_name VARCHAR(160) NOT NULL,
    company_name VARCHAR(180) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    cnpj VARCHAR(24) NULL,
    plan_interest VARCHAR(80) NULL,
    needs TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_access_requests_status_created (status, created_at),
    INDEX idx_access_requests_email (email),
    INDEX idx_access_requests_cnpj (cnpj)
);

CREATE TABLE IF NOT EXISTS license_plans (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    max_exams INT NULL,
    max_participants_month INT NULL,
    max_admin_users INT NULL,
    result_retention_months INT NULL,
    features_json LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_license_plans_status (status)
);

CREATE TABLE IF NOT EXISTS company_licenses (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL UNIQUE,
    plan_id BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    starts_at DATE NULL,
    ends_at DATE NULL,
    max_exams_override INT NULL,
    max_participants_override INT NULL,
    features_override_json LONGTEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_licenses_status (status),
    INDEX idx_company_licenses_plan (plan_id),
    INDEX idx_company_licenses_ends (ends_at)
);

INSERT INTO license_plans
    (name, slug, description, status, max_exams, max_participants_month, max_admin_users, result_retention_months, features_json)
VALUES
    ('Essencial', 'essencial', 'Para empresas que estão iniciando com testes online.', 'active', 10, 250, 1, 12, '["exams","participants","results"]'),
    ('Profissional', 'profissional', 'Para operações recorrentes com personalização e importação.', 'active', 50, 1000, 5, 24, '["exams","excel_import","branding","participants","results","export_results"]'),
    ('Empresarial', 'empresarial', 'Para operações amplas com todos os recursos da plataforma.', 'active', NULL, NULL, NULL, NULL, '["exams","excel_import","branding","participants","results","export_results","api_access","priority_support"]')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description);
