import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useBottomTabs } from "../contexts/BottomTabsContext";
import Modal from "../components/Modal";
import ConfirmDelete from "../components/ConfirmDelete";
import {
  Package,
  Plus,
  Trash2,
  Store,
  ArrowDownCircle,
  ArrowUpCircle,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  MapPin,
  Repeat,
  Truck,
  Pencil,
  AlertTriangle,
  X,
  Wallet,
  DollarSign,
  Zap,
  BarChart3,
} from "lucide-react";
import Reposicao from "./Reposicao";
import Gerencial from "./Revenda/Abas/Gerencial";

const today = new Date().toLocaleDateString("sv-SE", {
  timeZone: "America/Sao_Paulo",
});

// ── Helper: supabase mutation with error handling ──
const dbOp = async (query, label = "Operação") => {
  const res = await query;
  if (res.error) {
    console.error(`[${label}]`, res.error);
    alert(`Erro ao ${label}: ${res.error.message}`);
    return { ok: false, error: res.error, data: res.data };
  }
  return { ok: true, data: res.data };
};

const TABS = [
  { key: "entradas", label: "Entradas", icon: ArrowDownCircle },
  { key: "saidas", label: "Saídas", icon: ArrowUpCircle },
  { key: "reposicao", label: "Reposição", icon: Zap },
  { key: "gerencial", label: "Gerencial", icon: BarChart3 },
  { key: "cadastro", label: "Cadastro", icon: Package },
];

const fmtMoney = (v) =>
  v != null && v !== ""
    ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "—";

const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

// ── Produto Card ────────────

function ProdutoCard({ produto, onEdit, onDelete }) {
  return (
    <div
      onClick={() => onEdit(produto)}
      className="bg-surface rounded-xl border border-border-custom p-4 flex items-center justify-between cursor-pointer hover:bg-surface-alt/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
          <Package className="text-accent-500" size={16} />
        </div>
        <p className="font-semibold text-sm">{produto.nome}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(produto);
          }}
          className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(produto.id);
          }}
          className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-error transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Movimentação Card ──────────────────────────────────

function MovCard({
  mov,
  pdvs,
  produtos,
  fornecedores,
  onEdit,
  onDelete,
  onPagamento,
  initialOpen,
}) {
  const [open, setOpen] = useState(initialOpen || false);
  const isEntrada = mov._tipo === "entrada";
  const pdv = pdvs.find((p) => p.id === mov.pdv_id);
  const forn = fornecedores.find((f) => f.id === mov.fornecedor_id);
  const sp = mov.status_pagamento; // pendente | parcial | pago
  const itens = mov.itens || [];

  // Summaries
  const totalQty = itens.reduce((s, i) => s + (i.quantidade || 0), 0);
  const totalCompra = itens.reduce(
    (s, i) => s + (i.quantidade || 0) * (i.valor_compra_unitario || 0),
    0,
  );
  const totalVenda = itens.reduce(
    (s, i) => s + (i.quantidade || 0) * (i.valor_venda_unitario || 0),
    0,
  );
  const Icon = isEntrada ? ArrowDownCircle : ArrowUpCircle;
  const statusColors = isEntrada
    ? {
        color: "text-accent-500",
        bg: "bg-accent-50",
        border: "border-accent-500/30",
      }
    : mov.is_perda
      ? {
          color: "text-neutral-400",
          bg: "bg-neutral-100",
          border: "border-neutral-300",
        }
      : sp === "pago"
        ? {
            color: "text-success",
            bg: "bg-success/10",
            border: "border-success/30",
          }
        : sp === "parcial"
          ? {
              color: "text-warning",
              bg: "bg-warning/10",
              border: "border-warning/30",
            }
          : {
              color: "text-error/70",
              bg: "bg-error/5",
              border: "border-error/20",
            };
  const { color: colorClass, bg: bgClass, border: borderClass } = statusColors;

  return (
    <div
      id={`mov-${mov.id}`}
      className={`bg-surface rounded-xl border overflow-hidden transition-colors ${borderClass}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${bgClass}`}
        >
          <Icon className={colorClass} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {!isEntrada && pdv && (
              <span className="text-xs font-medium text-text-primary">
                {pdv.nome}
              </span>
            )}
            {isEntrada && forn && (
              <span className="text-xs font-medium text-text-primary">
                {forn.nome}
              </span>
            )}
            {!isEntrada && mov.is_perda && (
              <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-error/10 text-error flex items-center gap-0.5">
                <AlertTriangle size={10} /> PERDA
              </span>
            )}
          </div>
          <p className="text-xs text-text-disabled">
            {fmtDate(mov.data)}
            {" · "}
            {totalQty} itens · {fmtMoney(isEntrada ? totalCompra : totalVenda)}
          </p>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-text-disabled" />
        ) : (
          <ChevronDown size={16} className="text-text-disabled" />
        )}
      </button>

      {open && (
        <div className="border-t border-border-custom px-4 pb-3 pt-2 space-y-1.5">
          {/* Items list */}
          {itens.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-text-disabled font-medium uppercase">
                Itens
              </p>
              {itens.map((item, i) => {
                const prod = produtos.find((n) => n.id === item.produto_id);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-surface-alt rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-text-primary font-medium">
                      {prod?.nome || "—"}
                    </span>
                    <span className="text-text-secondary">
                      {item.quantidade}x {fmtMoney(item.valor_compra_unitario)}
                      {!isEntrada && item.valor_venda_unitario != null && (
                        <> → {fmtMoney(item.valor_venda_unitario)}</>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-text-disabled">Qtd total</span>
            <span className="text-text-primary font-medium text-right">
              {totalQty}
            </span>
            <span className="text-text-disabled">Compra total</span>
            <span className="text-text-primary font-medium text-right">
              {fmtMoney(totalCompra)}
            </span>
            {!isEntrada && (
              <>
                <span className="text-text-disabled">Venda total</span>
                <span className="text-text-primary font-medium text-right">
                  {fmtMoney(totalVenda)}
                </span>
                <span className="text-text-disabled">Situação</span>
                <span
                  className={`font-medium text-right ${sp === "pago" ? "text-success" : sp === "parcial" ? "text-warning" : "text-error/70"}`}
                >
                  {sp === "pago"
                    ? "Pago"
                    : sp === "parcial"
                      ? "Parcial"
                      : "Pendente"}
                </span>
              </>
            )}
            {isEntrada && forn && (
              <>
                <span className="text-text-disabled">Fornecedor</span>
                <span className="text-text-primary font-medium text-right">
                  {forn.nome}
                </span>
              </>
            )}
            {isEntrada && mov.nota_fiscal && (
              <>
                <span className="text-text-disabled">Nota fiscal</span>
                <span className="text-text-primary font-medium text-right">
                  {mov.nota_fiscal}
                </span>
              </>
            )}
          </div>
          {mov.observacao && (
            <p className="text-xs text-text-disabled pt-1">{mov.observacao}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onEdit(mov)}
                className="flex items-center gap-1 text-xs text-primary-500 hover:underline font-medium"
              >
                <Pencil size={12} /> Editar
              </button>
              <button
                onClick={() => onDelete(mov.id)}
                className="flex items-center gap-1 text-xs text-text-disabled hover:text-error transition-colors"
              >
                <Trash2 size={12} /> Remover
              </button>
            </div>
            <button
              onClick={() => onPagamento(mov)}
              className="flex items-center gap-1 text-xs text-accent-500 hover:underline font-medium"
            >
              <DollarSign size={12} /> Pagamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Página principal
// ══════════════════════════════════════════════════════════

export default function Revenda() {
  const { user } = useAuth();
  const { setTabs } = useBottomTabs();
  const [tab, setTab] = useState("saidas");
  const [cadastroSub, setCadastroSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteTable, setDeleteTable] = useState(null);
  const [editingFornecedorId, setEditingFornecedorId] = useState(null);
  const [editingProdutoId, setEditingProdutoId] = useState(null);
  const [editingPdvId, setEditingPdvId] = useState(null);
  const [expandedPdvId, setExpandedPdvId] = useState(null);
  const [autoOpenMovId, setAutoOpenMovId] = useState(null);
  const [editingMovId, setEditingMovId] = useState(null);
  const [perdaPrompt, setPerdaPrompt] = useState(false);

  // Data
  const [naturezas, setNaturezas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [pagamentoMov, setPagamentoMov] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [formFormaPgto, setFormFormaPgto] = useState({ nome: "" });
  const [editingFormaPgtoId, setEditingFormaPgtoId] = useState(null);
  const [formTransacao, setFormTransacao] = useState({
    forma_pagamento_id: "",
    valor: "",
    data: today,
    observacao: "",
  });

  // Forms
  const [formNatureza, setFormNatureza] = useState({
    nome: "",
    natureza: "",
    dimensao: "",
    tamanho: "",
  });
  const [prodNaturezaSuggestions, setProdNaturezaSuggestions] = useState([]);
  const [showProdNaturezaSugg, setShowProdNaturezaSugg] = useState(false);
  const [formFornecedor, setFormFornecedor] = useState({
    nome: "",
    contatos: [{ tipo: "", nome: "", telefone: "" }],
    cidade: "",
    bairro: "",
    logradouro: "",
    numero: "",
    observacao: "",
  });
  const [formPdv, setFormPdv] = useState({
    nome: "",
    natureza: "",
    contatos: [{ tipo: "", nome: "", telefone: "" }],
    cidade: "",
    bairro: "",
    logradouro: "",
    numero: "",
    observacao: "",
  });
  const [naturezaSuggestions, setNaturezaSuggestions] = useState([]);
  const [showNaturezaSugg, setShowNaturezaSugg] = useState(false);

  const [formEntrada, setFormEntrada] = useState({
    data: today,
    fornecedor_id: "",
    nota_fiscal: "",
    observacao: "",
    itens: [{ produto_id: "", quantidade: "", valor_compra_unitario: "" }],
  });
  const [formSaida, setFormSaida] = useState({
    data: today,
    pdv_id: "",
    observacao: "",
    itens: [
      {
        produto_id: "",
        quantidade: "",
        valor_compra_unitario: "",
        valor_venda_unitario: "",
      },
    ],
  });

  // ── Fetch ──

  const fetchNaturezas = useCallback(async () => {
    const { data } = await supabase
      .from("revenda_produtos")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    setNaturezas(data || []);
  }, []);

  const fetchFormasPagamento = useCallback(async () => {
    const { data } = await supabase
      .from("revenda_formas_pagamento")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    setFormasPagamento(data || []);
  }, []);

  const fetchFornecedores = useCallback(async () => {
    const { data } = await supabase
      .from("revenda_fornecedores")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    const ids = (data || []).map((f) => f.id);
    const [{ data: contatos }, { data: enderecos }] = await Promise.all([
      supabase
        .from("cadastro_contatos")
        .select("*")
        .eq("entidade_tipo", "fornecedor")
        .in("entidade_id", ids)
        .is("deleted_at", null),
      supabase
        .from("cadastro_enderecos")
        .select("*")
        .eq("entidade_tipo", "fornecedor")
        .in("entidade_id", ids)
        .is("deleted_at", null),
    ]);
    const enriched = (data || []).map((f) => {
      const cs = (contatos || []).filter((c) => c.entidade_id === f.id);
      const e = (enderecos || []).find((e) => e.entidade_id === f.id) || {};
      return {
        ...f,
        contatos: cs.map((c) => ({
          _id: c.id,
          tipo: c.tipo || "",
          nome: c.nome || "",
          telefone: c.telefone || "",
        })),
        cidade: e.cidade || "",
        bairro: e.bairro || "",
        logradouro: e.logradouro || "",
        numero: e.numero || "",
        _endereco_id: e.id,
      };
    });
    setFornecedores(enriched);
  }, []);

  const fetchPdvs = useCallback(async () => {
    const { data } = await supabase
      .from("revenda_pdvs")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    const ids = (data || []).map((p) => p.id);
    const [{ data: contatos }, { data: enderecos }] = await Promise.all([
      supabase
        .from("cadastro_contatos")
        .select("*")
        .eq("entidade_tipo", "pdv")
        .in("entidade_id", ids)
        .is("deleted_at", null),
      supabase
        .from("cadastro_enderecos")
        .select("*")
        .eq("entidade_tipo", "pdv")
        .in("entidade_id", ids)
        .is("deleted_at", null),
    ]);
    const enriched = (data || []).map((p) => {
      const cs = (contatos || []).filter((c) => c.entidade_id === p.id);
      const e = (enderecos || []).find((e) => e.entidade_id === p.id) || {};
      return {
        ...p,
        contatos: cs.map((c) => ({
          _id: c.id,
          tipo: c.tipo || "",
          nome: c.nome || "",
          telefone: c.telefone || "",
        })),
        cidade: e.cidade || "",
        bairro: e.bairro || "",
        logradouro: e.logradouro || "",
        numero: e.numero || "",
        _endereco_id: e.id,
      };
    });
    setPdvs(enriched);
  }, []);

  const fetchMovimentacoes = useCallback(async () => {
    const fetchEntradas =
      tab === "saidas"
        ? Promise.resolve({ data: [] })
        : supabase
            .from("revenda_mov_entradas")
            .select("*, revenda_mov_entradas_itens(*)")
            .is("deleted_at", null)
            .order("data", { ascending: false })
            .limit(100);
    const fetchSaidas =
      tab === "entradas"
        ? Promise.resolve({ data: [] })
        : (() => {
            let q = supabase
              .from("revenda_mov_saidas")
              .select("*, revenda_mov_saidas_itens(*)")
              .is("deleted_at", null)
              .order("data", { ascending: false })
              .limit(100);
            return q;
          })();
    const [{ data: entradas }, { data: saidas }] = await Promise.all([
      fetchEntradas,
      fetchSaidas,
    ]);
    const all = [
      ...(entradas || []).map((e) => ({
        ...e,
        itens: e.revenda_mov_entradas_itens || [],
        _tipo: "entrada",
        _table: "revenda_mov_entradas",
      })),
      ...(saidas || []).map((s) => ({
        ...s,
        itens: s.revenda_mov_saidas_itens || [],
        _tipo: "saida",
        _table: "revenda_mov_saidas",
      })),
    ].sort((a, b) => {
      if (a._tipo === "saida" && b._tipo === "saida") {
        const statusOrder = { pendente: 0, parcial: 1, pago: 2 };
        const sa = statusOrder[a.status_pagamento] ?? 1;
        const sb = statusOrder[b.status_pagamento] ?? 1;
        if (sa !== sb) return sa - sb;
      }
      return (
        (b.data || "").localeCompare(a.data || "") ||
        (b.created_at || "").localeCompare(a.created_at || "")
      );
    });
    setMovimentacoes(all);
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchNaturezas(),
        fetchFornecedores(),
        fetchPdvs(),
        fetchMovimentacoes(),
        fetchFormasPagamento(),
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    fetchNaturezas,
    fetchFornecedores,
    fetchPdvs,
    fetchMovimentacoes,
    fetchFormasPagamento,
  ]);

  // Register bottom tabs for mobile
  useEffect(() => {
    setTabs(
      <div className="flex justify-around py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setCadastroSub(null);
            }}
            className={`flex flex-col items-center text-[10px] gap-0.5 ${tab === t.key ? "text-primary-500 font-semibold" : "text-text-secondary"}`}
          >
            <t.icon size={20} />
            {t.label}
          </button>
        ))}
      </div>,
    );
    return () => setTabs(null);
  }, [tab, setTabs]);

  // ── Save handlers ──

  const handleSaveNatureza = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingProdutoId) {
      const { ok } = await dbOp(
        supabase
          .from("revenda_produtos")
          .update({
            nome: formNatureza.nome,
            natureza: formNatureza.natureza || null,
            dimensao: formNatureza.dimensao || null,
            tamanho: formNatureza.tamanho || null,
          })
          .eq("id", editingProdutoId),
        "salvar produto",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    } else {
      const { ok } = await dbOp(
        supabase
          .from("revenda_produtos")
          .insert({ ...formNatureza, user_id: user.id }),
        "salvar produto",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setModal(null);
    setEditingProdutoId(null);
    setFormNatureza({ nome: "", natureza: "", dimensao: "", tamanho: "" });
    await fetchNaturezas();
  };

  const handleSaveFornecedor = async (e) => {
    e.preventDefault();
    setSaving(true);
    let entidadeId = editingFornecedorId;
    if (editingFornecedorId) {
      const { ok } = await dbOp(
        supabase
          .from("revenda_fornecedores")
          .update({
            nome: formFornecedor.nome,
            observacao: formFornecedor.observacao || null,
          })
          .eq("id", editingFornecedorId),
        "salvar fornecedor",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    } else {
      const { ok, data: inserted } = await dbOp(
        supabase
          .from("revenda_fornecedores")
          .insert({
            nome: formFornecedor.nome,
            observacao: formFornecedor.observacao || null,
            user_id: user.id,
          })
          .select("id")
          .single(),
        "salvar fornecedor",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
      entidadeId = inserted?.id;
    }
    if (entidadeId) {
      // Save contatos (multi)
      const existingIds = (formFornecedor.contatos || [])
        .map((c) => c._id)
        .filter(Boolean);
      // Delete removed contacts
      if (editingFornecedorId) {
        const { data: oldContatos } = await supabase
          .from("cadastro_contatos")
          .select("id")
          .eq("entidade_tipo", "fornecedor")
          .eq("entidade_id", entidadeId)
          .is("deleted_at", null);
        for (const old of oldContatos || []) {
          if (!existingIds.includes(old.id)) {
            await dbOp(
              supabase
                .from("cadastro_contatos")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", old.id),
              "remover contato",
            );
          }
        }
      }
      for (const c of formFornecedor.contatos || []) {
        if (!c.tipo && !c.nome && !c.telefone) continue;
        const payload = {
          entidade_tipo: "fornecedor",
          entidade_id: entidadeId,
          tipo: c.tipo || null,
          nome: c.nome || null,
          telefone: c.telefone || null,
          user_id: user.id,
        };
        if (c._id) {
          await dbOp(
            supabase.from("cadastro_contatos").update(payload).eq("id", c._id),
            "salvar contato",
          );
        } else {
          await dbOp(
            supabase.from("cadastro_contatos").insert(payload),
            "salvar contato",
          );
        }
      }
      // Upsert endereco
      const enderecoPayload = {
        entidade_tipo: "fornecedor",
        entidade_id: entidadeId,
        cidade: formFornecedor.cidade || null,
        bairro: formFornecedor.bairro || null,
        logradouro: formFornecedor.logradouro || null,
        numero: formFornecedor.numero || null,
        user_id: user.id,
      };
      if (formFornecedor._endereco_id) {
        await dbOp(
          supabase
            .from("cadastro_enderecos")
            .update(enderecoPayload)
            .eq("id", formFornecedor._endereco_id),
          "salvar endere\u00e7o",
        );
      } else if (
        formFornecedor.cidade ||
        formFornecedor.bairro ||
        formFornecedor.logradouro ||
        formFornecedor.numero
      ) {
        await dbOp(
          supabase.from("cadastro_enderecos").insert(enderecoPayload),
          "salvar endere\u00e7o",
        );
      }
    }
    setSaving(false);
    setModal(null);
    setEditingFornecedorId(null);
    setFormFornecedor({
      nome: "",
      contatos: [{ tipo: "", nome: "", telefone: "" }],
      cidade: "",
      bairro: "",
      logradouro: "",
      numero: "",
      observacao: "",
    });
    await fetchFornecedores();
  };

  const handleSavePdv = async (e) => {
    e.preventDefault();
    setSaving(true);
    let entidadeId = editingPdvId;
    if (editingPdvId) {
      const { ok } = await dbOp(
        supabase
          .from("revenda_pdvs")
          .update({
            nome: formPdv.nome,
            natureza: formPdv.natureza || null,
            observacao: formPdv.observacao || null,
          })
          .eq("id", editingPdvId),
        "salvar PDV",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    } else {
      const { ok, data: inserted } = await dbOp(
        supabase
          .from("revenda_pdvs")
          .insert({
            nome: formPdv.nome,
            natureza: formPdv.natureza || null,
            observacao: formPdv.observacao || null,
            user_id: user.id,
          })
          .select("id")
          .single(),
        "salvar PDV",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
      entidadeId = inserted?.id;
    }
    if (entidadeId) {
      // Save contatos (multi)
      const existingIds = (formPdv.contatos || [])
        .map((c) => c._id)
        .filter(Boolean);
      if (editingPdvId) {
        const { data: oldContatos } = await supabase
          .from("cadastro_contatos")
          .select("id")
          .eq("entidade_tipo", "pdv")
          .eq("entidade_id", entidadeId)
          .is("deleted_at", null);
        for (const old of oldContatos || []) {
          if (!existingIds.includes(old.id)) {
            await dbOp(
              supabase
                .from("cadastro_contatos")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", old.id),
              "remover contato",
            );
          }
        }
      }
      for (const c of formPdv.contatos || []) {
        if (!c.tipo && !c.nome && !c.telefone) continue;
        const payload = {
          entidade_tipo: "pdv",
          entidade_id: entidadeId,
          tipo: c.tipo || null,
          nome: c.nome || null,
          telefone: c.telefone || null,
          user_id: user.id,
        };
        if (c._id) {
          await dbOp(
            supabase.from("cadastro_contatos").update(payload).eq("id", c._id),
            "salvar contato",
          );
        } else {
          await dbOp(
            supabase.from("cadastro_contatos").insert(payload),
            "salvar contato",
          );
        }
      }
      // Upsert endereco
      const enderecoPayload = {
        entidade_tipo: "pdv",
        entidade_id: entidadeId,
        cidade: formPdv.cidade || null,
        bairro: formPdv.bairro || null,
        logradouro: formPdv.logradouro || null,
        numero: formPdv.numero || null,
        user_id: user.id,
      };
      if (formPdv._endereco_id) {
        await dbOp(
          supabase
            .from("cadastro_enderecos")
            .update(enderecoPayload)
            .eq("id", formPdv._endereco_id),
          "salvar endere\u00e7o",
        );
      } else if (
        formPdv.cidade ||
        formPdv.bairro ||
        formPdv.logradouro ||
        formPdv.numero
      ) {
        await dbOp(
          supabase.from("cadastro_enderecos").insert(enderecoPayload),
          "salvar endere\u00e7o",
        );
      }
    }
    setSaving(false);
    setModal(null);
    setEditingPdvId(null);
    setFormPdv({
      nome: "",
      natureza: "",
      contatos: [{ tipo: "", nome: "", telefone: "" }],
      cidade: "",
      bairro: "",
      logradouro: "",
      numero: "",
      observacao: "",
    });
    await fetchPdvs();
  };

  const handleSaveEntrada = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      data: formEntrada.data,
      fornecedor_id: formEntrada.fornecedor_id || null,
      nota_fiscal: formEntrada.nota_fiscal || null,
      observacao: formEntrada.observacao || null,
    };
    let movId = editingMovId;
    if (editingMovId) {
      const { ok } = await dbOp(
        supabase
          .from("revenda_mov_entradas")
          .update(payload)
          .eq("id", editingMovId),
        "salvar entrada",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
      await dbOp(
        supabase
          .from("revenda_mov_entradas_itens")
          .delete()
          .eq("mov_id", editingMovId),
        "limpar itens",
      );
    } else {
      const { ok, data: inserted } = await dbOp(
        supabase
          .from("revenda_mov_entradas")
          .insert({ ...payload, user_id: user.id })
          .select("id")
          .single(),
        "salvar entrada",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
      movId = inserted?.id;
    }
    // Insert items
    if (movId) {
      const itensPayload = formEntrada.itens
        .filter((i) => i.produto_id && i.quantidade)
        .map((i) => ({
          mov_id: movId,
          produto_id: i.produto_id,
          quantidade: Number(i.quantidade),
          valor_compra_unitario: Number(i.valor_compra_unitario) || null,
          user_id: user.id,
        }));
      if (itensPayload.length > 0) {
        await dbOp(
          supabase.from("revenda_mov_entradas_itens").insert(itensPayload),
          "salvar itens entrada",
        );
      }
    }
    // Update custo_unitario on revenda_produtos (non-Gelo products)
    for (const item of formEntrada.itens) {
      if (item.valor_compra_unitario != null && item.produto_id) {
        const prod = naturezas.find((n) => n.id === item.produto_id);
        if (prod && prod.natureza !== "Gelo") {
          await dbOp(
            supabase
              .from("revenda_produtos")
              .update({ custo_unitario: item.valor_compra_unitario })
              .eq("id", item.produto_id),
            "atualizar custo produto",
          );
        }
      }
    }
    setSaving(false);
    setModal(null);
    setEditingMovId(null);
    await fetchNaturezas();
    await fetchMovimentacoes();
  };

  const handleSaveSaida = async (e, forcePerda) => {
    e?.preventDefault?.();
    const totalQty = formSaida.itens.reduce(
      (s, i) => s + Number(i.quantidade || 0),
      0,
    );

    // Se quantidade negativa e ainda não decidiu: perguntar
    if (totalQty < 0 && forcePerda === undefined) {
      setPerdaPrompt(true);
      return;
    }

    setSaving(true);
    const isPerda = forcePerda === true;
    if (totalQty < 0 && !isPerda && !editingMovId) {
      // Devolução → criar ENTRADA com quantidade positiva
      const { ok, data: inserted } = await dbOp(
        supabase
          .from("revenda_mov_entradas")
          .insert({
            data: formSaida.data,
            observacao: formSaida.observacao
              ? `Devolução: ${formSaida.observacao}`
              : "Devolução de PDV",
            user_id: user.id,
          })
          .select("id")
          .single(),
        "salvar devolução",
      );
      if (ok && inserted?.id) {
        const itensPayload = formSaida.itens
          .filter((i) => i.produto_id && i.quantidade)
          .map((i) => ({
            mov_id: inserted.id,
            produto_id: i.produto_id,
            quantidade: Math.abs(Number(i.quantidade)),
            valor_compra_unitario: Number(i.valor_compra_unitario) || null,
            user_id: user.id,
          }));
        if (itensPayload.length > 0) {
          await dbOp(
            supabase.from("revenda_mov_entradas_itens").insert(itensPayload),
            "salvar itens devolu\u00e7\u00e3o",
          );
        }
      }
    } else {
      // Normal ou perda
      const payload = {
        data: formSaida.data,
        pdv_id: formSaida.pdv_id || null,
        observacao: isPerda
          ? formSaida.observacao
            ? `Perda: ${formSaida.observacao}`
            : "Perda"
          : formSaida.observacao || null,
        is_perda: isPerda,
      };
      let movId = editingMovId;
      if (editingMovId) {
        const { ok } = await dbOp(
          supabase
            .from("revenda_mov_saidas")
            .update(payload)
            .eq("id", editingMovId),
          "salvar sa\u00edda",
        );
        if (!ok) {
          setSaving(false);
          return;
        }
        await dbOp(
          supabase
            .from("revenda_mov_saidas_itens")
            .delete()
            .eq("mov_id", editingMovId),
          "limpar itens",
        );
      } else {
        const { ok, data: inserted } = await dbOp(
          supabase
            .from("revenda_mov_saidas")
            .insert({ ...payload, user_id: user.id })
            .select("id")
            .single(),
          "salvar sa\u00edda",
        );
        if (!ok) {
          setSaving(false);
          return;
        }
        movId = inserted?.id;
      }
      if (movId) {
        const itensPayload = formSaida.itens
          .filter((i) => i.produto_id && i.quantidade)
          .map((i) => ({
            mov_id: movId,
            produto_id: i.produto_id,
            quantidade: isPerda
              ? Math.abs(Number(i.quantidade))
              : Number(i.quantidade),
            valor_compra_unitario: Number(i.valor_compra_unitario) || null,
            valor_venda_unitario: isPerda
              ? null
              : Number(i.valor_venda_unitario) || null,
            user_id: user.id,
          }));
        if (itensPayload.length > 0) {
          await dbOp(
            supabase.from("revenda_mov_saidas_itens").insert(itensPayload),
            "salvar itens sa\u00edda",
          );
        }
      }
    }
    setSaving(false);
    setModal(null);
    setPerdaPrompt(false);
    setEditingMovId(null);
    await fetchMovimentacoes();
  };

  // ── Formas de Pagamento handlers ──

  const handleSaveFormaPgto = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingFormaPgtoId) {
      const { ok } = await dbOp(
        supabase
          .from("revenda_formas_pagamento")
          .update({ nome: formFormaPgto.nome })
          .eq("id", editingFormaPgtoId),
        "salvar forma de pagamento",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    } else {
      const { ok } = await dbOp(
        supabase
          .from("revenda_formas_pagamento")
          .insert({ nome: formFormaPgto.nome, user_id: user.id }),
        "salvar forma de pagamento",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setModal(null);
    setEditingFormaPgtoId(null);
    setFormFormaPgto({ nome: "" });
    await fetchFormasPagamento();
  };

  const openAddFormaPgto = () => {
    setEditingFormaPgtoId(null);
    setFormFormaPgto({ nome: "" });
    setModal("forma_pgto");
  };

  const openEditFormaPgto = (f) => {
    setEditingFormaPgtoId(f.id);
    setFormFormaPgto({ nome: f.nome });
    setModal("forma_pgto");
  };

  // ── Pagamento (transações) handlers ──

  const openPagamento = async (mov) => {
    setPagamentoMov(mov);
    const table =
      mov._tipo === "entrada"
        ? "revenda_entrada_transacoes"
        : "revenda_saida_transacoes";
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("mov_id", mov.id)
      .order("data", { ascending: false });
    setTransacoes(data || []);
    const dinheiro = formasPagamento.find(
      (f) => f.nome.toLowerCase() === "dinheiro",
    );
    const isEnt = mov._tipo === "entrada";
    const totalMov = (mov.itens || []).reduce(
      (s, i) =>
        s +
        (i.quantidade || 0) *
          (isEnt ? i.valor_compra_unitario || 0 : i.valor_venda_unitario || 0),
      0,
    );
    const totalPago = (data || []).reduce((s, t) => s + Number(t.valor), 0);
    const restante = Math.max(0, totalMov - totalPago);
    setFormTransacao({
      forma_pagamento_id: dinheiro?.id ?? formasPagamento[0]?.id ?? "",
      valor: restante > 0 ? restante.toFixed(2) : "",
      data: mov.data || today,
      observacao: "",
    });
    setModal("pagamento");
  };

  const handleSaveTransacao = async (e) => {
    e.preventDefault();
    if (!pagamentoMov) return;
    setSaving(true);
    const table =
      pagamentoMov._tipo === "entrada"
        ? "revenda_entrada_transacoes"
        : "revenda_saida_transacoes";
    const { ok } = await dbOp(
      supabase.from(table).insert({
        mov_id: pagamentoMov.id,
        forma_pagamento_id: formTransacao.forma_pagamento_id || null,
        valor: Number(formTransacao.valor),
        data: formTransacao.data,
        observacao: formTransacao.observacao || null,
        user_id: user.id,
      }),
      "registrar transa\u00e7\u00e3o",
    );
    if (!ok) {
      setSaving(false);
      return;
    }
    // Refresh transações
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("mov_id", pagamentoMov.id)
      .order("data", { ascending: false });
    setTransacoes(data || []);
    const dinheiro = formasPagamento.find(
      (f) => f.nome.toLowerCase() === "dinheiro",
    );
    const isEnt2 = pagamentoMov._tipo === "entrada";
    const totalMov2 = (pagamentoMov.itens || []).reduce(
      (s, i) =>
        s +
        (i.quantidade || 0) *
          (isEnt2 ? i.valor_compra_unitario || 0 : i.valor_venda_unitario || 0),
      0,
    );
    const totalPago2 = (data || []).reduce((s, t) => s + Number(t.valor), 0);
    const restante2 = Math.max(0, totalMov2 - totalPago2);
    // Atualiza status_pagamento na saída
    if (pagamentoMov._tipo === "saida") {
      const newStatus =
        totalPago2 <= 0
          ? "pendente"
          : totalPago2 >= totalMov2
            ? "pago"
            : "parcial";
      await supabase
        .from("revenda_mov_saidas")
        .update({ status_pagamento: newStatus })
        .eq("id", pagamentoMov.id);
    }
    setFormTransacao({
      forma_pagamento_id: dinheiro?.id ?? formasPagamento[0]?.id ?? "",
      valor: restante2 > 0 ? restante2.toFixed(2) : "",
      data: pagamentoMov?.data || today,
      observacao: "",
    });
    setSaving(false);
    await fetchMovimentacoes();
  };

  const deleteTransacao = async (id) => {
    if (!pagamentoMov) return;
    const table =
      pagamentoMov._tipo === "entrada"
        ? "revenda_entrada_transacoes"
        : "revenda_saida_transacoes";
    await dbOp(
      supabase.from(table).delete().eq("id", id),
      "remover transa\u00e7\u00e3o",
    );
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("mov_id", pagamentoMov.id)
      .order("data", { ascending: false });
    setTransacoes(data || []);
    // Recalcula status_pagamento na saída
    if (pagamentoMov._tipo === "saida") {
      const totalMov = (pagamentoMov.itens || []).reduce(
        (s, i) => s + (i.quantidade || 0) * (i.valor_venda_unitario || 0),
        0,
      );
      const totalPago = (data || []).reduce((s, t) => s + Number(t.valor), 0);
      const newStatus =
        totalPago <= 0
          ? "pendente"
          : totalPago >= totalMov
            ? "pago"
            : "parcial";
      await supabase
        .from("revenda_mov_saidas")
        .update({ status_pagamento: newStatus })
        .eq("id", pagamentoMov.id);
      await fetchMovimentacoes();
    }
  };

  // ── Soft-delete ──

  const handleSoftDelete = async () => {
    await dbOp(
      supabase
        .from(deleteTable)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deleteId),
      "remover registro",
    );
    setModal(null);
    setDeleteId(null);
    setDeleteTable(null);
    await Promise.all([
      fetchNaturezas(),
      fetchFornecedores(),
      fetchPdvs(),
      fetchMovimentacoes(),
      fetchFormasPagamento(),
    ]);
  };

  const confirmDelete = (id, table) => {
    setDeleteId(id);
    setDeleteTable(table);
    setModal("delete");
  };

  // ── Open modals ──

  const openAddNatureza = () => {
    setEditingProdutoId(null);
    setFormNatureza({ nome: "", natureza: "", dimensao: "", tamanho: "" });
    setModal("natureza");
  };

  const openEditNatureza = (n) => {
    setEditingProdutoId(n.id);
    setFormNatureza({
      nome: n.nome,
      natureza: n.natureza || "",
      dimensao: n.dimensao || "",
      tamanho: n.tamanho || "",
    });
    setModal("natureza");
  };

  const openAddFornecedor = () => {
    setEditingFornecedorId(null);
    setFormFornecedor({
      nome: "",
      contatos: [{ tipo: "", nome: "", telefone: "" }],
      cidade: "",
      bairro: "",
      logradouro: "",
      numero: "",
      observacao: "",
    });
    setModal("fornecedor");
  };

  const openEditFornecedor = (f) => {
    setEditingFornecedorId(f.id);
    setFormFornecedor({
      nome: f.nome,
      contatos:
        f.contatos && f.contatos.length > 0
          ? f.contatos
          : [{ tipo: "", nome: "", telefone: "" }],
      cidade: f.cidade || "",
      bairro: f.bairro || "",
      logradouro: f.logradouro || "",
      numero: f.numero || "",
      observacao: f.observacao || "",
      _endereco_id: f._endereco_id,
    });
    setModal("fornecedor");
  };

  const openAddPdv = () => {
    setEditingPdvId(null);
    setFormPdv({
      nome: "",
      natureza: "",
      contatos: [{ tipo: "", nome: "", telefone: "" }],
      cidade: "",
      bairro: "",
      logradouro: "",
      numero: "",
      observacao: "",
    });
    setModal("pdv");
  };

  const openEditPdv = (p) => {
    setEditingPdvId(p.id);
    setFormPdv({
      nome: p.nome,
      natureza: p.natureza || "",
      contatos:
        p.contatos && p.contatos.length > 0
          ? p.contatos
          : [{ tipo: "", nome: "", telefone: "" }],
      cidade: p.cidade || "",
      bairro: p.bairro || "",
      logradouro: p.logradouro || "",
      numero: p.numero || "",
      observacao: p.observacao || "",
      _endereco_id: p._endereco_id,
    });
    setModal("pdv");
  };

  const openAddEntrada = () => {
    setEditingMovId(null);
    setFormEntrada({
      data: today,
      fornecedor_id: fornecedores[0]?.id ?? "",
      nota_fiscal: "",
      observacao: "",
      itens: [
        {
          produto_id: naturezas[0]?.id ?? "",
          quantidade: "",
          valor_compra_unitario: "",
        },
      ],
    });
    setModal("entrada");
  };

  const openAddSaida = () => {
    setEditingMovId(null);
    setFormSaida({
      data: today,
      pdv_id: pdvs[0]?.id ?? "",
      observacao: "",
      itens: [
        {
          produto_id: naturezas[0]?.id ?? "",
          quantidade: "",
          valor_compra_unitario:
            naturezas[0]?.custo_unitario != null
              ? String(naturezas[0].custo_unitario)
              : "",
          valor_venda_unitario: "",
        },
      ],
    });
    setModal("saida");
  };

  const openEditMov = (m) => {
    setEditingMovId(m.id);
    if (m._tipo === "entrada") {
      setFormEntrada({
        data: m.data || today,
        fornecedor_id: m.fornecedor_id || "",
        nota_fiscal: m.nota_fiscal || "",
        observacao: m.observacao || "",
        itens:
          (m.itens || []).length > 0
            ? m.itens.map((i) => ({
                produto_id: i.produto_id || "",
                quantidade: i.quantidade?.toString() || "",
                valor_compra_unitario:
                  i.valor_compra_unitario?.toString() || "",
              }))
            : [{ produto_id: "", quantidade: "", valor_compra_unitario: "" }],
      });
      setModal("entrada");
    } else {
      setFormSaida({
        data: m.data || today,
        pdv_id: m.pdv_id || "",
        observacao: m.observacao || "",
        itens:
          (m.itens || []).length > 0
            ? m.itens.map((i) => ({
                produto_id: i.produto_id || "",
                quantidade: i.quantidade?.toString() || "",
                valor_compra_unitario:
                  i.valor_compra_unitario?.toString() || "",
                valor_venda_unitario: i.valor_venda_unitario?.toString() || "",
              }))
            : [
                {
                  produto_id: "",
                  quantidade: "",
                  valor_compra_unitario: "",
                  valor_venda_unitario: "",
                },
              ],
      });
      setModal("saida");
    }
  };

  // ── Render ──

  return (
    <div className="space-y-4 -mx-2">
      {/* Header */}
      <div className="flex items-center justify-between min-h-[40px]">
        <div className="flex items-center gap-2 shrink-0">
          <Package className="text-accent-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">Revenda</h1>
        </div>
        <div className="flex gap-2">
          {tab === "entradas" && (
            <button
              onClick={openAddEntrada}
              className="flex items-center gap-1.5 bg-success hover:bg-success/90 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
            >
              <Plus size={16} /> Entrada
            </button>
          )}
          {tab === "saidas" && (
            <button
              onClick={openAddSaida}
              className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
            >
              <Plus size={16} /> Saída
            </button>
          )}
          {tab === "cadastro" && cadastroSub && (
            <button
              onClick={
                cadastroSub === "produtos"
                  ? openAddNatureza
                  : cadastroSub === "fornecedores"
                    ? openAddFornecedor
                    : cadastroSub === "pagamento"
                      ? openAddFormaPgto
                      : openAddPdv
              }
              className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
            >
              <Plus size={16} />{" "}
              {cadastroSub === "produtos"
                ? "Produto"
                : cadastroSub === "fornecedores"
                  ? "Fornecedor"
                  : cadastroSub === "pagamento"
                    ? "Forma"
                    : "PDV"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="hidden md:flex gap-1 bg-surface-alt rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setCadastroSub(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 transition-colors ${tab === t.key ? "bg-surface text-primary-500 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : tab === "gerencial" ? (
        <Gerencial embedded />
      ) : tab === "reposicao" ? (
        <Reposicao embedded />
      ) : tab === "cadastro" ? (
        !cadastroSub ? (
          /* Cadastro menu */
          <div className="space-y-3">
            {[
              {
                key: "produtos",
                label: "Produtos",
                desc: `${naturezas.length} cadastrados`,
                icon: Tag,
                color: "text-accent-500",
                bg: "bg-accent-50",
              },
              {
                key: "fornecedores",
                label: "Fornecedores",
                desc: `${fornecedores.length} cadastrados`,
                icon: Truck,
                color: "text-accent-500",
                bg: "bg-accent-50",
              },
              {
                key: "pdvs",
                label: "Pontos de Venda",
                desc: `${pdvs.length} cadastrados`,
                icon: MapPin,
                color: "text-primary-500",
                bg: "bg-primary-50",
              },
              {
                key: "pagamento",
                label: "Formas de Pagamento",
                desc: `${formasPagamento.length} cadastradas`,
                icon: Wallet,
                color: "text-accent-500",
                bg: "bg-accent-50",
              },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setCadastroSub(item.key)}
                className="w-full bg-surface rounded-xl border border-border-custom p-4 flex items-center gap-3 text-left hover:bg-surface-alt/50 transition-colors"
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}
                >
                  <item.icon className={item.color} size={18} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-text-disabled">{item.desc}</p>
                </div>
                <ChevronDown
                  size={16}
                  className="ml-auto text-text-disabled -rotate-90"
                />
              </button>
            ))}
          </div>
        ) : cadastroSub === "produtos" ? (
          <div className="space-y-3">
            {naturezas.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
                <p className="text-text-secondary">
                  Cadastre seus produtos (ex: Picolé - Fruta no Palito, Gelo,
                  Cachaça).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {naturezas.map((n) => (
                  <ProdutoCard
                    key={n.id}
                    produto={n}
                    onEdit={openEditNatureza}
                    onDelete={(id) => confirmDelete(id, "revenda_produtos")}
                  />
                ))}
              </div>
            )}
          </div>
        ) : cadastroSub === "fornecedores" ? (
          <div className="space-y-3">
            {fornecedores.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
                <p className="text-text-secondary">
                  Cadastre seus fornecedores (distribuidoras, fábricas, etc).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {fornecedores.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => openEditFornecedor(f)}
                    className="bg-surface rounded-xl border border-border-custom p-4 flex items-center justify-between cursor-pointer hover:bg-surface-alt/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-accent-50 flex items-center justify-center">
                        <Truck className="text-accent-500" size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {f.nome}
                        </p>
                        {f.contatos &&
                          f.contatos.length > 0 &&
                          f.contatos.some(
                            (c) => c.tipo || c.nome || c.telefone,
                          ) &&
                          f.contatos
                            .filter((c) => c.tipo || c.nome || c.telefone)
                            .map((c, ci) => (
                              <div
                                key={ci}
                                className="flex items-center justify-between text-xs bg-surface-alt rounded-lg px-2.5 py-1.5 mt-1"
                              >
                                <span className="text-text-primary font-medium truncate">
                                  {[c.tipo, c.nome].filter(Boolean).join(" · ")}
                                </span>
                                <span className="flex items-center gap-1.5 shrink-0 ml-2">
                                  {c.telefone && (
                                    <>
                                      <span className="text-text-secondary">
                                        {c.telefone}
                                      </span>
                                      <a
                                        href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-success hover:text-success/80 transition-colors"
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                        >
                                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                      </a>
                                    </>
                                  )}
                                </span>
                              </div>
                            ))}
                        {(f.bairro || f.cidade) && (
                          <p className="text-xs text-text-disabled truncate">
                            {[f.bairro, f.cidade].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {(!f.contatos ||
                          !f.contatos.some(
                            (c) => c.tipo || c.nome || c.telefone,
                          )) &&
                          !f.bairro &&
                          !f.cidade && (
                            <p className="text-xs text-text-disabled">
                              Sem detalhes
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditFornecedor(f);
                        }}
                        className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(f.id, "revenda_fornecedores");
                        }}
                        className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-error transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : cadastroSub === "pagamento" ? (
          <div className="space-y-3">
            {formasPagamento.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
                <p className="text-text-secondary">
                  Cadastre suas formas de pagamento (Pix, Dinheiro, etc).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {formasPagamento.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => openEditFormaPgto(f)}
                    className="bg-surface rounded-xl border border-border-custom p-4 flex items-center justify-between cursor-pointer hover:bg-surface-alt/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-accent-50 flex items-center justify-center">
                        <Wallet className="text-accent-500" size={16} />
                      </div>
                      <p className="font-semibold text-sm truncate">{f.nome}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditFormaPgto(f);
                        }}
                        className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(f.id, "revenda_formas_pagamento");
                        }}
                        className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-error transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* cadastroSub === "pdvs" */
          <div className="space-y-3">
            {pdvs.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
                <p className="text-text-secondary">
                  Cadastre seus pontos de venda.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  // Compute last purchase date per PDV from saidas
                  const lastPurchaseMap = {};
                  movimentacoes
                    .filter((m) => m._tipo === "saida" && m.pdv_id)
                    .forEach((m) => {
                      if (
                        !lastPurchaseMap[m.pdv_id] ||
                        m.data > lastPurchaseMap[m.pdv_id]
                      ) {
                        lastPurchaseMap[m.pdv_id] = m.data;
                      }
                    });
                  return [...pdvs]
                    .sort((a, b) => {
                      const da = lastPurchaseMap[a.id] || "";
                      const db = lastPurchaseMap[b.id] || "";
                      return (db || "9999").localeCompare(da || "9999");
                    })
                    .map((p) => {
                      const lastDate = lastPurchaseMap[p.id];
                      const isOpen = expandedPdvId === p.id;
                      return (
                        <div
                          key={p.id}
                          className="bg-surface rounded-xl border border-border-custom overflow-hidden"
                        >
                          <div
                            onClick={() =>
                              setExpandedPdvId(isOpen ? null : p.id)
                            }
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-alt/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary-50 flex items-center justify-center">
                                <Store className="text-primary-500" size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                  {p.nome}
                                </p>
                                <p className="text-xs text-text-disabled truncate">
                                  {[
                                    p.natureza,
                                    p.bairro,
                                    lastDate
                                      ? new Date(
                                          lastDate + "T00:00:00",
                                        ).toLocaleDateString("pt-BR")
                                      : "Sem compras",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              size={16}
                              className={`text-text-disabled transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                          </div>
                          {isOpen && (
                            <div className="px-4 pb-3 pt-2 border-t border-border-custom space-y-1.5">
                              {p.contatos &&
                                p.contatos.length > 0 &&
                                p.contatos.some(
                                  (c) => c.tipo || c.nome || c.telefone,
                                ) && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-text-disabled font-medium uppercase">
                                      Contatos
                                    </p>
                                    {p.contatos
                                      .filter(
                                        (c) => c.tipo || c.nome || c.telefone,
                                      )
                                      .map((c, ci) => (
                                        <div
                                          key={ci}
                                          className="flex items-center justify-between text-xs bg-surface-alt rounded-lg px-2.5 py-1.5"
                                        >
                                          <span className="text-text-primary font-medium truncate">
                                            {[c.tipo, c.nome]
                                              .filter(Boolean)
                                              .join(" · ")}
                                          </span>
                                          <span className="flex items-center gap-1.5 shrink-0 ml-2">
                                            {c.telefone && (
                                              <>
                                                <span className="text-text-secondary">
                                                  {c.telefone}
                                                </span>
                                                <a
                                                  href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  className="text-success hover:text-success/80 transition-colors"
                                                >
                                                  <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                  >
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                  </svg>
                                                </a>
                                              </>
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              {(p.cidade || p.logradouro) && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-text-disabled font-medium uppercase">
                                    Endereço
                                  </p>
                                  <div className="flex items-center justify-between text-xs bg-surface-alt rounded-lg px-2.5 py-1.5">
                                    <span className="text-text-primary font-medium truncate">
                                      {[
                                        p.logradouro,
                                        p.numero,
                                        p.bairro,
                                        p.cidade,
                                      ]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </span>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.logradouro, p.numero, p.bairro, p.cidade].filter(Boolean).join(", "))}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-primary-500 hover:text-primary-600 transition-colors shrink-0 ml-2"
                                    >
                                      <MapPin size={14} />
                                    </a>
                                  </div>
                                </div>
                              )}
                              {p.observacao && (
                                <p className="text-xs text-text-disabled">
                                  Obs: {p.observacao}
                                </p>
                              )}
                              <div className="flex items-center gap-1 pt-1">
                                {lastDate &&
                                  (() => {
                                    const lastMov = movimentacoes.find(
                                      (m) =>
                                        m._tipo === "saida" &&
                                        m.pdv_id === p.id &&
                                        m.data === lastDate,
                                    );
                                    if (!lastMov) return null;
                                    return (
                                      <button
                                        onClick={() => {
                                          setAutoOpenMovId(lastMov.id);
                                          setTab("saidas");
                                          setCadastroSub(null);
                                          setTimeout(() => {
                                            const el = document.getElementById(
                                              `mov-${lastMov.id}`,
                                            );
                                            if (el) {
                                              el.scrollIntoView({
                                                behavior: "smooth",
                                                block: "center",
                                              });
                                              el.classList.add(
                                                "ring-2",
                                                "ring-primary-500",
                                              );
                                              setTimeout(() => {
                                                el.classList.remove(
                                                  "ring-2",
                                                  "ring-primary-500",
                                                );
                                                setAutoOpenMovId(null);
                                              }, 2000);
                                            }
                                          }, 300);
                                        }}
                                        className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-accent-500 transition-colors"
                                        title="Ir para última compra"
                                      >
                                        <ArrowUpCircle size={15} />
                                      </button>
                                    );
                                  })()}
                                <button
                                  onClick={() => openEditPdv(p)}
                                  className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() =>
                                    confirmDelete(p.id, "revenda_pdvs")
                                  }
                                  className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-error transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                })()}
              </div>
            )}
          </div>
        )
      ) : movimentacoes.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
          <p className="text-text-secondary">
            Nenhuma {tab === "entradas" ? "entrada" : "saída"} encontrada.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {movimentacoes.map((m) => (
            <MovCard
              key={m.id}
              mov={m}
              pdvs={pdvs}
              initialOpen={autoOpenMovId === m.id}
              produtos={naturezas}
              fornecedores={fornecedores}
              onEdit={openEditMov}
              onDelete={(id) => confirmDelete(id, m._table)}
              onPagamento={openPagamento}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* MODAIS                                            */}
      {/* ══════════════════════════════════════════════════ */}

      {/* Novo Produto */}
      <Modal
        open={modal === "natureza"}
        onClose={() => setModal(null)}
        title={editingProdutoId ? "Editar Produto" : "Novo Produto"}
      >
        <form onSubmit={handleSaveNatureza} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              required
              value={formNatureza.nome}
              onChange={(e) => setFormNatureza({ nome: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Ex: Picolé Chocolate, Gelo 5KG, Cachaça 1L"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Natureza</label>
            <input
              type="text"
              value={formNatureza.natureza}
              onChange={(e) => {
                const val = e.target.value;
                setFormNatureza({ ...formNatureza, natureza: val });
                if (val.length > 0) {
                  const unique = [
                    ...new Set(
                      naturezas.map((n) => n.natureza).filter(Boolean),
                    ),
                  ];
                  const filtered = unique.filter((n) =>
                    n.toLowerCase().includes(val.toLowerCase()),
                  );
                  setProdNaturezaSuggestions(filtered);
                  setShowProdNaturezaSugg(filtered.length > 0);
                } else {
                  setShowProdNaturezaSugg(false);
                }
              }}
              onFocus={() => {
                const val = formNatureza.natureza;
                const unique = [
                  ...new Set(naturezas.map((n) => n.natureza).filter(Boolean)),
                ];
                const filtered = val
                  ? unique.filter((n) =>
                      n.toLowerCase().includes(val.toLowerCase()),
                    )
                  : unique;
                setProdNaturezaSuggestions(filtered);
                setShowProdNaturezaSugg(filtered.length > 0);
              }}
              onBlur={() =>
                setTimeout(() => setShowProdNaturezaSugg(false), 150)
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Ex: Gelo, Picolé, Bebida..."
              autoComplete="off"
            />
            {showProdNaturezaSugg && prodNaturezaSuggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-border-custom rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {prodNaturezaSuggestions.map((s) => (
                  <li
                    key={s}
                    onMouseDown={() => {
                      setFormNatureza({ ...formNatureza, natureza: s });
                      setShowProdNaturezaSugg(false);
                    }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-500"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Dimensão</label>
              <select
                value={formNatureza.dimensao}
                onChange={(e) =>
                  setFormNatureza({ ...formNatureza, dimensao: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="Unidade">Unidade</option>
                <option value="KG">KG</option>
                <option value="Metro">Metro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tamanho</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formNatureza.tamanho}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setFormNatureza({ ...formNatureza, tamanho: val });
                }}
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="Ex: 5, 10, 20"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </Modal>

      {/* Novo PDV */}
      <Modal
        open={modal === "pdv"}
        onClose={() => setModal(null)}
        title={editingPdvId ? "Editar Ponto de Venda" : "Novo Ponto de Venda"}
      >
        <form onSubmit={handleSavePdv} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              required
              value={formPdv.nome}
              onChange={(e) => setFormPdv({ ...formPdv, nome: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Ex: Bar do Milton, Mercearia Super Lar"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Natureza</label>
            <input
              type="text"
              value={formPdv.natureza}
              onChange={(e) => {
                const val = e.target.value;
                setFormPdv({ ...formPdv, natureza: val });
                if (val.length > 0) {
                  const unique = [
                    ...new Set(pdvs.map((p) => p.natureza).filter(Boolean)),
                  ];
                  const filtered = unique.filter((n) =>
                    n.toLowerCase().includes(val.toLowerCase()),
                  );
                  setNaturezaSuggestions(filtered);
                  setShowNaturezaSugg(filtered.length > 0);
                } else {
                  setShowNaturezaSugg(false);
                }
              }}
              onFocus={() => {
                const val = formPdv.natureza;
                const unique = [
                  ...new Set(pdvs.map((p) => p.natureza).filter(Boolean)),
                ];
                const filtered = val
                  ? unique.filter((n) =>
                      n.toLowerCase().includes(val.toLowerCase()),
                    )
                  : unique;
                setNaturezaSuggestions(filtered);
                setShowNaturezaSugg(filtered.length > 0);
              }}
              onBlur={() => setTimeout(() => setShowNaturezaSugg(false), 150)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Ex: Lanchonete, Churrasquinho, Bar..."
              autoComplete="off"
            />
            {showNaturezaSugg && naturezaSuggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-border-custom rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {naturezaSuggestions.map((s) => (
                  <li
                    key={s}
                    onMouseDown={() => {
                      setFormPdv({ ...formPdv, natureza: s });
                      setShowNaturezaSugg(false);
                    }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-500"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Contatos</label>
              <button
                type="button"
                onClick={() =>
                  setFormPdv({
                    ...formPdv,
                    contatos: [
                      ...formPdv.contatos,
                      { tipo: "", nome: "", telefone: "" },
                    ],
                  })
                }
                className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {(formPdv.contatos || []).map((ct, ci) => (
                <div key={ci} className="flex gap-1 items-center">
                  <input
                    type="text"
                    list="contato-tipos-list"
                    value={ct.tipo}
                    onChange={(e) => {
                      const next = [...formPdv.contatos];
                      next[ci] = { ...ct, tipo: e.target.value };
                      setFormPdv({ ...formPdv, contatos: next });
                    }}
                    className="w-full rounded-lg border border-border-custom bg-bg px-2 py-2 text-sm min-w-0"
                    placeholder="Tipo"
                  />
                  <input
                    type="text"
                    value={ct.nome}
                    onChange={(e) => {
                      const next = [...formPdv.contatos];
                      next[ci] = { ...ct, nome: e.target.value };
                      setFormPdv({ ...formPdv, contatos: next });
                    }}
                    className="w-full rounded-lg border border-border-custom bg-bg px-2 py-2 text-sm min-w-0"
                    placeholder="Nome"
                  />
                  <input
                    type="text"
                    value={ct.telefone}
                    onChange={(e) => {
                      const next = [...formPdv.contatos];
                      next[ci] = { ...ct, telefone: e.target.value };
                      setFormPdv({ ...formPdv, contatos: next });
                    }}
                    className="w-full rounded-lg border border-border-custom bg-bg px-2 py-2 text-sm min-w-0"
                    placeholder="Telefone"
                  />
                  {formPdv.contatos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = formPdv.contatos.filter(
                          (_, i) => i !== ci,
                        );
                        setFormPdv({ ...formPdv, contatos: next });
                      }}
                      className="text-text-disabled hover:text-error p-0.5 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input
                type="text"
                value={formPdv.cidade}
                onChange={(e) =>
                  setFormPdv({ ...formPdv, cidade: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bairro</label>
              <input
                type="text"
                value={formPdv.bairro}
                onChange={(e) =>
                  setFormPdv({ ...formPdv, bairro: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Logradouro
              </label>
              <input
                type="text"
                value={formPdv.logradouro}
                onChange={(e) =>
                  setFormPdv({ ...formPdv, logradouro: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="Rua, Av, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nº</label>
              <input
                type="text"
                value={formPdv.numero}
                onChange={(e) =>
                  setFormPdv({ ...formPdv, numero: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <input
              type="text"
              value={formPdv.observacao}
              onChange={(e) =>
                setFormPdv({ ...formPdv, observacao: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </Modal>

      {/* Novo Fornecedor */}
      <Modal
        open={modal === "fornecedor"}
        onClose={() => setModal(null)}
        title={editingFornecedorId ? "Editar Fornecedor" : "Novo Fornecedor"}
      >
        <form onSubmit={handleSaveFornecedor} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              required
              value={formFornecedor.nome}
              onChange={(e) =>
                setFormFornecedor({ ...formFornecedor, nome: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Ex: Distribuidora X, Fábrica Y"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Contatos</label>
              <button
                type="button"
                onClick={() =>
                  setFormFornecedor({
                    ...formFornecedor,
                    contatos: [
                      ...formFornecedor.contatos,
                      { tipo: "", nome: "", telefone: "" },
                    ],
                  })
                }
                className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              >
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {(formFornecedor.contatos || []).map((ct, ci) => (
                <div key={ci} className="flex gap-1 items-center">
                  <input
                    type="text"
                    list="contato-tipos-list"
                    value={ct.tipo}
                    onChange={(e) => {
                      const next = [...formFornecedor.contatos];
                      next[ci] = { ...ct, tipo: e.target.value };
                      setFormFornecedor({ ...formFornecedor, contatos: next });
                    }}
                    className="w-full rounded-lg border border-border-custom bg-bg px-2 py-2 text-sm min-w-0"
                    placeholder="Tipo"
                  />
                  <input
                    type="text"
                    value={ct.nome}
                    onChange={(e) => {
                      const next = [...formFornecedor.contatos];
                      next[ci] = { ...ct, nome: e.target.value };
                      setFormFornecedor({ ...formFornecedor, contatos: next });
                    }}
                    className="w-full rounded-lg border border-border-custom bg-bg px-2 py-2 text-sm min-w-0"
                    placeholder="Nome"
                  />
                  <input
                    type="text"
                    value={ct.telefone}
                    onChange={(e) => {
                      const next = [...formFornecedor.contatos];
                      next[ci] = { ...ct, telefone: e.target.value };
                      setFormFornecedor({ ...formFornecedor, contatos: next });
                    }}
                    className="w-full rounded-lg border border-border-custom bg-bg px-2 py-2 text-sm min-w-0"
                    placeholder="Telefone"
                  />
                  {formFornecedor.contatos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = formFornecedor.contatos.filter(
                          (_, i) => i !== ci,
                        );
                        setFormFornecedor({
                          ...formFornecedor,
                          contatos: next,
                        });
                      }}
                      className="text-text-disabled hover:text-error p-0.5 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input
                type="text"
                value={formFornecedor.cidade}
                onChange={(e) =>
                  setFormFornecedor({
                    ...formFornecedor,
                    cidade: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bairro</label>
              <input
                type="text"
                value={formFornecedor.bairro}
                onChange={(e) =>
                  setFormFornecedor({
                    ...formFornecedor,
                    bairro: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Logradouro
              </label>
              <input
                type="text"
                value={formFornecedor.logradouro}
                onChange={(e) =>
                  setFormFornecedor({
                    ...formFornecedor,
                    logradouro: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="Rua, Av, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nº</label>
              <input
                type="text"
                value={formFornecedor.numero}
                onChange={(e) =>
                  setFormFornecedor({
                    ...formFornecedor,
                    numero: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <input
              type="text"
              value={formFornecedor.observacao}
              onChange={(e) =>
                setFormFornecedor({
                  ...formFornecedor,
                  observacao: e.target.value,
                })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </Modal>

      {/* ─── Nova Entrada ─── */}
      <Modal
        open={modal === "entrada"}
        onClose={() => setModal(null)}
        title={editingMovId ? "Editar Entrada" : "Nova Entrada"}
      >
        <form onSubmit={handleSaveEntrada} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              required
              value={formEntrada.data}
              onChange={(e) =>
                setFormEntrada({ ...formEntrada, data: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fornecedor</label>
            <select
              value={formEntrada.fornecedor_id}
              onChange={(e) =>
                setFormEntrada({
                  ...formEntrada,
                  fornecedor_id: e.target.value,
                })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">Nenhum</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Itens - Tabela */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Itens</label>
              <button
                type="button"
                onClick={() =>
                  setFormEntrada({
                    ...formEntrada,
                    itens: [
                      ...formEntrada.itens,
                      {
                        produto_id: naturezas[0]?.id ?? "",
                        quantidade: "",
                        valor_compra_unitario: "",
                      },
                    ],
                  })
                }
                className="flex items-center gap-1 text-xs text-primary-500 font-medium hover:underline"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>
            <div className="border border-border-custom rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[2fr_50px_70px_28px] bg-surface-alt px-2 py-1.5 text-[10px] font-semibold text-text-disabled uppercase tracking-wider">
                <span>Produto</span>
                <span className="text-center">Qtd</span>
                <span className="text-center">R$ compra</span>
                <span></span>
              </div>
              {/* Rows */}
              {formEntrada.itens.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[2fr_50px_70px_28px] items-center px-2 py-1.5 border-t border-border-custom gap-1"
                >
                  <select
                    required
                    value={item.produto_id}
                    onChange={(e) => {
                      const itens = [...formEntrada.itens];
                      itens[idx] = {
                        ...itens[idx],
                        produto_id: e.target.value,
                      };
                      setFormEntrada({ ...formEntrada, itens });
                    }}
                    className="w-full rounded border border-border-custom bg-bg px-1.5 py-1.5 text-xs"
                  >
                    <option value="">...</option>
                    {naturezas.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    value={item.quantidade}
                    onChange={(e) => {
                      const itens = [...formEntrada.itens];
                      itens[idx] = {
                        ...itens[idx],
                        quantidade: e.target.value,
                      };
                      setFormEntrada({ ...formEntrada, itens });
                    }}
                    className="w-full rounded border border-border-custom bg-bg px-1.5 py-1.5 text-xs text-center"
                    placeholder="0"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.valor_compra_unitario}
                    onChange={(e) => {
                      const itens = [...formEntrada.itens];
                      itens[idx] = {
                        ...itens[idx],
                        valor_compra_unitario: e.target.value,
                      };
                      setFormEntrada({ ...formEntrada, itens });
                    }}
                    className="w-full rounded border border-border-custom bg-bg px-1.5 py-1.5 text-xs text-center"
                    placeholder="0,00"
                  />
                  {formEntrada.itens.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setFormEntrada({
                          ...formEntrada,
                          itens: formEntrada.itens.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1 rounded hover:bg-error/10 text-text-disabled hover:text-error transition-colors flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              {/* Totais */}
              <div className="grid grid-cols-[2fr_50px_70px_28px] items-center px-2 py-1.5 border-t border-border-custom bg-surface-alt text-xs font-semibold">
                <span className="text-text-secondary">Total</span>
                <span className="text-center text-text-primary">
                  {formEntrada.itens.reduce(
                    (s, i) => s + (Number(i.quantidade) || 0),
                    0,
                  )}
                </span>
                <span className="text-center text-text-primary">
                  {formEntrada.itens
                    .reduce(
                      (s, i) =>
                        s +
                        (Number(i.quantidade) || 0) *
                          (Number(i.valor_compra_unitario) || 0),
                      0,
                    )
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
                <span></span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nota Fiscal
            </label>
            <input
              type="text"
              value={formEntrada.nota_fiscal}
              onChange={(e) =>
                setFormEntrada({ ...formEntrada, nota_fiscal: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Número / referência"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <input
              type="text"
              value={formEntrada.observacao}
              onChange={(e) =>
                setFormEntrada({ ...formEntrada, observacao: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-success hover:bg-success/90 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar Entrada"}
          </button>
        </form>
      </Modal>

      {/* ─── Nova Saída ─── */}
      <Modal
        open={modal === "saida"}
        onClose={() => setModal(null)}
        title={editingMovId ? "Editar Saída" : "Nova Saída"}
      >
        <form onSubmit={handleSaveSaida} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">PDV</label>
              <select
                required
                value={formSaida.pdv_id}
                onChange={(e) =>
                  setFormSaida({ ...formSaida, pdv_id: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {pdvs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                required
                value={formSaida.data}
                onChange={(e) =>
                  setFormSaida({ ...formSaida, data: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Itens - Tabela */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Itens</label>
              <button
                type="button"
                onClick={() =>
                  setFormSaida({
                    ...formSaida,
                    itens: [
                      ...formSaida.itens,
                      {
                        produto_id: naturezas[0]?.id ?? "",
                        quantidade: "",
                        valor_compra_unitario:
                          naturezas[0]?.custo_unitario != null
                            ? String(naturezas[0].custo_unitario)
                            : "",
                        valor_venda_unitario: "",
                      },
                    ],
                  })
                }
                className="flex items-center gap-1 text-xs text-primary-500 font-medium hover:underline"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>
            <div className="border border-border-custom rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[2fr_59px_59px_59px_14px] bg-surface-alt px-2 py-1.5 text-[10px] font-semibold text-text-disabled uppercase tracking-wider">
                <span>Produto</span>
                <span className="text-center -ml-5">Qtd</span>
                <span className="text-center -ml-2">Compra</span>
                <span className="text-center -ml-1">Venda</span>
                <span></span>
              </div>
              {/* Rows */}
              {formSaida.itens.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[2fr_59px_59px_59px_14px] items-center px-2 py-1.5 border-t border-border-custom gap-1"
                >
                  <select
                    required
                    value={item.produto_id}
                    onChange={(e) => {
                      const itens = [...formSaida.itens];
                      const selectedId = e.target.value;
                      // Use custo_unitario from product catalog
                      let custoDefault = "";
                      if (selectedId) {
                        const prod = naturezas.find((n) => n.id === selectedId);
                        if (prod?.custo_unitario != null) {
                          custoDefault = String(prod.custo_unitario);
                        }
                      }
                      itens[idx] = {
                        ...itens[idx],
                        produto_id: selectedId,
                        valor_compra_unitario: custoDefault,
                      };
                      setFormSaida({ ...formSaida, itens });
                    }}
                    className="w-full rounded border border-border-custom bg-bg px-1.5 py-1.5 text-xs"
                  >
                    <option value="">...</option>
                    {naturezas.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    value={item.quantidade}
                    onChange={(e) => {
                      const itens = [...formSaida.itens];
                      itens[idx] = {
                        ...itens[idx],
                        quantidade: e.target.value,
                      };
                      setFormSaida({ ...formSaida, itens });
                    }}
                    className="w-full rounded border border-border-custom bg-bg px-1.5 py-1.5 text-xs text-center"
                    placeholder="0"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.valor_compra_unitario}
                    onChange={(e) => {
                      const itens = [...formSaida.itens];
                      itens[idx] = {
                        ...itens[idx],
                        valor_compra_unitario: e.target.value,
                      };
                      setFormSaida({ ...formSaida, itens });
                    }}
                    className="w-full rounded border border-border-custom bg-bg px-1.5 py-1.5 text-xs text-center"
                    placeholder="0,00"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.valor_venda_unitario}
                    onChange={(e) => {
                      const itens = [...formSaida.itens];
                      itens[idx] = {
                        ...itens[idx],
                        valor_venda_unitario: e.target.value,
                      };
                      setFormSaida({ ...formSaida, itens });
                    }}
                    className="w-full rounded border border-border-custom bg-bg px-1.5 py-1.5 text-xs text-center"
                    placeholder="0,00"
                  />
                  {formSaida.itens.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setFormSaida({
                          ...formSaida,
                          itens: formSaida.itens.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-0.5 rounded hover:bg-error/10 text-text-disabled hover:text-error transition-colors flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              {/* Totais */}
              <div className="grid grid-cols-[2fr_59px_59px_59px_14px] items-center px-2 py-1.5 border-t border-border-custom bg-surface-alt text-xs font-semibold">
                <span className="text-text-secondary">Total</span>
                <span className="text-center text-text-primary">
                  {formSaida.itens.reduce(
                    (s, i) => s + (Number(i.quantidade) || 0),
                    0,
                  )}
                </span>
                <span className="text-center text-text-primary">
                  {formSaida.itens
                    .reduce(
                      (s, i) =>
                        s +
                        (Number(i.quantidade) || 0) *
                          (Number(i.valor_compra_unitario) || 0),
                      0,
                    )
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
                <span className="text-center text-text-primary">
                  {formSaida.itens
                    .reduce(
                      (s, i) =>
                        s +
                        (Number(i.quantidade) || 0) *
                          (Number(i.valor_venda_unitario) || 0),
                      0,
                    )
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
                <span></span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <input
              type="text"
              value={formSaida.observacao}
              onChange={(e) =>
                setFormSaida({ ...formSaida, observacao: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar Saída"}
          </button>
        </form>
      </Modal>

      {/* Modal Perda Prompt */}
      <Modal
        open={perdaPrompt}
        onClose={() => setPerdaPrompt(false)}
        title="Quantidade negativa"
      >
        <p className="text-sm text-text-secondary mb-4">
          Você informou uma quantidade negativa. Isso é uma{" "}
          <strong>perda</strong> (produto danificado, não volta ao estoque) ou
          uma <strong>devolução</strong> (produto retorna ao estoque)?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setPerdaPrompt(false);
              handleSaveSaida(null, true);
            }}
            className="w-full flex items-center justify-center gap-2 bg-error/10 hover:bg-error/20 text-error font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            <AlertTriangle size={16} /> Registrar como Perda
          </button>
          <button
            onClick={() => {
              setPerdaPrompt(false);
              handleSaveSaida(null, false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-success/10 hover:bg-success/20 text-success font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            <ArrowDownCircle size={16} /> Devolver ao Estoque
          </button>
          <button
            onClick={() => setPerdaPrompt(false)}
            className="w-full text-sm text-text-secondary hover:text-text-primary py-2 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* Modal Forma de Pagamento */}
      <Modal
        open={modal === "forma_pgto"}
        onClose={() => setModal(null)}
        title={
          editingFormaPgtoId
            ? "Editar Forma de Pagamento"
            : "Nova Forma de Pagamento"
        }
      >
        <form onSubmit={handleSaveFormaPgto} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Nome *
            </label>
            <input
              required
              value={formFormaPgto.nome}
              onChange={(e) =>
                setFormFormaPgto({ ...formFormaPgto, nome: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-border-custom bg-surface-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Ex: Pix, Dinheiro, Cartão..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="flex-1 py-2 rounded-lg border border-border-custom text-sm font-medium hover:bg-surface-alt transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pagamento (transações) */}
      <Modal
        open={modal === "pagamento"}
        onClose={() => {
          setModal(null);
          setPagamentoMov(null);
        }}
        title="Pagamento"
      >
        {pagamentoMov &&
          (() => {
            const isEntrada = pagamentoMov._tipo === "entrada";
            const itens = pagamentoMov.itens || [];
            const totalMov = itens.reduce(
              (s, i) =>
                s +
                (i.quantidade || 0) *
                  (isEntrada
                    ? i.valor_compra_unitario || 0
                    : i.valor_venda_unitario || 0),
              0,
            );
            const totalPago = transacoes.reduce(
              (s, t) => s + Number(t.valor),
              0,
            );
            const restante = totalMov - totalPago;
            return (
              <div className="space-y-4">
                {/* Detalhes do pedido */}
                <div className="bg-surface-alt rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary">
                      {isEntrada ? "Entrada" : "Saída"}
                      {!isEntrada &&
                        pagamentoMov.pdv_id &&
                        (() => {
                          const pdv = pdvs.find(
                            (p) => p.id === pagamentoMov.pdv_id,
                          );
                          return pdv ? <> - {pdv.nome}</> : null;
                        })()}
                      {isEntrada &&
                        pagamentoMov.fornecedor_id &&
                        (() => {
                          const forn = fornecedores.find(
                            (f) => f.id === pagamentoMov.fornecedor_id,
                          );
                          return forn ? <> - {forn.nome}</> : null;
                        })()}
                    </span>
                    <span className="text-xs text-text-disabled">
                      {pagamentoMov.data}
                    </span>
                  </div>
                  {/* Tabela de itens */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-text-disabled font-medium border-b border-border-custom">
                        <td className="pb-1 text-left">Produto</td>
                        <td className="pb-1 text-right w-10">Qtd</td>
                        <td className="pb-1 text-right w-16">Unit.</td>
                        <td className="pb-1 text-right w-18">Subtotal</td>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((it, idx) => {
                        const prod = naturezas.find(
                          (n) => n.id === it.produto_id,
                        );
                        const unit = isEntrada
                          ? it.valor_compra_unitario || 0
                          : it.valor_venda_unitario || 0;
                        const sub = (it.quantidade || 0) * unit;
                        return (
                          <tr key={idx}>
                            <td className="py-0.5 truncate max-w-[120px]">
                              {prod?.nome || "—"}
                            </td>
                            <td className="py-0.5 text-right">
                              {it.quantidade}
                            </td>
                            <td className="py-0.5 text-right text-text-disabled">
                              R$ {unit.toFixed(2)}
                            </td>
                            <td className="py-0.5 text-right font-medium">
                              R$ {sub.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Total + status */}
                  <div className="flex items-center justify-between border-t border-border-custom pt-1.5 text-sm">
                    <span className="font-semibold">Total do pedido</span>
                    <span className="font-bold">R$ {totalMov.toFixed(2)}</span>
                  </div>
                  {restante > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-disabled">Restante</span>
                      <span className="text-error font-medium">
                        R$ {restante.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lista de transações */}
                {transacoes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-text-secondary">
                      Transações registradas
                    </p>
                    {transacoes.map((t) => {
                      const fp = formasPagamento.find(
                        (f) => f.id === t.forma_pagamento_id,
                      );
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between bg-surface-alt rounded-lg px-3 py-2 text-sm"
                        >
                          <div>
                            <span className="font-medium">
                              R$ {Number(t.valor).toFixed(2)}
                            </span>
                            <span className="text-text-disabled ml-2">
                              {fp?.nome || "—"}
                            </span>
                            <span className="text-text-disabled ml-2 text-xs">
                              {t.data}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteTransacao(t.id)}
                            className="p-1 text-text-disabled hover:text-error"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Form nova transação */}
                <form
                  onSubmit={handleSaveTransacao}
                  className="space-y-3 border-t border-border-custom pt-3"
                >
                  <p className="text-xs font-semibold text-text-secondary">
                    Nova transação
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-text-disabled mb-0.5">
                        Forma
                      </label>
                      <select
                        value={formTransacao.forma_pagamento_id}
                        onChange={(e) =>
                          setFormTransacao({
                            ...formTransacao,
                            forma_pagamento_id: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-border-custom bg-surface-alt text-sm"
                      >
                        <option value="">— Nenhuma —</option>
                        {formasPagamento.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-disabled mb-0.5">
                        Valor *
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formTransacao.valor}
                        onChange={(e) =>
                          setFormTransacao({
                            ...formTransacao,
                            valor: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-border-custom bg-surface-alt text-sm"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-text-disabled mb-0.5">
                      Data
                    </label>
                    <input
                      type="date"
                      value={formTransacao.data}
                      onChange={(e) =>
                        setFormTransacao({
                          ...formTransacao,
                          data: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-border-custom bg-surface-alt text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-disabled mb-0.5">
                      Observação
                    </label>
                    <input
                      value={formTransacao.observacao}
                      onChange={(e) =>
                        setFormTransacao({
                          ...formTransacao,
                          observacao: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-border-custom bg-surface-alt text-sm"
                      placeholder="Opcional"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Registrar Transação"}
                  </button>
                </form>
              </div>
            );
          })()}
      </Modal>

      {/* Modal Delete */}
      <Modal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Confirmar remoção"
      >
        <ConfirmDelete
          message="Tem certeza que deseja remover este registro?"
          onConfirm={handleSoftDelete}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <datalist id="contato-tipos-list">
        {[
          ...new Set(
            [...pdvs, ...fornecedores]
              .flatMap((x) => (x.contatos || []).map((c) => c.tipo))
              .filter(Boolean),
          ),
        ]
          .sort()
          .map((t) => (
            <option key={t} value={t} />
          ))}
      </datalist>
    </div>
  );
}
