-- Migration 025: Create item tables for movimentações (multi-product support)
-- Each movimentação can now contain multiple products

-- ═══ SAÍDAS ITENS ═══

CREATE TABLE IF NOT EXISTS revenda_mov_saidas_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mov_id UUID NOT NULL REFERENCES revenda_mov_saidas(id) ON DELETE CASCADE,
  natureza_id UUID REFERENCES revenda_naturezas(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_compra_unitario NUMERIC(10,2),
  valor_venda_unitario NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE revenda_mov_saidas_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON revenda_mov_saidas_itens FOR ALL USING (auth.uid() = user_id);

-- ═══ ENTRADAS ITENS ═══

CREATE TABLE IF NOT EXISTS revenda_mov_entradas_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mov_id UUID NOT NULL REFERENCES revenda_mov_entradas(id) ON DELETE CASCADE,
  natureza_id UUID REFERENCES revenda_naturezas(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_compra_unitario NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE revenda_mov_entradas_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON revenda_mov_entradas_itens FOR ALL USING (auth.uid() = user_id);

-- ═══ MIGRATE EXISTING DATA ═══

-- Migrate each saída row into 1 item
INSERT INTO revenda_mov_saidas_itens (mov_id, natureza_id, quantidade, valor_compra_unitario, valor_venda_unitario, user_id)
SELECT id, natureza_id, quantidade, valor_compra_unitario, valor_venda_unitario, user_id
FROM revenda_mov_saidas
WHERE deleted_at IS NULL AND natureza_id IS NOT NULL;

-- Migrate each entrada row into 1 item
INSERT INTO revenda_mov_entradas_itens (mov_id, natureza_id, quantidade, valor_compra_unitario, user_id)
SELECT id, natureza_id, quantidade, valor_compra_unitario, user_id
FROM revenda_mov_entradas
WHERE deleted_at IS NULL AND natureza_id IS NOT NULL;


