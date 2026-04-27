-- Migration 017: Create gelo_consumo_log for stock movement tracking
-- Logs every stock movement (consumption/return) from the "Consumo" tab

CREATE TABLE IF NOT EXISTS gelo_consumo_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despesa_id UUID NOT NULL REFERENCES gelo_despesas(id),  -- item being consumed
  descricao TEXT NOT NULL,            -- item description (snapshot)
  categoria TEXT NOT NULL,            -- 'filtro' | 'plastico'
  quantidade NUMERIC(10,2) NOT NULL,  -- positive = consumed, negative = returned
  valor_unitario NUMERIC(10,4),       -- custo unitário no momento da movimentação
  estoque_antes NUMERIC(10,2) NOT NULL,
  estoque_depois NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE gelo_consumo_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON gelo_consumo_log FOR ALL USING (auth.uid() = user_id);
