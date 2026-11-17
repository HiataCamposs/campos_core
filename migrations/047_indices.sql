-- Migration 047: índices
--
-- O banco não tinha nenhum índice além das chaves primárias. O Postgres NÃO
-- cria índice automaticamente em chaves estrangeiras, então os triggers de
-- totais/status, as RPCs do Gerencial e a busca de itens/pagamentos de um
-- pedido varriam a tabela inteira. Com poucos dados não se nota; com o tempo
-- fica lento.
--
-- Seguro de rodar mais de uma vez (IF NOT EXISTS). Não altera dados.

-- ── Movimentações ──
CREATE INDEX IF NOT EXISTS idx_mov_saidas_user_data
  ON revenda_mov_saidas (user_id, data DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mov_saidas_pdv
  ON revenda_mov_saidas (pdv_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mov_saidas_itens_mov
  ON revenda_mov_saidas_itens (mov_id);
CREATE INDEX IF NOT EXISTS idx_mov_saidas_itens_produto
  ON revenda_mov_saidas_itens (produto_id);

CREATE INDEX IF NOT EXISTS idx_mov_entradas_user_data
  ON revenda_mov_entradas (user_id, data DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mov_entradas_itens_mov
  ON revenda_mov_entradas_itens (mov_id);

CREATE INDEX IF NOT EXISTS idx_saida_transacoes_mov
  ON revenda_saida_transacoes (mov_id);
CREATE INDEX IF NOT EXISTS idx_entrada_transacoes_mov
  ON revenda_entrada_transacoes (mov_id);

-- ── Cadastros (contatos/endereços de PDVs e fornecedores) ──
CREATE INDEX IF NOT EXISTS idx_contatos_entidade
  ON cadastro_contatos (entidade_tipo, entidade_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_enderecos_entidade
  ON cadastro_enderecos (entidade_tipo, entidade_id) WHERE deleted_at IS NULL;

-- ── Veículos ──
CREATE INDEX IF NOT EXISTS idx_abastecimentos_veiculo_data
  ON veiculos_abastecimentos (veiculo_id, data) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_manutencoes_veiculo_data
  ON veiculos_manutencoes (veiculo_id, data) WHERE deleted_at IS NULL;

-- ── Agendamentos ──
CREATE INDEX IF NOT EXISTS idx_agendamentos_user_quando
  ON agendamentos (user_id, agendado_para) WHERE deleted_at IS NULL;
