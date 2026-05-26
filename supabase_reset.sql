-- ══════════════════════════════════════════════════════════
-- Campos Core - RESET COMPLETO DO BANCO
-- ⚠️  CUIDADO: Este script APAGA TODOS os dados e tabelas!
-- Execute no Supabase SQL Editor ANTES do supabase_schema.sql
-- ══════════════════════════════════════════════════════════

-- 1. Dropar políticas RLS (todas do schema public)
do $$
declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 2. Dropar todas as tabelas (ordem correta por dependências)
drop table if exists revenda_movimentacao_itens cascade;
drop table if exists revenda_movimentacoes cascade;
drop table if exists revenda_variacao_atributos cascade;
drop table if exists revenda_variacoes cascade;
drop table if exists revenda_atributo_valores cascade;
drop table if exists revenda_atributos cascade;
drop table if exists revenda_naturezas cascade;
drop table if exists revenda_fornecedores cascade;
drop table if exists revenda_pdvs cascade;
drop table if exists revenda_produtos cascade;
drop table if exists revenda_itens cascade;

drop table if exists veiculos_abastecimentos cascade;
drop table if exists veiculos_manutencoes cascade;
drop table if exists veiculos cascade;

drop table if exists gelo_vendas cascade;
drop table if exists gelo_producao cascade;
drop table if exists gelo_custos cascade;
drop table if exists gelo_custo_embalagens cascade;

drop table if exists agendamentos cascade;
