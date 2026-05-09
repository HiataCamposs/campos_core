-- Migration 020: Add contato_tipo and contato_nome to revenda_pdvs
ALTER TABLE revenda_pdvs ADD COLUMN IF NOT EXISTS contato_tipo TEXT;
ALTER TABLE revenda_pdvs ADD COLUMN IF NOT EXISTS contato_nome TEXT;
