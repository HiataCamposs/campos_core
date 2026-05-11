-- Migration 027: Payment methods and transaction tables

-- ═══ FORMAS DE PAGAMENTO ═══
CREATE TABLE IF NOT EXISTS revenda_formas_pagamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE revenda_formas_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON revenda_formas_pagamento FOR ALL USING (auth.uid() = user_id);

-- ═══ TRANSAÇÕES DE SAÍDA ═══
CREATE TABLE IF NOT EXISTS revenda_saida_transacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mov_id UUID NOT NULL REFERENCES revenda_mov_saidas(id) ON DELETE CASCADE,
  forma_pagamento_id UUID REFERENCES revenda_formas_pagamento(id) ON DELETE SET NULL,
  valor NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE revenda_saida_transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON revenda_saida_transacoes FOR ALL USING (auth.uid() = user_id);

-- ═══ TRANSAÇÕES DE ENTRADA ═══
CREATE TABLE IF NOT EXISTS revenda_entrada_transacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mov_id UUID NOT NULL REFERENCES revenda_mov_entradas(id) ON DELETE CASCADE,
  forma_pagamento_id UUID REFERENCES revenda_formas_pagamento(id) ON DELETE SET NULL,
  valor NUMERIC(10,2) NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE revenda_entrada_transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_data" ON revenda_entrada_transacoes FOR ALL USING (auth.uid() = user_id);
