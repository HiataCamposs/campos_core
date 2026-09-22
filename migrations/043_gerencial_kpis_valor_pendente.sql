-- Migration 043: Add valor_pendente to fn_gerencial_kpis

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
    'valor_pendente', (
      SELECT COALESCE(
        SUM(
          GREATEST(
            (COALESCE(s2.total_venda, 0) + COALESCE(s2.frete, 0)) - COALESCE(t.total_pago, 0),
            0
          )
        ),
        0
      )
      FROM revenda_mov_saidas s2
      LEFT JOIN (
        SELECT mov_id, COALESCE(SUM(valor), 0) AS total_pago
        FROM revenda_saida_transacoes
        GROUP BY mov_id
      ) t ON t.mov_id = s2.id
      WHERE s2.deleted_at IS NULL
        AND s2.is_perda = false
        AND s2.data >= p_start
        AND s2.data <= p_end
        AND s2.status_pagamento != 'pago'
        AND s2.user_id = auth.uid()
    ),
    'pedidos', COUNT(DISTINCT s.id),
    'itens', COALESCE(SUM(i.quantidade), 0),
    'kg_total', COALESCE(SUM(i.quantidade * COALESCE(p.tamanho::numeric, 0)), 0)
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
