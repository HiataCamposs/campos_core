-- Migration 018: Replace gelo_consumo_log with gelo_consumo_lancamentos
-- Cleaner structure with date (not datetime), soft delete, and updated_at

-- Drop old table
DROP TABLE IF EXISTS gelo_consumo_log;

CREATE TABLE IF NOT EXISTS gelo_consumo_lancamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despesa_id UUID NOT NULL REFERENCES gelo_despesas(id),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,            -- 'filtro' | 'plastico'
  quantidade INTEGER NOT NULL,        -- positive = entrada, negative = saída
  valor_unitario NUMERIC(10,4),       -- custo unitário no momento
  estoque_antes INTEGER NOT NULL,
  estoque_depois INTEGER NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE gelo_consumo_lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON gelo_consumo_lancamentos FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON gelo_consumo_lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
