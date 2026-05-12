-- Migration 031: Rename tipo -> tamanho on gelo_producao and convert to integer
ALTER TABLE gelo_producao RENAME COLUMN tipo TO tamanho;

-- Remove default, convert to integer, set new default
ALTER TABLE gelo_producao ALTER COLUMN tamanho DROP DEFAULT;
ALTER TABLE gelo_producao ALTER COLUMN tamanho TYPE INTEGER USING (regexp_replace(tamanho, '[^0-9]', '', 'g'))::INTEGER;
ALTER TABLE gelo_producao ALTER COLUMN tamanho SET DEFAULT 5;

-- ═══ Rename natureza_id -> produto_id across item tables ═══
ALTER TABLE revenda_mov_saidas_itens RENAME COLUMN natureza_id TO produto_id;
ALTER TABLE revenda_mov_entradas_itens RENAME COLUMN natureza_id TO produto_id;
ALTER TABLE gelo_producao ALTER COLUMN tamanho SET DEFAULT 5;
