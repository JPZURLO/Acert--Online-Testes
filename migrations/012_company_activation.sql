ALTER TABLE empresas
    ADD COLUMN contact_email VARCHAR(254) NULL AFTER CNPJ;

CREATE TABLE IF NOT EXISTS company_activation_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    request_id BIGINT NULL,
    email VARCHAR(254) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activation_company (company_id, used_at, expires_at),
    INDEX idx_activation_request (request_id),
    CONSTRAINT fk_activation_company FOREIGN KEY (company_id) REFERENCES empresas(id) ON DELETE CASCADE,
    CONSTRAINT fk_activation_request FOREIGN KEY (request_id) REFERENCES access_requests(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
