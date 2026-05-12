-- Add dimensao and tamanho columns to revenda_produtos
ALTER TABLE revenda_produtos
  ADD COLUMN IF NOT EXISTS dimensao TEXT,
  ADD COLUMN IF NOT EXISTS tamanho TEXT;
