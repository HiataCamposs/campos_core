-- Migration 034: RPC functions for Gerencial analytics
-- These replace heavy client-side calculations with server-side aggregations.

-- ═══════════════════════════════════════════
-- 1. KPIs
-- ═══════════════════════════════════════════
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
    'itens', COALESCE(SUM(i.quantidade), 0)
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

-- ═══════════════════════════════════════════
-- 2. Evolução mensal
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_gerencial_evolucao(
  p_start DATE,
  p_end DATE,
  p_natureza TEXT DEFAULT NULL,
  p_produto UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json) INTO result
  FROM (
    SELECT
      TO_CHAR(s.data, 'YYYY-MM') AS date,
      ROUND(SUM(i.quantidade * i.valor_venda_unitario)::numeric, 2) AS faturamento,
      ROUND(SUM(i.quantidade * (i.valor_venda_unitario - i.valor_compra_unitario))::numeric, 2) AS lucro
    FROM revenda_mov_saidas s
    JOIN revenda_mov_saidas_itens i ON i.mov_id = s.id
    LEFT JOIN revenda_produtos p ON p.id = i.produto_id
    WHERE s.deleted_at IS NULL
      AND s.is_perda = false
      AND s.data >= p_start
      AND s.data <= p_end
      AND s.user_id = auth.uid()
      AND (p_natureza IS NULL OR p.natureza = p_natureza)
      AND (p_produto IS NULL OR i.produto_id = p_produto)
    GROUP BY TO_CHAR(s.data, 'YYYY-MM')
  ) t;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════
-- 3. Top PDVs
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_gerencial_top_pdvs(
  p_start DATE,
  p_end DATE,
  p_limit INT DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT
      pdv.nome,
      ROUND(SUM(i.quantidade * i.valor_venda_unitario)::numeric, 2) AS faturamento,
      ROUND(SUM(i.quantidade * (i.valor_venda_unitario - i.valor_compra_unitario))::numeric, 2) AS lucro,
      CASE
        WHEN SUM(i.quantidade * i.valor_venda_unitario) > 0
        THEN ROUND((SUM(i.quantidade * (i.valor_venda_unitario - i.valor_compra_unitario)) / SUM(i.quantidade * i.valor_venda_unitario) * 100)::numeric, 1)
        ELSE 0
      END AS margem
    FROM revenda_mov_saidas s
    JOIN revenda_mov_saidas_itens i ON i.mov_id = s.id
    JOIN revenda_pdvs pdv ON pdv.id = s.pdv_id
    WHERE s.deleted_at IS NULL
      AND s.is_perda = false
      AND s.data >= p_start
      AND s.data <= p_end
      AND s.user_id = auth.uid()
    GROUP BY pdv.nome
    ORDER BY lucro DESC
    LIMIT p_limit
  ) t;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════
-- 4. Performance Produtos
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_gerencial_produtos(
  p_start DATE,
  p_end DATE,
  p_natureza TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT
      p.nome,
      SUM(i.quantidade)::numeric AS quantidade,
      CASE WHEN SUM(i.quantidade) > 0
        THEN ROUND((SUM(i.quantidade * i.valor_compra_unitario) / SUM(i.quantidade))::numeric, 2)
        ELSE 0
      END AS custo_medio,
      CASE WHEN SUM(i.quantidade) > 0
        THEN ROUND((SUM(i.quantidade * i.valor_venda_unitario) / SUM(i.quantidade))::numeric, 2)
        ELSE 0
      END AS venda_medio,
      CASE WHEN SUM(i.quantidade * i.valor_venda_unitario) > 0
        THEN ROUND(((SUM(i.quantidade * (i.valor_venda_unitario - i.valor_compra_unitario)) / SUM(i.quantidade * i.valor_venda_unitario)) * 100)::numeric, 1)
        ELSE 0
      END AS margem
    FROM revenda_mov_saidas s
    JOIN revenda_mov_saidas_itens i ON i.mov_id = s.id
    JOIN revenda_produtos p ON p.id = i.produto_id
    WHERE s.deleted_at IS NULL
      AND s.is_perda = false
      AND s.data >= p_start
      AND s.data <= p_end
      AND s.user_id = auth.uid()
      AND (p_natureza IS NULL OR p.natureza = p_natureza)
    GROUP BY p.nome
    ORDER BY SUM(i.quantidade) DESC
  ) t;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════
-- 5. Pagamentos por forma
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_gerencial_pagamentos(
  p_start DATE,
  p_end DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT
      fp.nome AS name,
      ROUND(SUM(t.valor)::numeric, 2) AS value
    FROM revenda_saida_transacoes t
    JOIN revenda_mov_saidas s ON s.id = t.mov_id
    JOIN revenda_formas_pagamento fp ON fp.id = t.forma_pagamento_id
    WHERE s.deleted_at IS NULL
      AND s.is_perda = false
      AND s.data >= p_start
      AND s.data <= p_end
      AND s.user_id = auth.uid()
    GROUP BY fp.nome
    ORDER BY SUM(t.valor) DESC
  ) t;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
