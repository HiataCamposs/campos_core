-- Migration 039: Add kg_total to fn_gerencial_kpis

CREATE OR REPLACE FUNCTION fn_gerencial_kpis(
  p_start DATE,
  p_end DATE,
  p_natureza TEXT DEFAULT NULL,
  p_produto UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'faturamento', COALESCE(SUM(i.quantidade * i.valor_venda_unitario), 0),
    'lucro', COALESCE(SUM(i.quantidade * (i.valor_venda_unitario - i.valor_compra_unitario)), 0),
    'margem', CASE
      WHEN COALESCE(SUM(i.quantidade * i.valor_venda_unitario), 0) > 0
      THEN ROUND((SUM(i.quantidade * (i.valor_venda_unitario - i.valor_compra_unitario)) / SUM(i.quantidade * i.valor_venda_unitario) * 100)::numeric, 1)
      ELSE 0
    END,
    'inadimplentes', (
      SELECT COUNT(*) FROM revenda_mov_saidas s2
      WHERE s2.deleted_at IS NULL AND s2.is_perda = false
        AND s2.data >= p_start AND s2.data <= p_end
        AND s2.status_pagamento != 'pago'
        AND s2.user_id = auth.uid()
    ),
    'pedidos', COUNT(DISTINCT s.id),
    'itens', COALESCE(SUM(i.quantidade), 0),
    'kg_total', COALESCE(SUM(i.quantidade * COALESCE(p.tamanho, 0)), 0)
  ) INTO result
  FROM revenda_mov_saidas s
  JOIN revenda_mov_saidas_itens i ON i.mov_id = s.id
  LEFT JOIN revenda_produtos p ON p.id = i.produto_id
  WHERE s.deleted_at IS NULL
    AND s.is_perda = false
    AND s.data >= p_start
    AND s.data <= p_end
    AND s.user_id = auth.uid()
    AND (p_natureza IS NULL OR p.natureza = p_natureza)
    AND (p_produto IS NULL OR i.produto_id = p_produto);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
