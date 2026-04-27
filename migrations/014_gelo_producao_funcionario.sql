-- Migration 014: Add funcionario to gelo_producao, remove vendas tab dependency

ALTER TABLE gelo_producao ADD COLUMN IF NOT EXISTS funcionario TEXT;
