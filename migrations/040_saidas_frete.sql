-- Migration 040: Add frete column to revenda_mov_saidas
ALTER TABLE revenda_mov_saidas
  ADD COLUMN IF NOT EXISTS frete NUMERIC DEFAULT 0;
