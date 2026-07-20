ALTER TABLE license_plans
    ADD COLUMN monthly_price DECIMAL(12,2) NULL AFTER description;

ALTER TABLE company_licenses
    ADD COLUMN monthly_value DECIMAL(12,2) NULL AFTER plan_id,
    ADD COLUMN billing_due_day TINYINT NOT NULL DEFAULT 10 AFTER monthly_value,
    ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER billing_due_day,
    ADD COLUMN next_due_at DATE NULL AFTER payment_status,
    ADD COLUMN last_paid_at DATE NULL AFTER next_due_at;

CREATE TABLE IF NOT EXISTS support_tickets (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    protocol VARCHAR(24) NOT NULL UNIQUE,
    company_id BIGINT NOT NULL,
    requester_name VARCHAR(160) NULL,
    requester_email VARCHAR(254) NULL,
    subject VARCHAR(180) NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'help',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(24) NOT NULL DEFAULT 'new',
    assigned_admin_id BIGINT NULL,
    sla_due_at DATETIME NULL,
    resolved_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_support_company (company_id, updated_at),
    INDEX idx_support_status_priority (status, priority),
    INDEX idx_support_sla (sla_due_at)
);

CREATE TABLE IF NOT EXISTS support_messages (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    author_type VARCHAR(20) NOT NULL,
    author_name VARCHAR(160) NULL,
    admin_id BIGINT NULL,
    message TEXT NOT NULL,
    attachment_name VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_support_messages_ticket (ticket_id, created_at)
);

CREATE TABLE IF NOT EXISTS financial_payments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    license_id BIGINT NOT NULL,
    competence DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    paid_at DATE NOT NULL,
    payment_method VARCHAR(40) NULL,
    notes VARCHAR(1000) NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payments_competence (competence),
    INDEX idx_payments_company (company_id, paid_at)
);