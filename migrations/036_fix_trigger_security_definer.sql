-- Migration 036: Fix triggers to use SECURITY DEFINER
-- Without this, RLS blocks the trigger's SELECT/UPDATE causing item inserts to fail silently.

CREATE OR REPLACE FUNCTION fn_recalc_saida_totais()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
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

CREATE OR REPLACE FUNCTION fn_recalc_entrada_totais()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
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

-- Backfill: recalculate totals for all existing records
UPDATE revenda_mov_saidas s SET
  total_qty = COALESCE(sub.qty, 0),
  total_compra = COALESCE(sub.compra, 0),
  total_venda = COALESCE(sub.venda, 0)
FROM (
  SELECT mov_id,
    SUM(quantidade) AS qty,
    SUM(quantidade * COALESCE(valor_compra_unitario, 0)) AS compra,
    SUM(quantidade * COALESCE(valor_venda_unitario, 0)) AS venda
  FROM revenda_mov_saidas_itens GROUP BY mov_id
) sub WHERE s.id = sub.mov_id;

UPDATE revenda_mov_entradas e SET
  total_qty = COALESCE(sub.qty, 0),
  total_compra = COALESCE(sub.compra, 0)
FROM (
  SELECT mov_id,
    SUM(quantidade) AS qty,
    SUM(quantidade * COALESCE(valor_compra_unitario, 0)) AS compra
  FROM revenda_mov_entradas_itens GROUP BY mov_id
) sub WHERE e.id = sub.mov_id;