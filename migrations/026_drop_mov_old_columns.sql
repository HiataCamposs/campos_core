-- Migration 026: Drop obsolete product columns from parent mov tables
-- Using CASCADE because generated columns (valor_compra_total, valor_venda_total) depend on quantidade

-- ═══ SAÍDAS ═══
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS valor_compra_total;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS valor_venda_total;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS quantidade CASCADE;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS natureza_id;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS valor_compra_unitario;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS valor_venda_unitario;

-- ═══ ENTRADAS ═══
ALTER TABLE revenda_mov_entradas DROP COLUMN IF EXISTS valor_compra_total;
ALTER TABLE revenda_mov_entradas DROP COLUMN IF EXISTS quantidade CASCADE;
ALTER TABLE revenda_mov_entradas DROP COLUMN IF EXISTS natureza_id;
ALTER TABLE revenda_mov_entradas DROP COLUMN IF EXISTS valor_compra_unitario;
