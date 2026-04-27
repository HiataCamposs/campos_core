-- Migration 013: Create gelo_consumo table for energy and water tracking
-- Revert extra columns from gelo_despesas (migration 012)

-- Drop columns added by 012 if they exist
ALTER TABLE gelo_despesas DROP COLUMN IF EXISTS quantidade;
ALTER TABLE gelo_despesas DROP COLUMN IF EXISTS unidade;
ALTER TABLE gelo_despesas DROP COLUMN IF EXISTS valor_unitario;
ALTER TABLE gelo_despesas DROP COLUMN IF EXISTS referencia;

-- New table for energy/water consumption
CREATE TABLE IF NOT EXISTS gelo_consumo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('energia', 'agua')),  -- energia | agua
  consumo NUMERIC(10,2),               -- kWh ou m³
  valor_conta NUMERIC(10,2) NOT NULL,  -- valor total da conta
  percentual_fabrica NUMERIC(5,2) NOT NULL DEFAULT 100, -- % destinado à fábrica
  valor_fabrica NUMERIC(10,2) NOT NULL, -- valor_conta * percentual / 100
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE gelo_consumo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON gelo_consumo FOR ALL USING (auth.uid() = user_id);
