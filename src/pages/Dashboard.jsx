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
    agendamentosAbertos: 0,
    agendamentosAtrasados: 0,
  });

  const [geloEstoque, setGeloEstoque] = useState([]);
  const [geloProducaoHoje, setGeloProducaoHoje] = useState(0);
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);
  const [lastAbastData, setLastAbastData] = useState(null);
  const [lastManutData, setLastManutData] = useState(null);
  const [veiculosInfo, setVeiculosInfo] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    const [
      { count: geloHoje },
      { data: geloVendas },
      { data: geloEstoqueData },
      { data: geloProducaoData },
      { count: revendaPendentes },
      { data: veiculosData },
      { count: agendamentosAbertos },
      { count: agendamentosAtrasados },
      { data: proxAgendamentos },
      { data: lastAbast },
      { data: lastManut },
      { data: allAbast },
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
        .from("gelo_custos")
        .select("descricao, categoria, estoque_atual")
        .is("deleted_at", null)
        .not("estoque_atual", "is", null),
      supabase
        .from("gelo_producao")
        .select("quantidade")
        .is("deleted_at", null)
        .gte("data", sevenDaysAgo),
      supabase
        .from("revenda_mov_saidas")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .neq("status_pagamento", "pago"),
      supabase
        .from("veiculos")
        .select("id, modelo, placa, venda_data, created_at")
        .is("deleted_at", null),
      supabase
        .from("agendamentos")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("concluido", false),
      supabase
        .from("agendamentos")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("concluido", false)
        .lt("agendado_para", today),
      supabase
        .from("agendamentos")
        .select("*")
        .is("deleted_at", null)
        .eq("concluido", false)
        .gte("agendado_para", today)
        .order("agendado_para")
        .limit(5),
      supabase
        .from("veiculos_abastecimentos")
        .select("data")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(1),
      supabase
        .from("veiculos_manutencoes")
        .select("data")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(1),
      supabase
        .from("veiculos_abastecimentos")
        .select("veiculo_id, data, km, litros")
        .is("deleted_at", null)
        .order("data", { ascending: true }),
    ]);

    const vendasHoje = (geloVendas || []).reduce(
      (s, v) => s + Number(v.valor_total || 0),
      0,
    );

    setStats({
      geloHoje: geloHoje || 0,
      geloVendasHoje: vendasHoje,
      revendaPendentes: revendaPendentes || 0,
      veiculosTotal: (veiculosData || []).length,
      agendamentosAbertos: agendamentosAbertos || 0,
      agendamentosAtrasados: agendamentosAtrasados || 0,
    });
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
    setProximosAgendamentos(proxAgendamentos || []);
    // Last abastecimento/manutencao dates
    if (lastAbast && lastAbast.length > 0) setLastAbastData(lastAbast[0].data);
    if (lastManut && lastManut.length > 0) setLastManutData(lastManut[0].data);
    // Build veiculosInfo for non-sold vehicles
    const activeVeiculos = (veiculosData || []).filter((v) => !v.venda_data);
    const abastByVeiculo = {};
    (allAbast || []).forEach((a) => {
      if (!abastByVeiculo[a.veiculo_id]) abastByVeiculo[a.veiculo_id] = [];
      abastByVeiculo[a.veiculo_id].push(a);
    });
    const vInfo = activeVeiculos.map((v) => {
      const abasts = (abastByVeiculo[v.id] || []).filter((a) => a.km != null);
      // km/L: total km driven / total litros
      let kmLitro = null;
      if (abasts.length >= 2) {
        const totalLitros = abasts
          .slice(1)
          .reduce((s, a) => s + (Number(a.litros) || 0), 0);
        const kmDriven =
          Number(abasts[abasts.length - 1].km) - Number(abasts[0].km);
        if (totalLitros > 0 && kmDriven > 0)
          kmLitro = (kmDriven / totalLitros).toFixed(1);
      }
      // km/mês: (last km - first km) / months between
      let kmMes = null;
      if (abasts.length >= 2) {
        const first = new Date(abasts[0].data + "T00:00:00");
        const last = new Date(abasts[abasts.length - 1].data + "T00:00:00");
        const months = (last - first) / (30.44 * 86400000);
        const kmDriven =
          Number(abasts[abasts.length - 1].km) - Number(abasts[0].km);
        if (months > 0 && kmDriven > 0) kmMes = Math.round(kmDriven / months);
      }
      return { id: v.id, modelo: v.modelo, placa: v.placa, kmLitro, kmMes };
    });
    setVeiculosInfo(vInfo);
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
    },
    {
      to: "/veiculos",
      icon: Car,
      iconBg: "bg-accent-50",
      iconColor: "text-accent-500",
      label: "Veículos",
      value: "",
      extra: (
        <div className="mt-1.5 space-y-1">
          {veiculosInfo.map((v) => (
            <div key={v.id} className="flex gap-2 items-center text-xs">
              <span className="font-semibold text-text-primary truncate">
                {v.modelo}
              </span>
              <span className="text-text-secondary whitespace-nowrap">
                {v.kmLitro ?? "—"}{" "}
                <span className="text-text-disabled">km/L</span>
              </span>
              <span className="text-text-secondary whitespace-nowrap">
                {v.kmMes != null ? v.kmMes.toLocaleString("pt-BR") : "—"}{" "}
                <span className="text-text-disabled">km/mês</span>
              </span>
            </div>
          ))}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-xs text-text-secondary">
              Últ. abast.:{" "}
              <span className="font-semibold text-text-primary">
                {lastAbastData ? fmtDate(lastAbastData) : "—"}
              </span>
            </span>
            <span className="text-xs text-text-secondary">
              Últ. manut.:{" "}
              <span className="font-semibold text-text-primary">
                {lastManutData ? fmtDate(lastManutData) : "—"}
              </span>
            </span>
          </div>
        </div>
      ),
    },
    {
      to: "/agendamentos",
      icon: Bell,
      iconBg: stats.agendamentosAtrasados > 0 ? "bg-red-50" : "bg-primary-50",
      iconColor:
        stats.agendamentosAtrasados > 0 ? "text-error" : "text-primary-500",
      label: "Agendamentos",
      value: `${stats.agendamentosAbertos} pendentes${stats.agendamentosAtrasados > 0 ? ` · ${stats.agendamentosAtrasados} atrasados` : ""}`,
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
    <div className="space-y-6 -mx-2">
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
              {card.value && (
                <p className="text-base font-semibold text-text-primary truncate">
                  {card.value}
                </p>
              )}
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
              {card.extra}
            </div>
            <ArrowRight
              size={16}
              className="text-text-disabled group-hover:text-primary-500 transition-colors shrink-0"
            />
          </Link>
        ))}
      </div>

      {/* Próximos agendamentos */}
      {proximosAgendamentos.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border-custom p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <CalendarClock size={16} />
              Próximos agendamentos
            </h2>
            <Link
              to="/agendamentos"
              className="text-xs text-primary-500 font-medium hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {proximosAgendamentos.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-1.5">
                <div
                  className={`h-2 w-2 rounded-full shrink-0 ${l.prioridade === "alta" ? "bg-error" : l.prioridade === "normal" ? "bg-accent-500" : "bg-text-disabled"}`}
                />
                <span className="text-sm font-medium text-text-primary truncate flex-1">
                  {l.titulo}
                </span>
                <span className="text-xs text-text-secondary shrink-0">
                  {l.agendado_para?.slice(0, 10) === today
                    ? "Hoje"
                    : fmtDate(l.agendado_para?.slice(0, 10))}
                  {l.agendado_para ? ` · ${l.agendado_para.slice(11, 16)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de atrasados */}
      {stats.agendamentosAtrasados > 0 && (
        <Link
          to="/agendamentos"
          className="flex items-center gap-3 bg-red-50 border border-error/20 rounded-xl p-4 hover:border-error/40 transition-colors"
        >
          <AlertTriangle className="text-error shrink-0" size={20} />
          <p className="text-sm text-error font-medium">
            Você tem {stats.agendamentosAtrasados} agendamento
            {stats.agendamentosAtrasados > 1 ? "s" : ""} atrasado
            {stats.agendamentosAtrasados > 1 ? "s" : ""}!
          </p>
        </Link>
      )}
    </div>
  );
}
