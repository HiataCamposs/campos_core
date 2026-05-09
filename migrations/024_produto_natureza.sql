-- Migration 024: Add natureza (product type) to revenda_naturezas
ALTER TABLE revenda_naturezas ADD COLUMN IF NOT EXISTS natureza TEXT;
