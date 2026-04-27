-- Migration 011: Split endereco into cidade, bairro, logradouro, numero
-- Preserva dados existentes renomeando endereco → logradouro

-- ===== revenda_fornecedores =====
ALTER TABLE revenda_fornecedores RENAME COLUMN endereco TO logradouro;
ALTER TABLE revenda_fornecedores ADD COLUMN cidade TEXT DEFAULT '';
ALTER TABLE revenda_fornecedores ADD COLUMN bairro TEXT DEFAULT '';
ALTER TABLE revenda_fornecedores ADD COLUMN numero TEXT DEFAULT '';

-- ===== revenda_pdvs =====
ALTER TABLE revenda_pdvs RENAME COLUMN endereco TO logradouro;
ALTER TABLE revenda_pdvs ADD COLUMN cidade TEXT DEFAULT '';
ALTER TABLE revenda_pdvs ADD COLUMN bairro TEXT DEFAULT '';
ALTER TABLE revenda_pdvs ADD COLUMN numero TEXT DEFAULT '';
