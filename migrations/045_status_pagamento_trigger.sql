-- Migration 045: status_pagamento calculado no banco
--
-- Antes: o status só era recalculado pelo app ao lançar/remover um pagamento.
-- Editar itens ou frete de uma saída já "paga" mantinha "pago" mesmo com
-- saldo devedor, e a dívida sumia da Cobrança e do valor pendente.
--
-- Agora:
--   * BEFORE INSERT/UPDATE em revenda_mov_saidas recalcula o status a partir
--     de total_venda + frete e da soma das transações. Isso cobre edição de
--     itens (o trigger de totais da 036 faz UPDATE na saída) e de frete.
--   * AFTER INSERT/UPDATE/DELETE em revenda_saida_transacoes "toca" a saída
--     para disparar o recálculo.
-- A comparação é feita em NUMERIC arredondado a 2 casas (sem erro de float).

CREATE OR REPLACE FUNCTION fn_calc_status_pagamento(p_total NUMERIC, p_pago NUMERIC)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN ROUND(COALESCE(p_pago, 0), 2) <= 0 THEN 'pendente'
    WHEN ROUND(COALESCE(p_pago, 0), 2) >= ROUND(COALESCE(p_total, 0), 2) THEN 'pago'
    ELSE 'parcial'
  END;
$$;

-- 1. Saída: recalcula o próprio status antes de gravar
CREATE OR REPLACE FUNCTION fn_saida_status_pagamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pago NUMERIC;
BEGIN
  SELECT COALESCE(SUM(valor), 0) INTO v_pago
  FROM revenda_saida_transacoes
  WHERE mov_id = NEW.id;

  NEW.status_pagamento := fn_calc_status_pagamento(
    COALESCE(NEW.total_venda, 0) + COALESCE(NEW.frete, 0),
    v_pago
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saida_status_pagamento ON revenda_mov_saidas;
CREATE TRIGGER trg_saida_status_pagamento
  BEFORE INSERT OR UPDATE ON revenda_mov_saidas
  FOR EACH ROW
  EXECUTE FUNCTION fn_saida_status_pagamento();

-- 2. Transações: ao mudar pagamentos, força o recálculo na saída
CREATE OR REPLACE FUNCTION fn_transacao_toca_saida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE revenda_mov_saidas SET status_pagamento = status_pagamento
    WHERE id = OLD.mov_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.mov_id IS DISTINCT FROM OLD.mov_id OR NEW.valor IS DISTINCT FROM OLD.valor) THEN
    UPDATE revenda_mov_saidas SET status_pagamento = status_pagamento
    WHERE id = NEW.mov_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_transacao_toca_saida ON revenda_saida_transacoes;
CREATE TRIGGER trg_transacao_toca_saida
  AFTER INSERT OR UPDATE OR DELETE ON revenda_saida_transacoes
  FOR EACH ROW
  EXECUTE FUNCTION fn_transacao_toca_saida();

-- 3. Backfill: recalcula o status de todas as saídas existentes
--    (o UPDATE dispara o trigger do item 1)
UPDATE revenda_mov_saidas SET status_pagamento = status_pagamento;
