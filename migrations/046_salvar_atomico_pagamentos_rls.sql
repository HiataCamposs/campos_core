-- Migration 046
--   1. Salvamento atômico de saídas e entradas (cabeçalho + itens numa transação)
--   2. fn_gerencial_pagamentos sem multiplicar valores pelo número de itens
--   3. RLS: itens/transações só podem apontar para movimentações do próprio usuário
--
-- Rode DEPOIS da 045. O app novo depende das funções fn_salvar_saida e
-- fn_salvar_entrada: sem esta migration, salvar entradas/saídas falha.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Salvamento atômico
-- ═══════════════════════════════════════════════════════════════════
-- Antes, o app fazia: update/insert da saída → delete dos itens → insert dos
-- itens, em requisições separadas. Se a última falhasse, a saída ficava sem
-- itens. Uma função plpgsql roda inteira numa transação: ou tudo grava, ou nada.
--
-- p_id NULL = nova; preenchido = edição (os itens são substituídos).
-- SECURITY INVOKER: o RLS do usuário continua valendo.

CREATE OR REPLACE FUNCTION fn_salvar_saida(
  p_id UUID,
  p_dados JSONB,
  p_itens JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID := p_id;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO revenda_mov_saidas (data, pdv_id, observacao, is_perda, frete, user_id)
    VALUES (
      (p_dados->>'data')::date,
      NULLIF(p_dados->>'pdv_id', '')::uuid,
      NULLIF(p_dados->>'observacao', ''),
      COALESCE((p_dados->>'is_perda')::boolean, false),
      COALESCE(NULLIF(p_dados->>'frete', '')::numeric, 0),
      v_uid
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE revenda_mov_saidas SET
      data       = (p_dados->>'data')::date,
      pdv_id     = NULLIF(p_dados->>'pdv_id', '')::uuid,
      observacao = NULLIF(p_dados->>'observacao', ''),
      is_perda   = COALESCE((p_dados->>'is_perda')::boolean, false),
      frete      = COALESCE(NULLIF(p_dados->>'frete', '')::numeric, 0)
    WHERE id = v_id AND user_id = v_uid AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Saída não encontrada';
    END IF;

    DELETE FROM revenda_mov_saidas_itens WHERE mov_id = v_id;
  END IF;

  INSERT INTO revenda_mov_saidas_itens
    (mov_id, produto_id, quantidade, valor_compra_unitario, valor_venda_unitario, user_id)
  SELECT v_id, x.produto_id, x.quantidade, x.valor_compra_unitario, x.valor_venda_unitario, v_uid
  FROM jsonb_to_recordset(COALESCE(p_itens, '[]'::jsonb)) AS x(
    produto_id UUID,
    quantidade NUMERIC,
    valor_compra_unitario NUMERIC,
    valor_venda_unitario NUMERIC
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_salvar_entrada(
  p_id UUID,
  p_dados JSONB,
  p_itens JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID := p_id;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF v_id IS NULL THEN
    INSERT INTO revenda_mov_entradas (data, fornecedor_id, nota_fiscal, observacao, user_id)
    VALUES (
      (p_dados->>'data')::date,
      NULLIF(p_dados->>'fornecedor_id', '')::uuid,
      NULLIF(p_dados->>'nota_fiscal', ''),
      NULLIF(p_dados->>'observacao', ''),
      v_uid
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE revenda_mov_entradas SET
      data          = (p_dados->>'data')::date,
      fornecedor_id = NULLIF(p_dados->>'fornecedor_id', '')::uuid,
      nota_fiscal   = NULLIF(p_dados->>'nota_fiscal', ''),
      observacao    = NULLIF(p_dados->>'observacao', '')
    WHERE id = v_id AND user_id = v_uid AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Entrada não encontrada';
    END IF;

    DELETE FROM revenda_mov_entradas_itens WHERE mov_id = v_id;
  END IF;

  INSERT INTO revenda_mov_entradas_itens
    (mov_id, produto_id, quantidade, valor_compra_unitario, user_id)
  SELECT v_id, x.produto_id, x.quantidade, x.valor_compra_unitario, v_uid
  FROM jsonb_to_recordset(COALESCE(p_itens, '[]'::jsonb)) AS x(
    produto_id UUID,
    quantidade NUMERIC,
    valor_compra_unitario NUMERIC
  );

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_salvar_saida(UUID, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION fn_salvar_entrada(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_salvar_saida(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_salvar_entrada(UUID, JSONB, JSONB) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Gerencial: formas de pagamento
-- ═══════════════════════════════════════════════════════════════════
-- O JOIN com itens repetia cada transação uma vez por item da saída,
-- multiplicando o valor. Agora o filtro de natureza/produto é um EXISTS.

CREATE OR REPLACE FUNCTION fn_gerencial_pagamentos(
  p_start DATE,
  p_end DATE,
  p_natureza TEXT DEFAULT NULL,
  p_produto UUID DEFAULT NULL,
  p_pdv UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT
      fp.nome AS name,
      ROUND(SUM(tr.valor)::numeric, 2) AS value
    FROM revenda_saida_transacoes tr
    JOIN revenda_mov_saidas s ON s.id = tr.mov_id
    JOIN revenda_formas_pagamento fp ON fp.id = tr.forma_pagamento_id
    WHERE s.deleted_at IS NULL
      AND s.is_perda = false
      AND s.data >= p_start
      AND s.data <= p_end
      AND s.user_id = auth.uid()
      AND (p_pdv IS NULL OR s.pdv_id = p_pdv)
      AND (
        (p_natureza IS NULL AND p_produto IS NULL)
        OR EXISTS (
          SELECT 1
          FROM revenda_mov_saidas_itens i
          JOIN revenda_produtos p ON p.id = i.produto_id
          WHERE i.mov_id = s.id
            AND (p_natureza IS NULL OR p.natureza = p_natureza)
            AND (p_produto IS NULL OR p.id = p_produto)
        )
      )
    GROUP BY fp.nome
    ORDER BY SUM(tr.valor) DESC
  ) t;

  RETURN result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. RLS: filhos só podem apontar para movimentações do próprio usuário
-- ═══════════════════════════════════════════════════════════════════
-- Antes a política só checava o user_id da própria linha. Quem soubesse o
-- UUID de uma saída alheia conseguia inserir itens/pagamentos nela.

DROP POLICY IF EXISTS "user_own_data" ON revenda_mov_saidas_itens;
CREATE POLICY "user_own_data" ON revenda_mov_saidas_itens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM revenda_mov_saidas m WHERE m.id = mov_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_own_data" ON revenda_mov_entradas_itens;
CREATE POLICY "user_own_data" ON revenda_mov_entradas_itens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM revenda_mov_entradas m WHERE m.id = mov_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_own_data" ON revenda_saida_transacoes;
CREATE POLICY "user_own_data" ON revenda_saida_transacoes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM revenda_mov_saidas m WHERE m.id = mov_id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "user_own_data" ON revenda_entrada_transacoes;
CREATE POLICY "user_own_data" ON revenda_entrada_transacoes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM revenda_mov_entradas m WHERE m.id = mov_id AND m.user_id = auth.uid())
  );
