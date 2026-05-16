-- Migration 033: Add pre-calculated totals to revenda_mov_saidas and revenda_mov_entradas
-- with triggers on their _itens tables to keep them updated.

-- ═══════════════════════════════════════════
-- SAÍDAS
-- ═══════════════════════════════════════════

-- 1. Add columns
ALTER TABLE revenda_mov_saidas
  ADD COLUMN IF NOT EXISTS total_qty NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_compra NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_venda NUMERIC DEFAULT 0;

-- 2. Backfill existing data
UPDATE revenda_mov_saidas s SET
  total_qty = COALESCE(sub.qty, 0),
  total_compra = COALESCE(sub.compra, 0),
  total_venda = COALESCE(sub.venda, 0)
FROM (
  SELECT
    mov_id,
    SUM(quantidade) AS qty,
    SUM(quantidade * valor_compra_unitario) AS compra,
    SUM(quantidade * valor_venda_unitario) AS venda
  FROM revenda_mov_saidas_itens
  GROUP BY mov_id
) sub
WHERE s.id = sub.mov_id;

-- 3. Create function
CREATE OR REPLACE FUNCTION fn_recalc_saida_totais()
RETURNS TRIGGER AS $$
DECLARE
  target_mov_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_mov_id := OLD.mov_id;
  ELSE
    target_mov_id := NEW.mov_id;
  END IF;

  UPDATE revenda_mov_saidas SET
    total_qty = COALESCE((SELECT SUM(quantidade) FROM revenda_mov_saidas_itens WHERE mov_id = target_mov_id), 0),
    total_compra = COALESCE((SELECT SUM(quantidade * valor_compra_unitario) FROM revenda_mov_saidas_itens WHERE mov_id = target_mov_id), 0),
    total_venda = COALESCE((SELECT SUM(quantidade * valor_venda_unitario) FROM revenda_mov_saidas_itens WHERE mov_id = target_mov_id), 0)
  WHERE id = target_mov_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trg_recalc_saida_totais ON revenda_mov_saidas_itens;
CREATE TRIGGER trg_recalc_saida_totais
  AFTER INSERT OR UPDATE OR DELETE ON revenda_mov_saidas_itens
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalc_saida_totais();

-- ═══════════════════════════════════════════
-- ENTRADAS
-- ═══════════════════════════════════════════

-- 1. Add columns
ALTER TABLE revenda_mov_entradas
  ADD COLUMN IF NOT EXISTS total_qty NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_compra NUMERIC DEFAULT 0;

-- 2. Backfill existing data
UPDATE revenda_mov_entradas e SET
  total_qty = COALESCE(sub.qty, 0),
  total_compra = COALESCE(sub.compra, 0)
FROM (
  SELECT
    mov_id,
    SUM(quantidade) AS qty,
    SUM(quantidade * valor_compra_unitario) AS compra
  FROM revenda_mov_entradas_itens
  GROUP BY mov_id
) sub
WHERE e.id = sub.mov_id;

-- 3. Create function
CREATE OR REPLACE FUNCTION fn_recalc_entrada_totais()
RETURNS TRIGGER AS $$
DECLARE
  target_mov_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_mov_id := OLD.mov_id;
  ELSE
    target_mov_id := NEW.mov_id;
  END IF;

  UPDATE revenda_mov_entradas SET
    total_qty = COALESCE((SELECT SUM(quantidade) FROM revenda_mov_entradas_itens WHERE mov_id = target_mov_id), 0),
    total_compra = COALESCE((SELECT SUM(quantidade * valor_compra_unitario) FROM revenda_mov_entradas_itens WHERE mov_id = target_mov_id), 0)
  WHERE id = target_mov_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trg_recalc_entrada_totais ON revenda_mov_entradas_itens;
CREATE TRIGGER trg_recalc_entrada_totais
  AFTER INSERT OR UPDATE OR DELETE ON revenda_mov_entradas_itens
  FOR EACH ROW
  EXECUTE FUNCTION fn_recalc_entrada_totais();
