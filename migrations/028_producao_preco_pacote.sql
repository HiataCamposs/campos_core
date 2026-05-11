-- Migration 028: Add preco_pacote to gelo_producao
ALTER TABLE gelo_producao ADD COLUMN IF NOT EXISTS preco_pacote NUMERIC(10,2);
