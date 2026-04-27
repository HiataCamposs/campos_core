-- ══════════════════════════════════════════════════════════
-- Campos Core - Schema Supabase
-- ══════════════════════════════════════════════════════════

-- ── 1. FÁBRICA DE GELO ──────────────────────────────────

create table if not exists gelo_producao (
  id uuid default gen_random_uuid() primary key,
  data date not null default current_date,
  quantidade integer not null,          -- barras / sacos
  tipo text not null default '5kg',      -- 5kg | 10kg | 20kg (tamanho do saco)
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

create table if not exists gelo_vendas (
  id uuid default gen_random_uuid() primary key,
  data date not null default current_date,
  cliente text,
  tipo text not null default '5kg',
  quantidade integer not null,
  valor_unitario numeric(10,2) not null,
  valor_total numeric(10,2) generated always as (quantidade * valor_unitario) stored,
  forma_pagamento text default 'dinheiro', -- dinheiro | pix | fiado
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

create table if not exists gelo_despesas (
  id uuid default gen_random_uuid() primary key,
  data date not null default current_date,
  descricao text not null,
  valor numeric(10,2) not null,
  categoria text,                       -- energia | manutencao | insumo | outro
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- ── 2. REVENDA (Natureza → Atributo, Movimentações flat) ──

-- Naturezas: tipo do produto (Picolé - Fruta no Palito, Gelo, Cachaça - Barro Azul...)
create table if not exists revenda_naturezas (
  id uuid default gen_random_uuid() primary key,
  nome text not null,                    -- ex: "Picolé - Fruta no Palito", "Gelo"
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- Atributos: variante da natureza (Chocolate, Menta, 5KG, 3KG, 1L...)
create table if not exists revenda_atributos (
  id uuid default gen_random_uuid() primary key,
  natureza_id uuid references revenda_naturezas(id) on delete cascade,
  nome text not null,                    -- ex: "Chocolate", "5KG", "1L"
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- Fornecedores: de quem você compra
create table if not exists revenda_fornecedores (
  id uuid default gen_random_uuid() primary key,
  nome text not null,                    -- ex: "Distribuidora X", "Fábrica Y"
  contato text,
  endereco text,
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- PDVs: pontos de venda onde você deixa mercadoria
create table if not exists revenda_pdvs (
  id uuid default gen_random_uuid() primary key,
  nome text not null,                    -- ex: "Bar do Zé", "Mercadinho Central"
  contato text,
  endereco text,
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- Movimentações: cada linha = uma transação (entrada ou saída)
create table if not exists revenda_movimentacoes (
  id uuid default gen_random_uuid() primary key,
  tipo text not null check (tipo in ('entrada','saida')),
  data date not null default current_date,
  ref_mes text,                          -- ex: "2025-11" (mês referência)
  natureza_id uuid references revenda_naturezas(id) on delete set null,
  atributo_id uuid references revenda_atributos(id) on delete set null,
  quantidade integer not null,
  -- Preços (variam por negociação)
  valor_compra_unitario numeric(10,2),   -- custo unitário de compra
  valor_compra_total numeric(10,2) generated always as (quantidade * valor_compra_unitario) stored,
  valor_venda_unitario numeric(10,2),    -- preço de venda unitário
  valor_venda_total numeric(10,2) generated always as (quantidade * valor_venda_unitario) stored,
  valor_acerto numeric(10,2),            -- valor efetivamente recebido/acertado
  -- Campos de ENTRADA
  fornecedor_id uuid references revenda_fornecedores(id) on delete set null,
  nota_fiscal text,
  -- Campos de SAÍDA
  pdv_id uuid references revenda_pdvs(id) on delete set null,
  status_pagamento text default 'pendente', -- pendente | pago (só saída)
  data_pagamento date,
  is_perda boolean default false,          -- true = perda (não volta ao estoque)
  -- Comuns
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- ── 3. VEÍCULOS (motos e carros) ────────────────────────

create table if not exists veiculos (
  id uuid default gen_random_uuid() primary key,
  modelo text not null,                  -- ex: "Bros ESDD", "Nissan Versa Unique 1.6"
  ano text,                              -- ex: "2022/2023"
  tipo text not null default 'moto',     -- moto | carro
  placa text,
  renavam text,
  chassi text,
  -- Compra
  compra_valor numeric(10,2),
  compra_data date,
  compra_km integer,
  -- Venda
  venda_valor numeric(10,2),
  venda_data date,
  venda_km integer,
  -- Controle
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

create table if not exists veiculos_abastecimentos (
  id uuid default gen_random_uuid() primary key,
  veiculo_id uuid references veiculos(id) on delete cascade,
  data date not null default current_date,
  km integer,
  litros numeric(10,2) not null,
  valor_litro numeric(10,2) not null,
  valor_total numeric(10,2),
  combustivel text default 'gasolina_comum', -- gasolina_comum | gasolina_aditivada
  posto text,
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

create table if not exists veiculos_manutencoes (
  id uuid default gen_random_uuid() primary key,
  veiculo_id uuid references veiculos(id) on delete cascade,
  data date not null default current_date,
  km integer,
  descricao text not null,               -- ex: "Troca de óleo"
  valor numeric(10,2) not null,
  local text,
  observacao text,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- ── 4. LEMBRETES ────────────────────────────────────────

create table if not exists lembretes (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descricao text,
  data date not null,
  hora time,
  concluido boolean default false,
  prioridade text default 'normal',      -- baixa | normal | alta
  created_at timestamptz default now(),
  deleted_at timestamptz,
  user_id uuid references auth.users(id)
);

-- ── RLS (Row Level Security) ────────────────────────────

alter table gelo_producao enable row level security;
alter table gelo_vendas enable row level security;
alter table gelo_despesas enable row level security;
alter table revenda_naturezas enable row level security;
alter table revenda_atributos enable row level security;
alter table revenda_fornecedores enable row level security;
alter table revenda_pdvs enable row level security;
alter table revenda_movimentacoes enable row level security;
alter table veiculos enable row level security;
alter table veiculos_abastecimentos enable row level security;
alter table veiculos_manutencoes enable row level security;
alter table lembretes enable row level security;

-- Políticas: cada user vê apenas seus dados
create policy "user_own_data" on gelo_producao for all using (auth.uid() = user_id);
create policy "user_own_data" on gelo_vendas for all using (auth.uid() = user_id);
create policy "user_own_data" on gelo_despesas for all using (auth.uid() = user_id);
create policy "user_own_data" on revenda_naturezas for all using (auth.uid() = user_id);
create policy "user_own_data" on revenda_atributos for all using (auth.uid() = user_id);
create policy "user_own_data" on revenda_fornecedores for all using (auth.uid() = user_id);
create policy "user_own_data" on revenda_pdvs for all using (auth.uid() = user_id);
create policy "user_own_data" on revenda_movimentacoes for all using (auth.uid() = user_id);
create policy "user_own_data" on veiculos for all using (auth.uid() = user_id);
create policy "user_own_data" on veiculos_abastecimentos for all using (auth.uid() = user_id);
create policy "user_own_data" on veiculos_manutencoes for all using (auth.uid() = user_id);
create policy "user_own_data" on lembretes for all using (auth.uid() = user_id);
