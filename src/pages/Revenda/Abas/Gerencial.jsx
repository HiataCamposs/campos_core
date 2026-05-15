import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  ChevronDown,
  ShoppingCart,
  Hash,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";

const today = new Date().toLocaleDateString("sv-SE", {
  timeZone: "America/Sao_Paulo",
});

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
};

const fmtMoney = (v) =>
  v != null
    ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const fmtPct = (v) => (v != null ? `${Number(v).toFixed(1)}%` : "—");

const PIE_COLORS = [
  "#1f5f8b",
  "#fb642c",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

const CustomTooltipPie = ({ active, payload }) => {
  if (active && payload?.[0]) {
    return (
      <div className="bg-surface border border-border-custom rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-text-secondary">{fmtMoney(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const CustomTooltipBar = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface border border-border-custom rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold mb-1">
          {label.length === 7
            ? (() => { const [y, m] = label.split("-"); return `${m}/${y}`; })()
            : new Date(label + "T00:00:00").toLocaleDateString("pt-BR")}
        </p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === "faturamento" ? "Faturamento" : "Lucro"}:{" "}
            {fmtMoney(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Gerencial() {
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today);
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("");
  const [loading, setLoading] = useState(true);

  // Raw data
  const [saidas, setSaidas] = useState([]);
  const [saidaItens, setSaidaItens] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [
      { data: saidasData },
      { data: pdvsData },
      { data: produtosData },
      { data: formasData },
    ] = await Promise.all([
      supabase
        .from("revenda_mov_saidas")
        .select("id, data, pdv_id, status_pagamento, is_perda")
        .is("deleted_at", null)
        .gte("data", startDate)
        .lte("data", endDate),
      supabase.from("revenda_pdvs").select("id, nome").is("deleted_at", null),
      supabase
        .from("revenda_produtos")
        .select("id, nome, natureza")
        .is("deleted_at", null),
      supabase
        .from("revenda_formas_pagamento")
        .select("id, nome")
        .is("deleted_at", null),
    ]);

    const saidasArr = (saidasData || []).filter((s) => !s.is_perda);
    const saidaIds = saidasArr.map((s) => s.id);
    setSaidas(saidasArr);
    setPdvs(pdvsData || []);
    setProdutos(produtosData || []);
    setFormasPagamento(formasData || []);

    if (saidaIds.length > 0) {
      const [{ data: itensData }, { data: transData }] = await Promise.all([
        supabase
          .from("revenda_mov_saidas_itens")
          .select(
            "mov_id, produto_id, quantidade, valor_compra_unitario, valor_venda_unitario",
          )
          .in("mov_id", saidaIds),
        supabase
          .from("revenda_saida_transacoes")
          .select("mov_id, forma_pagamento_id, valor, data")
          .in("mov_id", saidaIds),
      ]);
      setSaidaItens(itensData || []);
      setTransacoes(transData || []);
    } else {
      setSaidaItens([]);
      setTransacoes([]);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    const _ignore = fetchData();
  }, [fetchData]);

  // ── Naturezas únicas ──
  const naturezasUnicas = useMemo(() => {
    const set = new Set(produtos.map((p) => p.natureza).filter(Boolean));
    return [...set].sort();
  }, [produtos]);

  // ── Filtered data ──
  const filteredProdutoIds = useMemo(() => {
    let prods = produtos;
    if (filtroNatureza)
      prods = prods.filter((p) => p.natureza === filtroNatureza);
    if (filtroProduto) prods = prods.filter((p) => p.id === filtroProduto);
    return new Set(prods.map((p) => p.id));
  }, [produtos, filtroProduto, filtroNatureza]);

  const filteredItens = useMemo(() => {
    if (!filtroProduto && !filtroNatureza) return saidaItens;
    return saidaItens.filter((it) => filteredProdutoIds.has(it.produto_id));
  }, [saidaItens, filtroProduto, filtroNatureza, filteredProdutoIds]);

  const filteredSaidas = useMemo(() => {
    if (!filtroProduto && !filtroNatureza) return saidas;
    const movIds = new Set(filteredItens.map((it) => it.mov_id));
    return saidas.filter((s) => movIds.has(s.id));
  }, [saidas, filteredItens, filtroProduto, filtroNatureza]);

  // ── Computed KPIs ──
  const kpis = useMemo(() => {
    let faturamento = 0;
    let lucro = 0;
    for (const it of filteredItens) {
      const qty = Number(it.quantidade) || 0;
      const venda = Number(it.valor_venda_unitario) || 0;
      const compra = Number(it.valor_compra_unitario) || 0;
      faturamento += qty * venda;
      lucro += qty * (venda - compra);
    }
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    const inadimplencia = filteredSaidas.filter(
      (s) => s.status_pagamento !== "pago",
    ).length;
    const pedidos = filteredSaidas.length;
    let itensNegociados = 0;
    for (const it of filteredItens) {
      itensNegociados += Number(it.quantidade) || 0;
    }
    return {
      faturamento,
      lucro,
      margem,
      inadimplencia,
      pedidos,
      itensNegociados,
    };
  }, [filteredItens, filteredSaidas]);

  // ── Pie: Métodos de pagamento ──
  const pieData = useMemo(() => {
    const map = {};
    for (const t of transacoes) {
      const fid = t.forma_pagamento_id;
      map[fid] = (map[fid] || 0) + Number(t.valor);
    }
    return Object.entries(map)
      .map(([fid, valor]) => ({
        name: formasPagamento.find((f) => f.id === fid)?.nome || "Outro",
        value: Math.round(valor * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transacoes, formasPagamento]);

  // ── Bar: Evolução diária ──
  const barData = useMemo(() => {
    const map = {};
    const saidaDateMap = {};
    for (const s of filteredSaidas) saidaDateMap[s.id] = s.data;

    for (const it of filteredItens) {
      const d = saidaDateMap[it.mov_id];
      if (!d) continue;
      const m = d.slice(0, 7); // yyyy-MM
      if (!map[m]) map[m] = { date: m, faturamento: 0, lucro: 0 };
      const qty = Number(it.quantidade) || 0;
      const venda = Number(it.valor_venda_unitario) || 0;
      const compra = Number(it.valor_compra_unitario) || 0;
      map[m].faturamento += qty * venda;
      map[m].lucro += qty * (venda - compra);
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredItens, filteredSaidas]);

  // ── Top PDVs ──
  const topPdvs = useMemo(() => {
    const saidaDateMap = {};
    for (const s of saidas) saidaDateMap[s.id] = s.pdv_id;

    const map = {};
    for (const it of saidaItens) {
      const pid = saidaDateMap[it.mov_id];
      if (!pid) continue;
      if (!map[pid]) map[pid] = { faturamento: 0, lucro: 0 };
      const qty = Number(it.quantidade) || 0;
      const venda = Number(it.valor_venda_unitario) || 0;
      const compra = Number(it.valor_compra_unitario) || 0;
      map[pid].faturamento += qty * venda;
      map[pid].lucro += qty * (venda - compra);
    }
    return Object.entries(map)
      .map(([pid, v]) => ({
        nome: pdvs.find((p) => p.id === pid)?.nome || "—",
        faturamento: v.faturamento,
        lucro: v.lucro,
        margem: v.faturamento > 0 ? (v.lucro / v.faturamento) * 100 : 0,
      }))
      .sort((a, b) => b.lucro - a.lucro)
      .slice(0, 10);
  }, [saidaItens, saidas, pdvs]);

  // ── Performance Produtos ──
  const topProdutos = useMemo(() => {
    const map = {};
    for (const it of filteredItens) {
      const pid = it.produto_id;
      if (!map[pid]) map[pid] = { qty: 0, totalCompra: 0, totalVenda: 0 };
      const qty = Number(it.quantidade) || 0;
      const venda = Number(it.valor_venda_unitario) || 0;
      const compra = Number(it.valor_compra_unitario) || 0;
      map[pid].qty += qty;
      map[pid].totalCompra += qty * compra;
      map[pid].totalVenda += qty * venda;
    }
    return Object.entries(map)
      .map(([pid, v]) => ({
        nome: produtos.find((p) => p.id === pid)?.nome || "—",
        quantidade: v.qty,
        custoMedio: v.qty > 0 ? v.totalCompra / v.qty : 0,
        vendaMedio: v.qty > 0 ? v.totalVenda / v.qty : 0,
        margem:
          v.totalVenda > 0
            ? ((v.totalVenda - v.totalCompra) / v.totalVenda) * 100
            : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredItens, produtos]);

  // ── Preset buttons ──
  const presets = [
    { label: "7d", days: 7 },
    { label: "15d", days: 15 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
  ];

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <div className="bg-surface rounded-xl border border-border-custom p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-border-custom bg-bg px-2 py-1.5 text-sm"
            />
            <span className="text-text-disabled text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-border-custom bg-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setStartDate(daysAgo(p.days));
                  setEndDate(today);
                }}
                className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                  startDate === daysAgo(p.days) && endDate === today
                    ? "bg-accent-500 text-white"
                    : "bg-surface-alt text-text-secondary hover:text-text-primary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <select
            value={filtroNatureza}
            onChange={(e) => {
              setFiltroNatureza(e.target.value);
              setFiltroProduto("");
            }}
            className="rounded-lg border border-border-custom bg-bg px-2 py-1.5 text-sm min-w-0 flex-1"
          >
            <option value="">Todas naturezas</option>
            {naturezasUnicas.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={filtroProduto}
            onChange={(e) => setFiltroProduto(e.target.value)}
            className="rounded-lg border border-border-custom bg-bg px-2 py-1.5 text-sm min-w-0 flex-1"
          >
            <option value="">Todos produtos</option>
            {produtos
              .filter((p) => !filtroNatureza || p.natureza === filtroNatureza)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              {
                label: "Faturamento",
                value: fmtMoney(kpis.faturamento),
                icon: DollarSign,
                color: "text-accent-500",
                bg: "bg-accent-50",
              },
              {
                label: "Lucro Bruto",
                value: fmtMoney(kpis.lucro),
                icon: TrendingUp,
                color: kpis.lucro >= 0 ? "text-success" : "text-error",
                bg: kpis.lucro >= 0 ? "bg-success/10" : "bg-error/10",
              },
              {
                label: "Margem",
                value: fmtPct(kpis.margem),
                icon: Percent,
                color: "text-accent-500",
                bg: "bg-accent-50",
              },
              {
                label: "Inadimplentes",
                value: kpis.inadimplencia,
                icon: AlertTriangle,
                color: kpis.inadimplencia > 0 ? "text-warning" : "text-success",
                bg: kpis.inadimplencia > 0 ? "bg-warning/10" : "bg-success/10",
              },
              {
                label: "Pedidos",
                value: kpis.pedidos,
                icon: ShoppingCart,
                color: "text-accent-500",
                bg: "bg-accent-50",
              },
              {
                label: "Itens",
                value: kpis.itensNegociados,
                icon: Hash,
                color: "text-accent-500",
                bg: "bg-accent-50",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="bg-surface rounded-xl border border-border-custom px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div
                    className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${kpi.bg}`}
                  >
                    <kpi.icon className={kpi.color} size={11} />
                  </div>
                  <span className="text-[9px] text-text-disabled uppercase font-semibold tracking-wider truncate">
                    {kpi.label}
                  </span>
                </div>
                <p
                  className={`text-sm font-bold whitespace-nowrap ${kpi.color}`}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Pie: Pagamentos */}
            <div className="bg-surface rounded-xl border border-border-custom p-2.5">
              <h3 className="text-sm font-semibold text-text-primary mb-1.5">
                Métodos de Pagamento
              </h3>
              {pieData.length === 0 ? (
                <p className="text-xs text-text-disabled text-center py-4">
                  Sem transações no período
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      style={{ fontSize: 10 }}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltipPie />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bar: Evolução */}
            <div className="bg-surface rounded-xl border border-border-custom p-3">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Evolução de Vendas
              </h3>
              {barData.length === 0 ? (
                <p className="text-xs text-text-disabled text-center py-8">
                  Sem vendas no período
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const [y, m] = d.split("-");
                        return `${m}/${y}`;
                      }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltipBar />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: 11, top: -10, right: 0 }}
                      formatter={(v) =>
                        v === "faturamento" ? "Faturamento" : "Lucro"
                      }
                    />
                    <Bar
                      dataKey="faturamento"
                      fill="#1f5f8b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="lucro" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top PDVs */}
          <div className="bg-surface rounded-xl border border-border-custom overflow-hidden">
            <h3 className="text-xs font-semibold text-text-primary p-3 pb-0">
              Top 10 PDVs por Rentabilidade
            </h3>
            {topPdvs.length === 0 ? (
              <p className="text-xs text-text-disabled text-center py-6">
                Sem dados no período
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] mt-2">
                  <thead>
                    <tr className="bg-surface-alt text-[10px] text-text-disabled uppercase tracking-wider">
                      <th className="text-left px-2 py-1.5 font-semibold">
                        PDV
                      </th>
                      <th className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">
                        Faturamento
                      </th>
                      <th className="text-right px-5 py-1.5 font-semibold whitespace-nowrap">
                        Lucro
                      </th>
                      <th className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">
                        Margem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPdvs.map((p, i) => (
                      <tr
                        key={i}
                        className="border-t border-border-custom hover:bg-surface-alt/50"
                      >
                        <td className="px-2 py-1.5 font-medium text-text-primary whitespace-nowrap">
                          {p.nome}
                        </td>
                        <td className="px-2 py-1.5 text-right text-text-secondary whitespace-nowrap">
                          {fmtMoney(p.faturamento)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right font-medium whitespace-nowrap ${p.lucro >= 0 ? "text-success" : "text-error"}`}
                        >
                          {fmtMoney(p.lucro)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right whitespace-nowrap ${p.margem >= 20 ? "text-success" : p.margem >= 0 ? "text-warning" : "text-error"}`}
                        >
                          {fmtPct(p.margem)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Performance Produtos */}
          <div className="bg-surface rounded-xl border border-border-custom overflow-hidden">
            <h3 className="text-xs font-semibold text-text-primary p-3 pb-0">
              Performance de Produtos
            </h3>
            {topProdutos.length === 0 ? (
              <p className="text-xs text-text-disabled text-center py-6">
                Sem dados no período
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] mt-2">
                  <thead>
                    <tr className="bg-surface-alt text-[10px] text-text-disabled uppercase tracking-wider">
                      <th className="text-left px-2 py-1.5 font-semibold">
                        Produto
                      </th>
                      <th className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">
                        Qtd
                      </th>
                      <th className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">
                        Custo
                      </th>
                      <th className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">
                        Venda
                      </th>
                      <th className="text-right px-2 py-1.5 font-semibold whitespace-nowrap">
                        Margem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProdutos.map((p, i) => (
                      <tr
                        key={i}
                        className="border-t border-border-custom hover:bg-surface-alt/50"
                      >
                        <td className="px-2 py-1.5 font-medium text-text-primary whitespace-nowrap">
                          {p.nome}
                        </td>
                        <td className="px-2 py-1.5 text-right text-text-secondary whitespace-nowrap">
                          {p.quantidade}
                        </td>
                        <td className="px-2 py-1.5 text-right text-text-secondary whitespace-nowrap">
                          {fmtMoney(p.custoMedio)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-text-secondary whitespace-nowrap">
                          {fmtMoney(p.vendaMedio)}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-right font-medium whitespace-nowrap ${p.margem >= 20 ? "text-success" : p.margem >= 0 ? "text-warning" : "text-error"}`}
                        >
                          {fmtPct(p.margem)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
