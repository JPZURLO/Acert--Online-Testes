-- Migration 022: Renomear unidade padrão 'ACerT' para 'Academia Brasileira de Certificações e Treinamentos'
-- Preserva id (1), company_id (1), status ('active'), is_default (TRUE), vínculos de tabelas e branding.

UPDATE company_units
SET name = 'Academia Brasileira de Certificações e Treinamentos'
WHERE id = 1
  AND company_id = 1
  AND name = 'ACerT';
