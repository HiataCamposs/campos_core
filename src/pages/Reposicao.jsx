import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { useBottomTabs } from "../contexts/BottomTabsContext";
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  Snowflake,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  CalendarClock,
  Users,
  Zap,
  SlidersHorizontal,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);
const MS_PER_DAY = 86400000;

function diffDays(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor(
    (new Date(today + "T00:00:00") - new Date(dateStr + "T00:00:00")) /
      MS_PER_DAY,
  );
}

function fmtDate(d) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

// ── Risk score: 0 (safe) → 100 (critical) ──
function calcRiskScore(daysSince, avgInterval) {
  if (!avgInterval || avgInterval <= 0) return daysSince > 7 ? 80 : 40;
  const ratio = daysSince / avgInterval;
  if (ratio >= 2) return 100;
  if (ratio >= 1.5) return 90;
  if (ratio >= 1.2) return 75;
  if (ratio >= 1) return 60;
  if (ratio >= 0.8) return 40;
  if (ratio >= 0.5) return 20;
  return 10;
}

function riskLabel(score) {
  if (score >= 80)
    return {
      text: "Crítico",
      color: "text-red-600",
      bg: "bg-red-500/10",
      border: "border-red-500/40",
      icon: ShieldX,
    };
  if (score >= 60)
    return {
      text: "Atenção",
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/40",
      icon: ShieldAlert,
    };
  if (score >= 40)
    return {
      text: "Monitorar",
      color: "text-sky-600",
      bg: "bg-sky-500/10",
      border: "border-sky-500/40",
      icon: CalendarClock,
    };
  return {
    text: "Seguro",
    color: "text-green-600",
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    icon: ShieldCheck,
  };
}

// ── PDV Analytics Card ──
function PdvCard({ pdv, onContact }) {
  const [open, setOpen] = useState(false);
  const risk = riskLabel(pdv.riskScore);
  const RiskIcon = risk.icon;

  const predictedDate =
    pdv.avgInterval > 0 && pdv.lastDate
      ? new Date(
          new Date(pdv.lastDate + "T00:00:00").getTime() +
            pdv.avgInterval * MS_PER_DAY,
        )
          .toISOString()
          .slice(0, 10)
      : null;
  const daysUntilNext = predictedDate
    ? diffDays(today) - diffDays(predictedDate)
    : null;
  const isOverdue = daysUntilNext !== null && daysUntilNext < 0;

  return (
    <div
      className={`bg-surface rounded-xl border overflow-hidden transition-all ${risk.border}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Risk indicator */}
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${risk.bg}`}
        >
          <RiskIcon className={risk.color} size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{pdv.nome}</p>
            <span
              className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${risk.bg} ${risk.color}`}
            >
              {risk.text}
            </span>
          </div>
          <p className="text-xs text-text-disabled mt-0.5">
            {pdv.daysSince === Infinity ? (
              "Sem compras registradas"
            ) : (
              <>
                <span
                  className={
                    pdv.daysSince > (pdv.avgInterval || 7)
                      ? "text-red-500 font-medium"
                      : ""
                  }
                >
                  {pdv.daysSince}d sem comprar
                </span>
                {pdv.avgInterval > 0 && (
                  <> · ciclo ~{Math.round(pdv.avgInterval)}d</>
                )}
                {pdv.totalQty > 0 && <> · {pdv.totalQty} un total</>}
              </>
            )}
          </p>
        </div>

        {/* Score badge */}
        <div className="flex flex-col items-center shrink-0">
          <span className={`text-lg font-bold ${risk.color}`}>
            {pdv.riskScore}
          </span>
          <span className="text-[9px] text-text-disabled">risco</span>
        </div>

        {open ? (
          <ChevronUp size={14} className="text-text-disabled shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-text-disabled shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border-custom px-4 pb-4 pt-3 space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-alt rounded-lg p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">
                Última compra
              </p>
              <p className="text-sm font-semibold">
                {pdv.lastDate ? fmtDate(pdv.lastDate) : "—"}
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">
                Previsão próxima
              </p>
              <p
                className={`text-sm font-semibold ${isOverdue ? "text-red-500" : ""}`}
              >
                {predictedDate ? fmtDate(predictedDate) : "—"}
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">
                Qtd média/compra
              </p>
              <p className="text-sm font-semibold">
                {pdv.avgQty > 0 ? `${Math.round(pdv.avgQty)} un` : "—"}
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">
                Total compras
              </p>
              <p className="text-sm font-semibold">{pdv.purchaseCount}</p>
            </div>
            <div className="bg-surface-alt rounded-lg p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">
                Ticket médio
              </p>
              <p className="text-sm font-semibold">
                {pdv.avgTicket > 0
                  ? `R$ ${pdv.avgTicket.toFixed(2).replace(".", ",")}`
                  : "—"}
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg p-2.5">
              <p className="text-[10px] text-text-disabled mb-0.5">
                Receita total
              </p>
              <p className="text-sm font-semibold">
                {pdv.totalRevenue > 0
                  ? `R$ ${pdv.totalRevenue.toFixed(2).replace(".", ",")}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Last 5 purchases */}
          {pdv.recentSales.length > 0 && (
            <div>
              <p className="text-[10px] text-text-disabled mb-1.5 font-medium">
                ÚLTIMAS COMPRAS
              </p>
              <div className="space-y-1">
                {pdv.recentSales.slice(0, 5).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-text-secondary">
                      {fmtDate(s.data)}
                    </span>
                    <span className="text-text-primary font-medium">
                      {s.quantidade}x · R${" "}
                      {((s.valor_venda_unitario || 0) * s.quantidade)
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {pdv.contato && (
              <>
                <a
                  href={`https://wa.me/55${pdv.contato.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/10 text-green-600 text-xs font-medium rounded-lg py-2 hover:bg-green-500/20 transition-colors"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <a
                  href={`tel:${pdv.contato.replace(/\D/g, "")}`}
                  className="flex items-center justify-center gap-1.5 bg-sky-500/10 text-sky-600 text-xs font-medium rounded-lg py-2 px-4 hover:bg-sky-500/20 transition-colors"
                >
                  <Phone size={14} /> Ligar
                </a>
              </>
            )}
            <button
              onClick={() => onContact(pdv)}
              className="flex items-center justify-center gap-1.5 bg-primary-50 text-primary-500 text-xs font-medium rounded-lg py-2 px-4 hover:bg-primary-100 transition-colors"
            >
              <CalendarClock size={14} /> Agendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
export default function Reposicao() {
  const { setTabs } = useBottomTabs();
  const [loading, setLoading] = useState(true);
  const [pdvs, setPdvs] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [filtroNatureza, setFiltroNatureza] = useState("Gelo");
  const [showFiltros, setShowFiltros] = useState(false);

  // Bottom tabs (mobile)
  useEffect(() => {
    setTabs(null);
    return () => setTabs(null);
  }, [setTabs]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [
      { data: pdvData },
      { data: saidasData },
      { data: contatosData },
      { data: prodData },
    ] = await Promise.all([
      supabase
        .from("revenda_pdvs")
        .select("id, nome, natureza")
        .is("deleted_at", null)
        .order("nome"),
      supabase
        .from("revenda_mov_saidas")
        .select(
          "id, pdv_id, data, is_perda, revenda_mov_saidas_itens(natureza_id, quantidade, valor_venda_unitario, valor_compra_unitario)",
        )
        .is("deleted_at", null)
        .eq("is_perda", false)
        .order("data", { ascending: true }),
      supabase
        .from("cadastro_contatos")
        .select("entidade_id, telefone")
        .eq("entidade_tipo", "pdv")
        .is("deleted_at", null),
      supabase
        .from("revenda_produtos")
        .select("id, nome, natureza")
        .is("deleted_at", null),
    ]);
    // Flatten saidas: one row per item for analytics
    const flatSaidas = (saidasData || []).flatMap((s) =>
      (s.revenda_mov_saidas_itens || []).map((item) => ({
        pdv_id: s.pdv_id,
        data: s.data,
        natureza_id: item.natureza_id,
        quantidade: item.quantidade,
        valor_venda_unitario: item.valor_venda_unitario,
        valor_compra_unitario: item.valor_compra_unitario,
      })),
    );
    setPdvs(pdvData || []);
    setSaidas(flatSaidas);
    setContatos(contatosData || []);
    setProdutos(prodData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Unique product naturezas for filter ──
  const naturezaOptions = useMemo(() => {
    const unique = [
      ...new Set(produtos.map((p) => p.natureza).filter(Boolean)),
    ];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [produtos]);

  // ── Filtered saidas by product natureza ──
  const filteredSaidas = useMemo(() => {
    if (!filtroNatureza) return saidas;
    const prodIds = new Set(
      produtos.filter((p) => p.natureza === filtroNatureza).map((p) => p.id),
    );
    return saidas.filter((s) => prodIds.has(s.natureza_id));
  }, [saidas, produtos, filtroNatureza]);

  // ── Build analytics per PDV ──
  const analytics = useMemo(() => {
    return pdvs.map((pdv) => {
      const sales = filteredSaidas
        .filter((s) => s.pdv_id === pdv.id)
        .sort((a, b) => a.data.localeCompare(b.data));
      const contato = contatos.find((c) => c.entidade_id === pdv.id);

      const purchaseCount = sales.length;
      const totalQty = sales.reduce((s, x) => s + (x.quantidade || 0), 0);
      const totalRevenue = sales.reduce(
        (s, x) => s + (x.valor_venda_unitario || 0) * (x.quantidade || 0),
        0,
      );
      const avgQty = purchaseCount > 0 ? totalQty / purchaseCount : 0;
      const avgTicket = purchaseCount > 0 ? totalRevenue / purchaseCount : 0;
      const lastDate = sales.length > 0 ? sales[sales.length - 1].data : null;
      const daysSince = diffDays(lastDate);

      // Calculate average interval between purchases
      let avgInterval = 0;
      if (sales.length >= 2) {
        const intervals = [];
        for (let i = 1; i < sales.length; i++) {
          const gap = diffDays(sales[i - 1].data) - diffDays(sales[i].data);
          if (gap > 0) intervals.push(gap);
        }
        if (intervals.length > 0) {
          avgInterval = intervals.reduce((s, x) => s + x, 0) / intervals.length;
        }
      }

      const riskScore = calcRiskScore(daysSince, avgInterval);

      return {
        ...pdv,
        purchaseCount,
        totalQty,
        totalRevenue,
        avgQty,
        avgTicket,
        lastDate,
        daysSince,
        avgInterval,
        riskScore,
        contato: contato?.telefone || "",
        recentSales: [...sales].reverse().slice(0, 5),
      };
    });
  }, [pdvs, filteredSaidas, contatos]);

  // ── Filtered & sorted list ──
  const filtered = useMemo(() => {
    let list = [...analytics];
    if (filtro === "critico") list = list.filter((p) => p.riskScore >= 80);
    else if (filtro === "atencao")
      list = list.filter((p) => p.riskScore >= 60 && p.riskScore < 80);
    else if (filtro === "monitorar")
      list = list.filter((p) => p.riskScore >= 40 && p.riskScore < 60);
    else if (filtro === "seguro") list = list.filter((p) => p.riskScore < 40);
    return list.sort(
      (a, b) => b.riskScore - a.riskScore || b.daysSince - a.daysSince,
    );
  }, [analytics, filtro]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const criticos = analytics.filter((p) => p.riskScore >= 80).length;
    const atencao = analytics.filter(
      (p) => p.riskScore >= 60 && p.riskScore < 80,
    ).length;
    const ativos = analytics.filter((p) => p.purchaseCount > 0).length;
    const semCompra = analytics.filter((p) => p.purchaseCount === 0).length;
    return { criticos, atencao, ativos, semCompra, total: analytics.length };
  }, [analytics]);

  const handleContact = (pdv) => {
    // placeholder for future scheduling feature
    alert(
      `Agendar reposição para ${pdv.nome}\nPrevisão: ciclo de ~${Math.round(pdv.avgInterval || 0)} dias`,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const filtroOptions = [
    { key: "todos", label: "Todos", count: kpis.total },
    {
      key: "critico",
      label: "Críticos",
      count: kpis.criticos,
      color: "text-red-600",
    },
    {
      key: "atencao",
      label: "Atenção",
      count: kpis.atencao,
      color: "text-amber-600",
    },
    {
      key: "monitorar",
      label: "Monitorar",
      count: analytics.filter((p) => p.riskScore >= 40 && p.riskScore < 60)
        .length,
      color: "text-sky-600",
    },
    {
      key: "seguro",
      label: "Seguros",
      count: analytics.filter((p) => p.riskScore < 40).length,
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="text-amber-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">Reposição</h1>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setFiltro("critico")}
          className={`bg-surface rounded-xl border p-3 text-left transition-all ${filtro === "critico" ? "border-red-500/50 ring-1 ring-red-500/20" : "border-border-custom"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Flame className="text-red-500" size={14} />
            </div>
            <span className="text-2xl font-bold text-red-600">
              {kpis.criticos}
            </span>
          </div>
          <p className="text-[10px] text-text-disabled font-medium">CRÍTICOS</p>
        </button>

        <button
          onClick={() => setFiltro("atencao")}
          className={`bg-surface rounded-xl border p-3 text-left transition-all ${filtro === "atencao" ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-border-custom"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="text-amber-500" size={14} />
            </div>
            <span className="text-2xl font-bold text-amber-600">
              {kpis.atencao}
            </span>
          </div>
          <p className="text-[10px] text-text-disabled font-medium">ATENÇÃO</p>
        </button>

        <button
          onClick={() => setFiltro("todos")}
          className={`bg-surface rounded-xl border p-3 text-left transition-all ${filtro === "todos" ? "border-primary-500/50 ring-1 ring-primary-500/20" : "border-border-custom"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-accent-50 flex items-center justify-center">
              <Users className="text-accent-500" size={14} />
            </div>
            <span className="text-2xl font-bold text-accent-600">
              {kpis.ativos}
            </span>
          </div>
          <p className="text-[10px] text-text-disabled font-medium">
            CLIENTES ATIVOS
          </p>
        </button>

        <div className="bg-surface rounded-xl border border-border-custom p-3 text-left">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-surface-alt flex items-center justify-center">
              <Clock className="text-text-disabled" size={14} />
            </div>
            <span className="text-2xl font-bold text-text-secondary">
              {kpis.semCompra}
            </span>
          </div>
          <p className="text-[10px] text-text-disabled font-medium">
            SEM COMPRAS
          </p>
        </div>
      </div>

      {/* Risk distribution bar */}
      {analytics.length > 0 && (
        <div className="bg-surface rounded-xl border border-border-custom p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-text-secondary">
              Distribuição de risco
            </p>
            <p className="text-[10px] text-text-disabled">
              {analytics.length} PDVs
            </p>
          </div>
          <div className="flex rounded-full overflow-hidden h-2.5">
            {[
              {
                count: analytics.filter((p) => p.riskScore >= 80).length,
                color: "bg-red-500",
              },
              {
                count: analytics.filter(
                  (p) => p.riskScore >= 60 && p.riskScore < 80,
                ).length,
                color: "bg-amber-400",
              },
              {
                count: analytics.filter(
                  (p) => p.riskScore >= 40 && p.riskScore < 60,
                ).length,
                color: "bg-sky-400",
              },
              {
                count: analytics.filter((p) => p.riskScore < 40).length,
                color: "bg-green-400",
              },
            ].map((seg, i) =>
              seg.count > 0 ? (
                <div
                  key={i}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${(seg.count / analytics.length) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-text-disabled">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Crítico
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Atenção
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> Monitorar
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Seguro
            </span>
          </div>
        </div>
      )}

      {/* Filter toggle */}
      <button
        onClick={() => setShowFiltros(!showFiltros)}
        className={`flex items-center gap-2 text-sm font-medium rounded-xl px-3 py-2 transition-colors ${
          showFiltros
            ? "bg-primary-500 text-white"
            : "bg-surface border border-border-custom text-text-secondary hover:bg-surface-alt"
        }`}
      >
        <SlidersHorizontal size={14} />
        Filtros
        {(filtroNatureza || filtro !== "todos") && (
          <span
            className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
              showFiltros
                ? "bg-white/20 text-white"
                : "bg-primary-500/10 text-primary-500"
            }`}
          >
            {(filtroNatureza ? 1 : 0) + (filtro !== "todos" ? 1 : 0)}
          </span>
        )}
      </button>

      {showFiltros && (
        <div className="bg-surface rounded-xl border border-border-custom p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Natureza do Produto
            </label>
            <select
              value={filtroNatureza}
              onChange={(e) => setFiltroNatureza(e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {naturezaOptions.map((nat) => (
                <option key={nat} value={nat}>
                  {nat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Status de Risco
            </label>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              {filtroOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* PDV List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Snowflake className="mx-auto text-text-disabled mb-2" size={32} />
          <p className="text-sm text-text-secondary">
            {filtro === "todos"
              ? "Nenhum PDV cadastrado."
              : `Nenhum PDV com status "${filtroOptions.find((o) => o.key === filtro)?.label}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pdv) => (
            <PdvCard key={pdv.id} pdv={pdv} onContact={handleContact} />
          ))}
        </div>
      )}
    </div>
  );
}
