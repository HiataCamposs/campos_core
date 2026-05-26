-- Migration 037: Create dedicated gelo_custo_embalagens table and migrate data from gelo_custos

-- 1. Rename table gelo_despesas -> gelo_custos
ALTER TABLE gelo_despesas RENAME TO gelo_custos;

-- 2. Create table
CREATE TABLE IF NOT EXISTS gelo_custo_embalagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT current_date,
  descricao TEXT,
  tamanho_saco NUMERIC(4,1) NOT NULL,   -- 3, 3.5, 4, 5, 10
  alca BOOLEAN DEFAULT false,
  micras NUMERIC(4,2),                   -- 0.08 a 0.20
  quantidade NUMERIC(10,2) NOT NULL,     -- qtd de sacos/pacotes comprados
  valor NUMERIC(10,2) NOT NULL,          -- valor total pago
  frete NUMERIC(10,2) DEFAULT 0,
  valor_unitario NUMERIC(10,4),          -- custo por unidade (calculado)
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

-- 3. RLS
ALTER TABLE gelo_custo_embalagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON gelo_custo_embalagens FOR ALL USING (auth.uid() = user_id);

-- 4. Migrate data from gelo_custos where categoria = 'plastico'
INSERT INTO gelo_custo_embalagens (id, data, descricao, tamanho_saco, alca, micras, quantidade, valor, frete, valor_unitario, observacao, created_at, deleted_at, user_id)
SELECT id, data, descricao, COALESCE(tamanho_saco, 5), COALESCE(alca, false), micras, COALESCE(quantidade, 0), valor, COALESCE(frete, 0), valor_unitario, observacao, created_at, deleted_at, user_id
FROM gelo_custos
WHERE categoria = 'plastico';

-- 5. Drop gelo_consumo_lancamentos table (no longer needed)
DROP TABLE IF EXISTS gelo_consumo_lancamentos;

-- 6. Delete migrated rows from gelo_custos
DELETE FROM gelo_custos WHERE categoria = 'plastico';

-- 7. Drop embalagem-specific columns from gelo_custos (no longer needed)
ALTER TABLE gelo_custos DROP COLUMN IF EXISTS alca;
ALTER TABLE gelo_custos DROP COLUMN IF EXISTS tamanho_saco;
ALTER TABLE gelo_custos DROP COLUMN IF EXISTS micras;
ALTER TABLE gelo_custos DROP COLUMN IF EXISTS frete;
