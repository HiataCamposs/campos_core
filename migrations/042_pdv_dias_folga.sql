-- Migration 042: Add dias_folga to revenda_pdvs
ALTER TABLE revenda_pdvs
  ADD COLUMN IF NOT EXISTS dias_folga TEXT[] NOT NULL DEFAULT ARRAY['segunda'];

UPDATE revenda_pdvs
SET dias_folga = ARRAY['segunda']
WHERE dias_folga IS NULL OR array_length(dias_folga, 1) IS NULL;
