-- Migration 012: Improve gelo_despesas for detailed cost tracking
-- Add quantity/unit tracking for energia and água (kWh, m³)
-- Update categoria options: filtro, plastico, energia, agua, manutencao, outro

ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS quantidade NUMERIC(10,2);
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS unidade TEXT; -- kWh, m³
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10,4);
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS referencia TEXT; -- ex: "04/2026" mês de referência

-- Migrate old 'energia' entries to keep consistency (already correct)
-- Migrate old 'insumo' that were filters or plastic → keep as-is, user can recategorize
