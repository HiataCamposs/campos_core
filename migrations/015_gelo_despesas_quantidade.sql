-- Migration 015: Add quantidade and valor_unitario to gelo_despesas
-- For tracking unit cost of filters and plastic bags

ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS quantidade NUMERIC(10,2);
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10,4);
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS frete NUMERIC(10,2);
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS alca BOOLEAN DEFAULT false;
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS tamanho_saco NUMERIC(4,1); -- 3, 3.5, 4, 5, 10
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS micras NUMERIC(4,2); -- 0.08 a 0.20
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS estoque_atual NUMERIC(10,2); -- stock tracking
