-- Migration 019: Add natureza column to revenda_pdvs
ALTER TABLE revenda_pdvs ADD COLUMN IF NOT EXISTS natureza TEXT;
