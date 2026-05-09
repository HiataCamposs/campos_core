-- Migration 022: Split movimentacoes into entradas and saidas
-- Step 1: Create revenda_mov_entradas and migrate entrada data
-- Step 2: Rename revenda_movimentacoes to revenda_mov_saidas

-- ═══ STEP 1: CREATE ENTRADAS TABLE ═══

CREATE TABLE IF NOT EXISTS revenda_mov_entradas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  ref_mes TEXT,
  natureza_id UUID REFERENCES revenda_naturezas(id) ON DELETE SET NULL,
  atributo_id UUID REFERENCES revenda_atributos(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL,
  valor_compra_unitario NUMERIC(10,2),
  valor_compra_total NUMERIC(10,2) GENERATED ALWAYS AS (quantidade * valor_compra_unitario) STORED,
  fornecedor_id UUID REFERENCES revenda_fornecedores(id) ON DELETE SET NULL,
  nota_fiscal TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE revenda_mov_entradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON revenda_mov_entradas FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_mov_entradas
  BEFORE UPDATE ON revenda_mov_entradas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing entradas
INSERT INTO revenda_mov_entradas (id, data, ref_mes, natureza_id, atributo_id, quantidade, valor_compra_unitario, fornecedor_id, nota_fiscal, observacao, created_at, deleted_at, user_id)
SELECT id, data, ref_mes, natureza_id, atributo_id, quantidade, valor_compra_unitario, fornecedor_id, nota_fiscal, observacao, created_at, deleted_at, user_id
FROM revenda_movimentacoes
WHERE tipo = 'entrada';

-- ═══ STEP 2: RENAME OLD TABLE TO SAIDAS ═══

-- Remove entradas from old table (already migrated)
DELETE FROM revenda_movimentacoes WHERE tipo = 'entrada';

-- Rename table
ALTER TABLE revenda_movimentacoes RENAME TO revenda_mov_saidas;

-- Drop columns only relevant to entradas
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS tipo;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS fornecedor_id;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS nota_fiscal;

-- Add updated_at if not present
ALTER TABLE revenda_mov_saidas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER set_updated_at_mov_saidas
  BEFORE UPDATE ON revenda_mov_saidas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rename policy (recreate since rename not supported)
DROP POLICY IF EXISTS "user_own_data" ON revenda_mov_saidas;
CREATE POLICY "user_own_data" ON revenda_mov_saidas FOR ALL USING (auth.uid() = user_id);
