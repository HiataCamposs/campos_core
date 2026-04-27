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
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const TABS = [
  { key: "movimentacoes", label: "Movimentações", icon: Repeat },
  { key: "produtos", label: "Produtos", icon: Tag },
  { key: "fornecedores", label: "Fornecedores", icon: Truck },
  { key: "pdvs", label: "PDVs", icon: MapPin },
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
  onTogglePago,
  onEdit,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const isEntrada = mov.tipo === "entrada";
  const pdv = pdvs.find((p) => p.id === mov.pdv_id);
  const prod = produtos.find((n) => n.id === mov.natureza_id);
  const forn = fornecedores.find((f) => f.id === mov.fornecedor_id);
  const pago = mov.status_pagamento === "pago";

  const Icon = isEntrada ? ArrowDownCircle : ArrowUpCircle;
  const colorClass = isEntrada
    ? "text-success"
    : mov.is_perda
      ? "text-error"
      : pago
        ? "text-accent-500"
        : "text-warning";
  const bgClass = isEntrada
    ? "bg-success/10"
    : mov.is_perda
      ? "bg-error/10"
      : pago
        ? "bg-accent-50"
        : "bg-warning/10";
  const borderClass = isEntrada
    ? "border-success/30"
    : mov.is_perda
      ? "border-error/30"
      : pago
        ? "border-accent-500/30"
        : "border-warning/30";

  return (
    <div
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
            <span
              className={`text-[10px] font-bold rounded px-1.5 py-0.5 uppercase ${isEntrada ? "bg-success/10 text-success" : "bg-accent-50 text-accent-600"}`}
            >
              {isEntrada ? "Entrada" : "Saída"}
            </span>
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
            {!isEntrada && !mov.is_perda && (
              <span
                className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${pago ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
              >
                {pago ? "PAGO" : "PENDENTE"}
              </span>
            )}
          </div>
          <p className="text-xs text-text-disabled">
            {fmtDate(mov.data)}
            {" · "}
            {prod?.nome || "—"}
            {" · "}
            {mov.quantidade}x {fmtMoney(mov.valor_compra_unitario)}
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-text-disabled">Produto</span>
            <span className="text-text-primary font-medium">
              {prod?.nome || "—"}
            </span>
            <span className="text-text-disabled">Quantidade</span>
            <span className="text-text-primary font-medium">
              {mov.quantidade}
            </span>
            <span className="text-text-disabled">Compra unit.</span>
            <span className="text-text-primary font-medium">
              {fmtMoney(mov.valor_compra_unitario)}
            </span>
            <span className="text-text-disabled">Compra total</span>
            <span className="text-text-primary font-medium">
              {fmtMoney(mov.valor_compra_total)}
            </span>
            {!isEntrada && (
              <>
                <span className="text-text-disabled">Venda unit.</span>
                <span className="text-text-primary font-medium">
                  {fmtMoney(mov.valor_venda_unitario)}
                </span>
                <span className="text-text-disabled">Venda total</span>
                <span className="text-text-primary font-medium">
                  {fmtMoney(mov.valor_venda_total)}
                </span>
                <span className="text-text-disabled">Acerto</span>
                <span className="text-text-primary font-medium">
                  {fmtMoney(mov.valor_acerto)}
                </span>
                <span className="text-text-disabled">PDV</span>
                <span className="text-text-primary font-medium">
                  {pdv?.nome || "—"}
                </span>
              </>
            )}
            {isEntrada && forn && (
              <>
                <span className="text-text-disabled">Fornecedor</span>
                <span className="text-text-primary font-medium">
                  {forn.nome}
                </span>
              </>
            )}
            {isEntrada && mov.nota_fiscal && (
              <>
                <span className="text-text-disabled">Nota fiscal</span>
                <span className="text-text-primary font-medium">
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
            {!isEntrada && !mov.is_perda ? (
              <button
                onClick={() => onTogglePago(mov.id, pago)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${pago ? "text-warning hover:underline" : "text-success hover:underline"}`}
              >
                {pago ? (
                  <>
                    <Clock size={12} /> Marcar pendente
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={12} /> Marcar pago
                  </>
                )}
              </button>
            ) : (
              <span />
            )}
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
  const [tab, setTab] = useState("movimentacoes");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteTable, setDeleteTable] = useState(null);
  const [editingFornecedorId, setEditingFornecedorId] = useState(null);
  const [editingProdutoId, setEditingProdutoId] = useState(null);
  const [editingPdvId, setEditingPdvId] = useState(null);
  const [editingMovId, setEditingMovId] = useState(null);
  const [editingMovTipo, setEditingMovTipo] = useState(null);
  const [perdaPrompt, setPerdaPrompt] = useState(false);

  // Data
  const [naturezas, setNaturezas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [pdvs, setPdvs] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filtroMov, setFiltroMov] = useState("todas");

  // Forms
  const [formNatureza, setFormNatureza] = useState({ nome: "" });
  const [formFornecedor, setFormFornecedor] = useState({
    nome: "",
    contato: "",
    cidade: "",
    bairro: "",
    logradouro: "",
    numero: "",
    observacao: "",
  });
  const [formPdv, setFormPdv] = useState({
    nome: "",
    contato: "",
    cidade: "",
    bairro: "",
    logradouro: "",
    numero: "",
    observacao: "",
  });
  const [formEntrada, setFormEntrada] = useState({
    data: today,
    fornecedor_id: "",
    natureza_id: "",
    quantidade: "",
    valor_compra_unitario: "",
    nota_fiscal: "",
    observacao: "",
  });
  const [formSaida, setFormSaida] = useState({
    data: today,
    pdv_id: "",
    natureza_id: "",
    quantidade: "",
    valor_compra_unitario: "",
    valor_venda_unitario: "",
    valor_acerto: "",
    observacao: "",
  });

  // ── Fetch ──

  const fetchNaturezas = useCallback(async () => {
    const { data } = await supabase
      .from("revenda_naturezas")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    setNaturezas(data || []);
  }, []);

  const fetchFornecedores = useCallback(async () => {
    const { data } = await supabase
      .from("revenda_fornecedores")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    setFornecedores(data || []);
  }, []);

  const fetchPdvs = useCallback(async () => {
    const { data } = await supabase
      .from("revenda_pdvs")
      .select("*")
      .is("deleted_at", null)
      .order("nome");
    setPdvs(data || []);
  }, []);

  const fetchMovimentacoes = useCallback(async () => {
    let query = supabase
      .from("revenda_movimentacoes")
      .select("*")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .order("tipo", { ascending: false })
      .limit(100);
    if (filtroMov === "entradas") query = query.eq("tipo", "entrada");
    if (filtroMov === "saidas") query = query.eq("tipo", "saida");
    if (filtroMov === "pendentes")
      query = query.eq("tipo", "saida").eq("status_pagamento", "pendente");
    const { data } = await query;
    setMovimentacoes(data || []);
  }, [filtroMov]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchNaturezas(),
      fetchFornecedores(),
      fetchPdvs(),
      fetchMovimentacoes(),
    ]);
    setLoading(false);
  }, [fetchNaturezas, fetchFornecedores, fetchPdvs, fetchMovimentacoes]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Register bottom tabs for mobile
  useEffect(() => {
    setTabs(
      <div className="flex justify-around py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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
      await supabase
        .from("revenda_naturezas")
        .update({ nome: formNatureza.nome })
        .eq("id", editingProdutoId);
    } else {
      await supabase
        .from("revenda_naturezas")
        .insert({ ...formNatureza, user_id: user.id });
    }
    setSaving(false);
    setModal(null);
    setEditingProdutoId(null);
    setFormNatureza({ nome: "" });
    await fetchNaturezas();
  };

  const handleSaveFornecedor = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editingFornecedorId) {
      await supabase
        .from("revenda_fornecedores")
        .update({
          nome: formFornecedor.nome,
          contato: formFornecedor.contato || null,
          cidade: formFornecedor.cidade || null,
          bairro: formFornecedor.bairro || null,
          logradouro: formFornecedor.logradouro || null,
          numero: formFornecedor.numero || null,
          observacao: formFornecedor.observacao || null,
        })
        .eq("id", editingFornecedorId);
    } else {
      await supabase
        .from("revenda_fornecedores")
        .insert({ ...formFornecedor, user_id: user.id });
    }
    setSaving(false);
    setModal(null);
    setEditingFornecedorId(null);
    setFormFornecedor({
      nome: "",
      contato: "",
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
    if (editingPdvId) {
      await supabase
        .from("revenda_pdvs")
        .update({
          nome: formPdv.nome,
          contato: formPdv.contato || null,
          cidade: formPdv.cidade || null,
          bairro: formPdv.bairro || null,
          logradouro: formPdv.logradouro || null,
          numero: formPdv.numero || null,
          observacao: formPdv.observacao || null,
        })
        .eq("id", editingPdvId);
    } else {
      await supabase
        .from("revenda_pdvs")
        .insert({ ...formPdv, user_id: user.id });
    }
    setSaving(false);
    setModal(null);
    setEditingPdvId(null);
    setFormPdv({
      nome: "",
      contato: "",
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
      natureza_id: formEntrada.natureza_id || null,
      quantidade: Number(formEntrada.quantidade),
      valor_compra_unitario: Number(formEntrada.valor_compra_unitario) || null,
      fornecedor_id: formEntrada.fornecedor_id || null,
      nota_fiscal: formEntrada.nota_fiscal || null,
      observacao: formEntrada.observacao || null,
    };
    if (editingMovId) {
      await supabase
        .from("revenda_movimentacoes")
        .update(payload)
        .eq("id", editingMovId);
    } else {
      await supabase
        .from("revenda_movimentacoes")
        .insert({ ...payload, tipo: "entrada", user_id: user.id });
    }
    setSaving(false);
    setModal(null);
    setEditingMovId(null);
    setEditingMovTipo(null);
    await fetchMovimentacoes();
  };

  const handleSaveSaida = async (e, forcePerda) => {
    e?.preventDefault?.();
    const qty = Number(formSaida.quantidade);

    // Se quantidade negativa e ainda não decidiu: perguntar
    if (qty < 0 && forcePerda === undefined) {
      setPerdaPrompt(true);
      return;
    }

    setSaving(true);
    const isPerda = forcePerda === true;
    const absQty = Math.abs(qty);
    const vc = Number(formSaida.valor_compra_unitario) || null;
    const vv = Number(formSaida.valor_venda_unitario) || null;
    const acerto =
      formSaida.valor_acerto !== ""
        ? Number(formSaida.valor_acerto)
        : vv && qty
          ? vv * Math.abs(qty)
          : null;

    if (qty < 0 && !isPerda && !editingMovId) {
      // Devolução → criar ENTRADA com quantidade positiva
      await supabase.from("revenda_movimentacoes").insert({
        tipo: "entrada",
        data: formSaida.data,
        natureza_id: formSaida.natureza_id || null,
        quantidade: absQty,
        valor_compra_unitario: vc,
        fornecedor_id: null,
        observacao: formSaida.observacao
          ? `Devolução: ${formSaida.observacao}`
          : "Devolução de PDV",
        user_id: user.id,
      });
    } else {
      // Normal ou perda
      const payload = {
        data: formSaida.data,
        pdv_id: formSaida.pdv_id || null,
        natureza_id: formSaida.natureza_id || null,
        quantidade: isPerda ? absQty : qty,
        valor_compra_unitario: vc,
        valor_venda_unitario: isPerda ? null : vv,
        valor_acerto: isPerda ? null : acerto,
        observacao: isPerda
          ? formSaida.observacao
            ? `Perda: ${formSaida.observacao}`
            : "Perda"
          : formSaida.observacao || null,
        is_perda: isPerda,
      };
      if (editingMovId) {
        await supabase
          .from("revenda_movimentacoes")
          .update(payload)
          .eq("id", editingMovId);
      } else {
        await supabase
          .from("revenda_movimentacoes")
          .insert({ ...payload, tipo: "saida", user_id: user.id });
      }
    }
    setSaving(false);
    setModal(null);
    setPerdaPrompt(false);
    setEditingMovId(null);
    setEditingMovTipo(null);
    await fetchMovimentacoes();
  };

  // ── Toggle pago/pendente ──

  const togglePago = async (id, isPago) => {
    await supabase
      .from("revenda_movimentacoes")
      .update({
        status_pagamento: isPago ? "pendente" : "pago",
        data_pagamento: isPago ? null : today,
      })
      .eq("id", id);
    await fetchMovimentacoes();
  };

  // ── Soft-delete ──

  const handleSoftDelete = async () => {
    await supabase
      .from(deleteTable)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteId);
    setModal(null);
    setDeleteId(null);
    setDeleteTable(null);
    await fetchAll();
  };

  const confirmDelete = (id, table) => {
    setDeleteId(id);
    setDeleteTable(table);
    setModal("delete");
  };

  // ── Open modals ──

  const openAddNatureza = () => {
    setEditingProdutoId(null);
    setFormNatureza({ nome: "" });
    setModal("natureza");
  };

  const openEditNatureza = (n) => {
    setEditingProdutoId(n.id);
    setFormNatureza({ nome: n.nome });
    setModal("natureza");
  };

  const openAddFornecedor = () => {
    setEditingFornecedorId(null);
    setFormFornecedor({
      nome: "",
      contato: "",
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
      contato: f.contato || "",
      cidade: f.cidade || "",
      bairro: f.bairro || "",
      logradouro: f.logradouro || "",
      numero: f.numero || "",
      observacao: f.observacao || "",
    });
    setModal("fornecedor");
  };

  const openAddPdv = () => {
    setEditingPdvId(null);
    setFormPdv({
      nome: "",
      contato: "",
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
      contato: p.contato || "",
      cidade: p.cidade || "",
      bairro: p.bairro || "",
      logradouro: p.logradouro || "",
      numero: p.numero || "",
      observacao: p.observacao || "",
    });
    setModal("pdv");
  };

  const openAddEntrada = () => {
    setEditingMovId(null);
    setEditingMovTipo(null);
    setFormEntrada({
      data: today,
      fornecedor_id: fornecedores[0]?.id ?? "",
      natureza_id: naturezas[0]?.id ?? "",
      quantidade: "",
      valor_compra_unitario: "",
      nota_fiscal: "",
      observacao: "",
    });
    setModal("entrada");
  };

  const openAddSaida = () => {
    setEditingMovId(null);
    setEditingMovTipo(null);
    setFormSaida({
      data: today,
      pdv_id: pdvs[0]?.id ?? "",
      natureza_id: naturezas[0]?.id ?? "",
      quantidade: "",
      valor_compra_unitario: "",
      valor_venda_unitario: "",
      valor_acerto: "",
      observacao: "",
    });
    setModal("saida");
  };

  const openEditMov = (m) => {
    setEditingMovId(m.id);
    setEditingMovTipo(m.tipo);
    if (m.tipo === "entrada") {
      setFormEntrada({
        data: m.data || today,
        fornecedor_id: m.fornecedor_id || "",
        natureza_id: m.natureza_id || "",
        quantidade: m.quantidade?.toString() || "",
        valor_compra_unitario: m.valor_compra_unitario?.toString() || "",
        nota_fiscal: m.nota_fiscal || "",
        observacao: m.observacao || "",
      });
      setModal("entrada");
    } else {
      setFormSaida({
        data: m.data || today,
        pdv_id: m.pdv_id || "",
        natureza_id: m.natureza_id || "",
        quantidade: m.quantidade?.toString() || "",
        valor_compra_unitario: m.valor_compra_unitario?.toString() || "",
        valor_venda_unitario: m.valor_venda_unitario?.toString() || "",
        valor_acerto: m.valor_acerto?.toString() || "",
        observacao: m.observacao || "",
      });
      setModal("saida");
    }
  };

  // ── Render ──

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between min-h-[40px]">
        <div className="flex items-center gap-2 shrink-0">
          <Package className="text-accent-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">Revenda</h1>
        </div>
        <div className="flex gap-2">
          {tab === "movimentacoes" ? (
            <>
              <button
                onClick={openAddEntrada}
                className="flex items-center gap-1.5 border border-success/50 text-success hover:bg-success/5 text-sm font-medium rounded-lg px-3 py-2 transition-colors"
              >
                <ArrowDownCircle size={16} /> Entrada
              </button>
              <button
                onClick={openAddSaida}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
              >
                <ArrowUpCircle size={16} /> Saída
              </button>
            </>
          ) : (
            <button
              onClick={
                tab === "produtos"
                  ? openAddNatureza
                  : tab === "fornecedores"
                    ? openAddFornecedor
                    : openAddPdv
              }
              className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
            >
              <Plus size={16} />{" "}
              {tab === "produtos"
                ? "Produto"
                : tab === "fornecedores"
                  ? "Fornecedor"
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
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 transition-colors ${tab === t.key ? "bg-surface text-primary-500 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Filtros movimentação */}
      <div
        className={`flex gap-2 flex-wrap ${tab !== "movimentacoes" ? "hidden" : ""}`}
      >
        {["todas", "entradas", "saidas", "pendentes"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltroMov(f)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors capitalize ${filtroMov === f ? "bg-primary-500 text-white border-primary-500" : "border-border-custom text-text-secondary hover:bg-surface-alt"}`}
          >
            {f === "saidas" ? "saídas" : f}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : tab === "produtos" ? (
        naturezas.length === 0 ? (
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
                onDelete={(id) => confirmDelete(id, "revenda_naturezas")}
              />
            ))}
          </div>
        )
      ) : tab === "fornecedores" ? (
        fornecedores.length === 0 ? (
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
                    <p className="font-semibold text-sm truncate">{f.nome}</p>
                    {f.contato && (
                      <p className="text-xs text-text-disabled">{f.contato}</p>
                    )}
                    {(f.bairro || f.cidade) && (
                      <p className="text-xs text-text-disabled truncate">
                        {[f.bairro, f.cidade].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {!f.contato && !f.bairro && !f.cidade && (
                      <p className="text-xs text-text-disabled">Sem detalhes</p>
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
        )
      ) : tab === "pdvs" ? (
        pdvs.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
            <p className="text-text-secondary">
              Cadastre seus pontos de venda.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pdvs.map((p) => (
              <div
                key={p.id}
                onClick={() => openEditPdv(p)}
                className="bg-surface rounded-xl border border-border-custom p-4 flex items-center justify-between cursor-pointer hover:bg-surface-alt/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Store className="text-primary-500" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.nome}</p>
                    {p.contato && (
                      <p className="text-xs text-text-disabled">{p.contato}</p>
                    )}
                    {(p.bairro || p.cidade) && (
                      <p className="text-xs text-text-disabled truncate">
                        {[p.bairro, p.cidade].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {!p.contato && !p.bairro && !p.cidade && (
                      <p className="text-xs text-text-disabled">Sem detalhes</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditPdv(p);
                    }}
                    className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(p.id, "revenda_pdvs");
                    }}
                    className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-error transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : movimentacoes.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
          <p className="text-text-secondary">
            Nenhuma movimentação
            {filtroMov !== "todas"
              ? ` (${filtroMov === "saidas" ? "saídas" : filtroMov})`
              : ""}{" "}
            encontrada.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {movimentacoes.map((m) => (
            <MovCard
              key={m.id}
              mov={m}
              pdvs={pdvs}
              produtos={naturezas}
              fornecedores={fornecedores}
              onTogglePago={togglePago}
              onEdit={openEditMov}
              onDelete={(id) => confirmDelete(id, "revenda_movimentacoes")}
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
          <div>
            <label className="block text-sm font-medium mb-1">Contato</label>
            <input
              type="text"
              value={formPdv.contato}
              onChange={(e) =>
                setFormPdv({ ...formPdv, contato: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Telefone / WhatsApp"
            />
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
            <label className="block text-sm font-medium mb-1">Contato</label>
            <input
              type="text"
              value={formFornecedor.contato}
              onChange={(e) =>
                setFormFornecedor({
                  ...formFornecedor,
                  contato: e.target.value,
                })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Telefone / WhatsApp"
            />
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
          <div>
            <label className="block text-sm font-medium mb-1">Produto</label>
            <select
              required
              value={formEntrada.natureza_id}
              onChange={(e) =>
                setFormEntrada({
                  ...formEntrada,
                  natureza_id: e.target.value,
                })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {naturezas.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Qtd</label>
              <input
                type="number"
                required
                value={formEntrada.quantidade}
                onChange={(e) =>
                  setFormEntrada({
                    ...formEntrada,
                    quantidade: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                R$ custo (und)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formEntrada.valor_compra_unitario}
                onChange={(e) =>
                  setFormEntrada({
                    ...formEntrada,
                    valor_compra_unitario: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
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
          <div>
            <label className="block text-sm font-medium mb-1">Produto</label>
            <select
              required
              value={formSaida.natureza_id}
              onChange={(e) =>
                setFormSaida({
                  ...formSaida,
                  natureza_id: e.target.value,
                })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {naturezas.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <input
              type="number"
              required
              value={formSaida.quantidade}
              onChange={(e) =>
                setFormSaida({ ...formSaida, quantidade: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Use negativo para devoluções (ex: -8)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                R$ compra (und)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formSaida.valor_compra_unitario}
                onChange={(e) =>
                  setFormSaida({
                    ...formSaida,
                    valor_compra_unitario: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                R$ venda (und)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formSaida.valor_venda_unitario}
                onChange={(e) =>
                  setFormSaida({
                    ...formSaida,
                    valor_venda_unitario: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Valor acerto
            </label>
            <input
              type="number"
              step="0.01"
              value={formSaida.valor_acerto}
              onChange={(e) =>
                setFormSaida({ ...formSaida, valor_acerto: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Se vazio, calcula Qtd × Venda"
            />
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
    </div>
  );
}
