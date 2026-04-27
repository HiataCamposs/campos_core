-- Migration 016: Merge gelo_consumo data into gelo_despesas and retire gelo_consumo
-- Energy/water entries now live in gelo_despesas with categoria = 'energia' | 'agua'
--
-- Column mapping (reuse existing columns):
--   gelo_consumo.valor_conta      → gelo_despesas.valor          (valor total da conta)
--   gelo_consumo.consumo          → gelo_despesas.quantidade     (kWh ou m³)
--   gelo_consumo.valor_fabrica    → gelo_despesas.valor_unitario (custo destinado à fábrica)
--   gelo_consumo.percentual_fabrica → new column percentual_fabrica

-- 1. Add only the missing column
ALTER TABLE gelo_despesas ADD COLUMN IF NOT EXISTS percentual_fabrica NUMERIC(5,2); -- % destinado à fábrica

-- 2. Migrate existing gelo_consumo records into gelo_despesas
INSERT INTO gelo_despesas (
  data, descricao, valor, categoria, observacao, created_at, deleted_at, user_id,
  quantidade, valor_unitario, percentual_fabrica
)
SELECT
  data,
  CASE tipo WHEN 'energia' THEN 'Conta de Energia' ELSE 'Conta de Água' END,
  valor_conta,          -- valor = valor_conta (valor total da conta)
  tipo,                 -- categoria = 'energia' ou 'agua'
  observacao,
  created_at,
  deleted_at,
  user_id,
  consumo,              -- quantidade = consumo (kWh / m³)
  valor_fabrica,        -- valor_unitario = valor_fabrica (custo fábrica)
  percentual_fabrica
FROM gelo_consumo;

-- 3. Soft-delete all gelo_consumo records (mark as migrated)
UPDATE gelo_consumo SET deleted_at = now() WHERE deleted_at IS NULL;

-- 4. (Optional) Drop the table entirely — uncomment when ready
-- DROP TABLE IF EXISTS gelo_consumo;
