-- Migration 029: Cleanup + custo produto

-- ═══ DROP campos obsoletos ═══
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS valor_acerto;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS status_pagamento;
ALTER TABLE revenda_mov_saidas DROP COLUMN IF EXISTS data_pagamento;
ALTER TABLE revenda_mov_entradas DROP COLUMN IF EXISTS status_pagamento;

-- ═══ Custo unitário no produto ═══
ALTER TABLE revenda_produtos ADD COLUMN IF NOT EXISTS custo_unitario NUMERIC(10,2);

-- ═══ Atualizar custo_unitario dos produtos de gelo com último preco_pacote por tamanho ═══
-- Gelo 5kg
UPDATE revenda_produtos
SET custo_unitario = (
  SELECT preco_pacote FROM gelo_producao
  WHERE tamanho = 5 AND preco_pacote IS NOT NULL AND deleted_at IS NULL
  ORDER BY data DESC LIMIT 1
)
WHERE LOWER(nome) LIKE '%5%kg%' AND natureza = 'Gelo' AND custo_unitario IS NULL;

-- Gelo 10kg
UPDATE revenda_produtos
SET custo_unitario = (
  SELECT preco_pacote FROM gelo_producao
  WHERE tamanho = 10 AND preco_pacote IS NOT NULL AND deleted_at IS NULL
  ORDER BY data DESC LIMIT 1
)
WHERE LOWER(nome) LIKE '%10%kg%' AND natureza = 'Gelo' AND custo_unitario IS NULL;

-- Gelo 20kg
UPDATE revenda_produtos
SET custo_unitario = (
  SELECT preco_pacote FROM gelo_producao
  WHERE tamanho = 20 AND preco_pacote IS NOT NULL AND deleted_at IS NULL
  ORDER BY data DESC LIMIT 1
)
WHERE LOWER(nome) LIKE '%20%kg%' AND natureza = 'Gelo' AND custo_unitario IS NULL;
