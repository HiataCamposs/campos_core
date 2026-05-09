-- Migration 023: Drop obsolete columns
-- ref_mes and atributo_id are unused in the app
-- Contact/address columns on PDVs and Fornecedores are now in cadastro_contatos/cadastro_enderecos

-- ── revenda_mov_entradas ──
ALTER TABLE revenda_mov_entradas DROP COLUMN IF EXISTS ref_mes;
ALTER TABLE revenda_mov_entradas DROP COLUMN IF EXISTS atributo_id;

-- ── revenda_mov_saidas (old revenda_movimentacoes) ──
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS ref_mes;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS atributo_id;

-- ── revenda_pdvs: contact/address moved to cadastro_contatos/cadastro_enderecos ──
ALTER TABLE revenda_pdvs DROP COLUMN IF EXISTS contato;
ALTER TABLE revenda_pdvs DROP COLUMN IF EXISTS contato_tipo;
ALTER TABLE revenda_pdvs DROP COLUMN IF EXISTS contato_nome;
ALTER TABLE revenda_pdvs DROP COLUMN IF EXISTS cidade;
ALTER TABLE revenda_pdvs DROP COLUMN IF EXISTS bairro;
ALTER TABLE revenda_pdvs DROP COLUMN IF EXISTS logradouro;
ALTER TABLE revenda_pdvs DROP COLUMN IF EXISTS numero;

-- ── revenda_fornecedores: contact/address moved to cadastro_contatos/cadastro_enderecos ──
ALTER TABLE revenda_fornecedores DROP COLUMN IF EXISTS contato;
ALTER TABLE revenda_fornecedores DROP COLUMN IF EXISTS cidade;
ALTER TABLE revenda_fornecedores DROP COLUMN IF EXISTS bairro;
ALTER TABLE revenda_fornecedores DROP COLUMN IF EXISTS logradouro;
ALTER TABLE revenda_fornecedores DROP COLUMN IF EXISTS numero;

-- ── Drop revenda_atributos table (unused) ──
DROP TABLE IF EXISTS revenda_atributos CASCADE;
