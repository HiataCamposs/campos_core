-- Migration 048: histórico de backups
--
-- O workflow .github/workflows/backup.yml grava uma linha aqui ao final de
-- cada execução (sucesso ou falha). A tela Início mostra esse histórico.
--
-- O workflow conecta como "postgres" (dono da tabela), que ignora o RLS,
-- então só existe política de LEITURA para usuários logados no app.

CREATE TABLE IF NOT EXISTS backup_historico (
  id BIGSERIAL PRIMARY KEY,
  executado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sucesso', 'falha')),
  tamanho_bytes BIGINT,
  duracao_segundos INT,
  run_url TEXT,
  mensagem TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_historico_quando
  ON backup_historico (executado_em DESC);

ALTER TABLE backup_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura_autenticados" ON backup_historico;
CREATE POLICY "leitura_autenticados" ON backup_historico
  FOR SELECT
  TO authenticated
  USING (true);
