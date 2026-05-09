-- Migration 021: Create cadastro_contatos and cadastro_enderecos tables
-- Normalizes contact and address data from revenda_pdvs and revenda_fornecedores

-- ── cadastro_contatos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cadastro_contatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade_tipo TEXT NOT NULL,           -- 'pdv' | 'fornecedor'
  entidade_id UUID NOT NULL,
  tipo TEXT,                             -- 'dono' | 'gerente' | 'atendente' | etc
  nome TEXT,                             -- nome da pessoa
  telefone TEXT,                         -- número / whatsapp
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE cadastro_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON cadastro_contatos FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_contatos
  BEFORE UPDATE ON cadastro_contatos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── cadastro_enderecos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cadastro_enderecos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade_tipo TEXT NOT NULL,           -- 'pdv' | 'fornecedor'
  entidade_id UUID NOT NULL,
  cidade TEXT,
  bairro TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE cadastro_enderecos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON cadastro_enderecos FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_enderecos
  BEFORE UPDATE ON cadastro_enderecos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── MIGRATE PDV DATA ────────────────────────────────────
-- cadastro_contatos from PDVs (only where there's any contact info)
INSERT INTO cadastro_contatos (entidade_tipo, entidade_id, tipo, nome, telefone, user_id)
SELECT 'pdv', id, contato_tipo, contato_nome, contato, user_id
FROM revenda_pdvs
WHERE deleted_at IS NULL
  AND (contato IS NOT NULL OR contato_tipo IS NOT NULL OR contato_nome IS NOT NULL);

-- cadastro_enderecos from PDVs (only where there's any address info)
INSERT INTO cadastro_enderecos (entidade_tipo, entidade_id, cidade, bairro, logradouro, numero, user_id)
SELECT 'pdv', id, cidade, bairro, logradouro, numero, user_id
FROM revenda_pdvs
WHERE deleted_at IS NULL
  AND (cidade IS NOT NULL AND cidade != '' OR bairro IS NOT NULL AND bairro != ''
       OR logradouro IS NOT NULL AND logradouro != '' OR numero IS NOT NULL AND numero != '');

-- ── MIGRATE FORNECEDOR DATA ─────────────────────────────
-- cadastro_contatos from Fornecedores
INSERT INTO cadastro_contatos (entidade_tipo, entidade_id, telefone, user_id)
SELECT 'fornecedor', id, contato, user_id
FROM revenda_fornecedores
WHERE deleted_at IS NULL
  AND contato IS NOT NULL AND contato != '';

-- cadastro_enderecos from Fornecedores
INSERT INTO cadastro_enderecos (entidade_tipo, entidade_id, cidade, bairro, logradouro, numero, user_id)
SELECT 'fornecedor', id, cidade, bairro, logradouro, numero, user_id
FROM revenda_fornecedores
WHERE deleted_at IS NULL
  AND (cidade IS NOT NULL AND cidade != '' OR bairro IS NOT NULL AND bairro != ''
       OR logradouro IS NOT NULL AND logradouro != '' OR numero IS NOT NULL AND numero != '');
