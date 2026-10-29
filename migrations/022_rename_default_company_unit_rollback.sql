-- Rollback da Migration 022: Reverter nome da unidade padrão para 'ACerT'

UPDATE company_units
SET name = 'ACerT'
WHERE id = 1
  AND company_id = 1
  AND name = 'Academia Brasileira de Certificações e Treinamentos';
