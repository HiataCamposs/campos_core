-- Remove a coluna gerada e recria como coluna normal
ALTER TABLE veiculos_abastecimentos DROP COLUMN valor_total;
ALTER TABLE veiculos_abastecimentos ADD COLUMN valor_total numeric(10,2);
