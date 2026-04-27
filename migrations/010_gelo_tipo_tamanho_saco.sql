-- Atualiza valores padrão do campo tipo para tamanhos de saco
ALTER TABLE gelo_producao ALTER COLUMN tipo SET DEFAULT '5kg';
ALTER TABLE gelo_vendas ALTER COLUMN tipo SET DEFAULT '5kg';

-- Migra registros antigos (opcional: converte "barra" e "saco" para "5kg")
UPDATE gelo_producao SET tipo = '5kg' WHERE tipo IN ('barra', 'saco', 'escama');
UPDATE gelo_vendas SET tipo = '5kg' WHERE tipo IN ('barra', 'saco', 'escama');
