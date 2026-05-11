import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Snowflake,
  Package,
  Car,
  Bell,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);
const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
  .toISOString()
  .slice(0, 10);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    geloHoje: 0,
    geloVendasHoje: 0,
    revendaPendentes: 0,
    veiculosTotal: 0,
    lembretesAbertos: 0,
    lembretesAtrasados: 0,
  });
  const [revendaEstoque, setRevendaEstoque] = useState([]);
  const [geloEstoque, setGeloEstoque] = useState([]);
  const [geloProducaoHoje, setGeloProducaoHoje] = useState(0);
  const [proximosLembretes, setProximosLembretes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    const [
      { count: geloHoje },
      { data: geloVendas },
      { data: geloEstoqueData },
      { data: geloProducaoData },
      { data: revendaMovs },
      { data: revendaNaturezas },
      { count: revendaPendentes },
      { count: veiculosTotal },
      { count: lembretesAbertos },
      { count: lembretesAtrasados },
      { data: proxLembretes },
    ] = await Promise.all([
      supabase
        .from("gelo_producao")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("data", today),
      supabase
        .from("gelo_vendas")
        .select("valor_total")
        .is("deleted_at", null)
        .eq("data", today),
      supabase
        .from("gelo_despesas")
        .select("descricao, categoria, estoque_atual")
        .is("deleted_at", null)
        .not("estoque_atual", "is", null),
      supabase
        .from("gelo_producao")
        .select("quantidade")
        .is("deleted_at", null)
        .gte("data", sevenDaysAgo),
      supabase
        .from("revenda_movimentacoes")
        .select("tipo, natureza_id, quantidade")
        .is("deleted_at", null),
      supabase
        .from("revenda_produtos")
        .select("id, nome")
        .is("deleted_at", null),
      supabase
        .from("revenda_movimentacoes")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("tipo", "saida")
        .eq("status_pagamento", "pendente"),
      supabase
        .from("veiculos")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("lembretes")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("concluido", false),
      supabase
        .from("lembretes")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("concluido", false)
        .lt("data", today),
      supabase
        .from("lembretes")
        .select("*")
        .is("deleted_at", null)
        .eq("concluido", false)
        .gte("data", today)
        .order("data")
        .order("hora", { nullsFirst: false })
        .limit(5),
    ]);

    const vendasHoje = (geloVendas || []).reduce(
      (s, v) => s + Number(v.valor_total || 0),
      0,
    );

    // Calcular estoque por produto (entradas - saídas)
    const estoqueMap = {};
    (revendaMovs || []).forEach((m) => {
      if (!m.natureza_id) return;
      if (!estoqueMap[m.natureza_id]) estoqueMap[m.natureza_id] = 0;
      estoqueMap[m.natureza_id] +=
        m.tipo === "entrada" ? m.quantidade : -m.quantidade;
    });
    const nomeMap = {};
    (revendaNaturezas || []).forEach((n) => {
      nomeMap[n.id] = n.nome;
    });
    const estoque = Object.entries(estoqueMap)
      .filter(([id]) => nomeMap[id])
      .map(([id, qty]) => ({ nome: nomeMap[id], qty }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    setStats({
      geloHoje: geloHoje || 0,
      geloVendasHoje: vendasHoje,
      revendaPendentes: revendaPendentes || 0,
      veiculosTotal: veiculosTotal || 0,
      lembretesAbertos: lembretesAbertos || 0,
      lembretesAtrasados: lembretesAtrasados || 0,
    });
    setRevendaEstoque(estoque);
    // Gelo estoque (agrupar por descricao, somar estoque_atual)
    const geloEstMap = {};
    (geloEstoqueData || []).forEach((d) => {
      const key = d.descricao || d.categoria || "Outros";
      if (!geloEstMap[key]) geloEstMap[key] = 0;
      geloEstMap[key] += d.estoque_atual;
    });
    setGeloEstoque(
      Object.entries(geloEstMap)
        .map(([nome, qty]) => ({ nome, qty }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    );
    // Gelo produção hoje (soma sacos)
    const totalProd = (geloProducaoData || []).reduce(
      (s, p) => s + Number(p.quantidade || 0),
      0,
    );
    setGeloProducaoHoje(totalProd);
    setProximosLembretes(proxLembretes || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fmtMoney = (v) => `R$ ${Number(v).toFixed(2)}`;
  const fmtDate = (d) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  const cards = [
    {
      to: "/gelo",
      icon: Snowflake,
      iconBg: "bg-accent-50",
      iconColor: "text-accent-500",
      label: "Gelo · 7 dias",
      value: `${geloProducaoHoje} sacos produzidos`,
      estoque: geloEstoque,
    },
    {
      to: "/revenda",
      icon: Package,
      iconBg: stats.revendaPendentes > 0 ? "bg-warning/10" : "bg-primary-50",
      iconColor:
        stats.revendaPendentes > 0 ? "text-warning" : "text-primary-500",
      label: "Revenda",
      value:
        stats.revendaPendentes > 0
          ? `${stats.revendaPendentes} saídas pendentes`
          : "Nenhuma pendência",
      estoque: revendaEstoque,
    },
    {
      to: "/veiculos",
      icon: Car,
      iconBg: "bg-accent-50",
      iconColor: "text-accent-500",
      label: "Veículos",
      value: `${stats.veiculosTotal} veículos`,
    },
    {
      to: "/lembretes",
      icon: Bell,
      iconBg: stats.lembretesAtrasados > 0 ? "bg-red-50" : "bg-primary-50",
      iconColor:
        stats.lembretesAtrasados > 0 ? "text-error" : "text-primary-500",
      label: "Lembretes",
      value: `${stats.lembretesAbertos} pendentes${stats.lembretesAtrasados > 0 ? ` · ${stats.lembretesAtrasados} atrasados` : ""}`,
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Bem-vindo de volta! Aqui está seu resumo.
        </p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="bg-surface rounded-2xl border border-border-custom p-5 flex items-center gap-4 hover:border-primary-300 transition-colors group"
          >
            <div
              className={`h-12 w-12 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}
            >
              <card.icon className={card.iconColor} size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-secondary">{card.label}</p>
              <p className="text-base font-semibold text-text-primary truncate">
                {card.value}
              </p>
              {card.estoque && card.estoque.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {card.estoque.map((e) => (
                    <span key={e.nome} className="text-xs text-text-secondary">
                      {e.nome}:{" "}
                      <span
                        className={`font-semibold ${e.qty <= 0 ? "text-error" : "text-text-primary"}`}
                      >
                        {e.qty}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ArrowRight
              size={16}
              className="text-text-disabled group-hover:text-primary-500 transition-colors shrink-0"
            />
          </Link>
        ))}
      </div>

      {/* Próximos lembretes */}
      {proximosLembretes.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border-custom p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <CalendarClock size={16} />
              Próximos lembretes
            </h2>
            <Link
              to="/lembretes"
              className="text-xs text-primary-500 font-medium hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {proximosLembretes.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-1.5">
                <div
                  className={`h-2 w-2 rounded-full shrink-0 ${l.prioridade === "alta" ? "bg-error" : l.prioridade === "normal" ? "bg-accent-500" : "bg-text-disabled"}`}
                />
                <span className="text-sm font-medium text-text-primary truncate flex-1">
                  {l.titulo}
                </span>
                <span className="text-xs text-text-secondary shrink-0">
                  {l.data === today ? "Hoje" : fmtDate(l.data)}
                  {l.hora ? ` · ${l.hora.slice(0, 5)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de atrasados */}
      {stats.lembretesAtrasados > 0 && (
        <Link
          to="/lembretes"
          className="flex items-center gap-3 bg-red-50 border border-error/20 rounded-xl p-4 hover:border-error/40 transition-colors"
        >
          <AlertTriangle className="text-error shrink-0" size={20} />
          <p className="text-sm text-error font-medium">
            Você tem {stats.lembretesAtrasados} lembrete
            {stats.lembretesAtrasados > 1 ? "s" : ""} atrasado
            {stats.lembretesAtrasados > 1 ? "s" : ""}!
          </p>
        </Link>
      )}
    </div>
  );
}
