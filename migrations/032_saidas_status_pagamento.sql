-- Adiciona campo status_pagamento na tabela de saídas
-- Valores: 'pendente' (sem transação), 'parcial' (pago parcial), 'pago' (pago total)
ALTER TABLE revenda_mov_saidas
  ADD COLUMN IF NOT EXISTS status_pagamento TEXT NOT NULL DEFAULT 'pendente';

-- Popula com base nas transações existentes
UPDATE revenda_mov_saidas s
SET status_pagamento = CASE
  WHEN COALESCE(t.total_pago, 0) = 0 THEN 'pendente'
  WHEN COALESCE(t.total_pago, 0) >= (
    SELECT COALESCE(SUM(i.quantidade * i.valor_venda_unitario), 0)
    FROM revenda_mov_saidas_itens i
    WHERE i.mov_id = s.id
  ) THEN 'pago'
  ELSE 'parcial'
END
FROM (
  SELECT mov_id, SUM(valor) AS total_pago
  FROM revenda_saida_transacoes
  GROUP BY mov_id
) t
WHERE t.mov_id = s.id;

-- Atualiza valor_compra_unitario nos itens de saída com o custo atual do produto
UPDATE revenda_mov_saidas_itens i
SET valor_compra_unitario = rp.custo_unitario
FROM revenda_produtos rp
WHERE rp.id = i.produto_id
  AND rp.custo_unitario IS NOT NULL;
