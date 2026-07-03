-- Migration 041: Add pede_nota flag to revenda_pdvs
ALTER TABLE revenda_pdvs
  ADD COLUMN IF NOT EXISTS pede_nota BOOLEAN DEFAULT false;
