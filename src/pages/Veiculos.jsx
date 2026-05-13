import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useBottomTabs } from "../contexts/BottomTabsContext";
import Modal from "../components/Modal";
import ConfirmDelete from "../components/ConfirmDelete";
import {
  Car,
  Plus,
  Fuel,
  Wrench,
  Trash2,
  Bike,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Tag,
  Gauge,
  Eye,
  Pencil,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const TABS = [
  { key: "abastecimentos", label: "Abastecimentos", icon: Fuel },
  { key: "manutencoes", label: "Manutenções", icon: Wrench },
  { key: "veiculos", label: "Veículos", icon: Car },
];

// ── Helpers ────────────────────────────────────────────

const fmtMoney = (v) =>
  v != null && v !== ""
    ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "—";
const fmtDate = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
const fmtKm = (v) =>
  v != null && v !== "" ? `${Number(v).toLocaleString("pt-BR")} km` : "—";

function calcKmMes(compraData, compraKm, vendaData, vendaKm, latestKm) {
  const dataFim = vendaData || today;
  const kmFim = vendaKm || latestKm || compraKm;
  if (!compraData || compraKm == null || kmFim == null) return null;
  const d1 = new Date(compraData + "T00:00:00");
  const d2 = new Date(dataFim + "T00:00:00");
  const meses = (d2 - d1) / (1000 * 60 * 60 * 24 * 30.44);
  if (meses <= 0) return null;
  return ((kmFim - compraKm) / meses).toFixed(0);
}

// ── Card expandível de veículo ─────────────────────────

function VeiculoCard({ v, onDelete, onEdit, latestKm }) {
  const [open, setOpen] = useState(false);
  const vendido = !!v.venda_data;
  const kmMes = calcKmMes(
    v.compra_data,
    v.compra_km,
    v.venda_data,
    v.venda_km,
    latestKm,
  );
  const lucro =
    v.venda_valor && v.compra_valor
      ? Number(v.venda_valor) - Number(v.compra_valor)
      : null;

  return (
    <div
      className={`bg-surface rounded-xl border overflow-hidden transition-colors ${vendido ? "border-border-custom opacity-70" : "border-border-custom"}`}
    >
      {/* Header clicável */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${v.tipo === "moto" ? "bg-primary-50" : "bg-accent-50"}`}
        >
          {v.tipo === "moto" ? (
            <Bike className="text-primary-500" size={18} />
          ) : (
            <Car className="text-accent-500" size={18} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{v.modelo}</p>
            {vendido && (
              <span className="text-[10px] font-medium bg-text-disabled/15 text-text-disabled rounded px-1.5 py-0.5">
                VENDIDO
              </span>
            )}
          </div>
          <p className="text-xs text-text-disabled truncate">
            {v.ano || "—"} · {v.placa || "Sem placa"}
            {kmMes && ` · ${kmMes} km/mês`}
          </p>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-text-disabled shrink-0" />
        ) : (
          <ChevronDown size={16} className="text-text-disabled shrink-0" />
        )}
      </button>

      {/* Detalhes expandidos */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-custom pt-3">
          {/* Documentação */}
          <div className="space-y-1 text-xs">
            <Detail label="Placa" value={v.placa} />
            <Detail label="Renavam" value={v.renavam} />
            <Detail label="Chassi" value={v.chassi} />
          </div>

          {/* Compra vs Venda */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox
              icon={ShoppingCart}
              iconColor="text-accent-500"
              title="Compra"
              lines={[
                fmtMoney(v.compra_valor),
                fmtDate(v.compra_data),
                fmtKm(v.compra_km),
              ]}
            />
            <InfoBox
              icon={Tag}
              iconColor={vendido ? "text-success" : "text-text-disabled"}
              title="Venda"
              lines={[
                fmtMoney(v.venda_valor),
                fmtDate(v.venda_data),
                fmtKm(v.venda_km),
              ]}
            />
          </div>

          {/* Resumo calculado */}
          <div className="flex items-center gap-4 text-xs bg-surface-alt rounded-lg px-3 py-2">
            {kmMes && (
              <span className="flex items-center gap-1">
                <Gauge size={12} className="text-primary-500" />
                <strong>{kmMes}</strong> km/mês
              </span>
            )}
            {lucro != null && (
              <span
                className={`flex items-center gap-1 ${lucro >= 0 ? "text-success" : "text-error"}`}
              >
                {lucro >= 0 ? "+" : ""}
                {fmtMoney(lucro)} lucro
              </span>
            )}
          </div>

          {v.observacao && (
            <p className="text-xs text-text-disabled">{v.observacao}</p>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary-500 transition-colors px-2 py-1 rounded-lg hover:bg-surface-alt"
            >
              <Eye size={13} /> Editar
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs text-text-disabled hover:text-error transition-colors px-2 py-1 rounded-lg hover:bg-surface-alt"
            >
              <Trash2 size={13} /> Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, col2 }) {
  return (
    <div className={col2 ? "col-span-2" : ""}>
      <span className="text-text-disabled">{label}:</span>{" "}
      <span className="text-text-primary font-medium">{value || "—"}</span>
    </div>
  );
}

function InfoBox({ icon: InfoIcon, iconColor, title, lines }) {
  return (
    <div className="bg-surface-alt rounded-lg p-3 space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary mb-1">
        <InfoIcon size={12} className={iconColor} />
        {title}
      </div>
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-text-primary">
          {line}
        </p>
      ))}
    </div>
  );
}

// ── Formulário de veículo ──────────────────────────────

const emptyVeiculo = {
  modelo: "",
  ano: "",
  tipo: "moto",
  placa: "",
  renavam: "",
  chassi: "",
  compra_valor: "",
  compra_data: "",
  compra_km: "",
  venda_valor: "",
  venda_data: "",
  venda_km: "",
  observacao: "",
};

function FormVeiculo({ data, onChange, onSave, saving }) {
  const set = (field, val) => onChange({ ...data, [field]: val });
  return (
    <form onSubmit={onSave} className="space-y-4">
      {/* Identificação */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
          Identificação
        </legend>
        <div>
          <label className="block text-sm font-medium mb-1">Modelo</label>
          <input
            type="text"
            required
            value={data.modelo}
            onChange={(e) => set("modelo", e.target.value)}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            placeholder="Ex: Bros ESDD"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Ano</label>
            <input
              type="text"
              value={data.ano}
              onChange={(e) => set("ano", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="2022/2023"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={data.tipo}
              onChange={(e) => set("tipo", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="moto">Moto</option>
              <option value="carro">Carro</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Placa</label>
            <input
              type="text"
              value={data.placa}
              onChange={(e) => set("placa", e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="ABC1D23"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Renavam</label>
            <input
              type="text"
              value={data.renavam}
              onChange={(e) => set("renavam", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chassi</label>
            <input
              type="text"
              value={data.chassi}
              onChange={(e) => set("chassi", e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </fieldset>

      {/* Compra */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-accent-500 uppercase tracking-wide mb-1">
          Compra
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Valor</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.compra_valor}
              onChange={(e) => set("compra_valor", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={data.compra_data}
              onChange={(e) => set("compra_data", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Odômetro</label>
            <input
              type="number"
              min="0"
              value={data.compra_km}
              onChange={(e) => set("compra_km", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </fieldset>

      {/* Venda */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-success uppercase tracking-wide mb-1">
          Venda (preencha quando vender)
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Valor</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.venda_valor}
              onChange={(e) => set("venda_valor", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={data.venda_data}
              onChange={(e) => set("venda_data", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Odômetro</label>
            <input
              type="number"
              min="0"
              value={data.venda_km}
              onChange={(e) => set("venda_km", e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </fieldset>

      {/* Observação */}
      <div>
        <label className="block text-sm font-medium mb-1">Observação</label>
        <input
          type="text"
          value={data.observacao}
          onChange={(e) => set("observacao", e.target.value)}
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
  );
}

// ── Página principal ───────────────────────────────────

export default function Veiculos() {
  const { user } = useAuth();
  const { setTabs } = useBottomTabs();
  const [tab, setTab] = useState("abastecimentos");
  const [veiculos, setVeiculos] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteTable, setDeleteTable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editAbastId, setEditAbastId] = useState(null);
  const [editManutId, setEditManutId] = useState(null);
  const [postos, setPostos] = useState([]);
  const [locais, setLocais] = useState([]);

  const [latestKmMap, setLatestKmMap] = useState({});

  const [formVeiculo, setFormVeiculo] = useState({ ...emptyVeiculo });
  const [formAbast, setFormAbast] = useState({
    veiculo_id: "",
    data: today,
    km: "",
    litros: "",
    valor_litro: "",
    valor_total_input: "",
    combustivel: "gasolina_comum",
    posto: "",
    observacao: "",
  });
  const [formManut, setFormManut] = useState({
    veiculo_id: "",
    data: today,
    km: "",
    descricao: "",
    valor: "",
    local: "",
    observacao: "",
  });

  const fetchVeiculos = useCallback(async () => {
    const { data } = await supabase
      .from("veiculos")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setVeiculos(data || []);
  }, []);

  const fetchLatestKm = useCallback(async () => {
    const [{ data: abasts }, { data: manuts }] = await Promise.all([
      supabase
        .from("veiculos_abastecimentos")
        .select("veiculo_id, km, data")
        .is("deleted_at", null)
        .not("km", "is", null),
      supabase
        .from("veiculos_manutencoes")
        .select("veiculo_id, km, data")
        .is("deleted_at", null)
        .not("km", "is", null),
    ]);
    const map = {};
    [...(abasts || []), ...(manuts || [])].forEach((r) => {
      if (!map[r.veiculo_id] || r.data > map[r.veiculo_id].data) {
        map[r.veiculo_id] = { km: r.km, data: r.data };
      }
    });
    const result = {};
    for (const [vid, val] of Object.entries(map)) result[vid] = val.km;
    setLatestKmMap(result);
  }, []);

  const fetchTab = useCallback(async () => {
    setLoading(true);
    if (tab === "veiculos") {
      setItems([]);
    } else if (tab === "abastecimentos") {
      const { data } = await supabase
        .from("veiculos_abastecimentos")
        .select("*, veiculos(modelo, tipo)")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(50);
      setItems(data || []);
      // Distinct postos for autocomplete
      const unique = [
        ...new Set((data || []).map((a) => a.posto).filter(Boolean)),
      ];
      setPostos(unique.sort());
    } else {
      const { data } = await supabase
        .from("veiculos_manutencoes")
        .select("*, veiculos(modelo, tipo)")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(50);
      setItems(data || []);
      // Distinct locais for autocomplete
      const uniqueLocais = [
        ...new Set((data || []).map((m) => m.local).filter(Boolean)),
      ];
      setLocais(uniqueLocais.sort());
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    Promise.all([fetchVeiculos(), fetchLatestKm(), fetchTab()]);
  }, [fetchVeiculos, fetchLatestKm, fetchTab]);

  // Register bottom tabs for mobile
  useEffect(() => {
    setTabs(
      <div className="flex justify-around py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setItems([]);
              setTab(t.key);
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

  // ── Salvar veículo (insert ou update) ──

  const handleSaveVeiculo = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...formVeiculo, user_id: user.id };
    // limpar numéricos
    payload.compra_valor = payload.compra_valor
      ? Number(payload.compra_valor)
      : null;
    payload.compra_km = payload.compra_km ? Number(payload.compra_km) : null;
    payload.compra_data = payload.compra_data || null;
    payload.venda_valor = payload.venda_valor
      ? Number(payload.venda_valor)
      : null;
    payload.venda_km = payload.venda_km ? Number(payload.venda_km) : null;
    payload.venda_data = payload.venda_data || null;

    if (editId) {
      const { user_id: _uid, ...rest } = payload;
      await supabase.from("veiculos").update(rest).eq("id", editId);
    } else {
      await supabase.from("veiculos").insert(payload);
    }
    setSaving(false);
    setModal(null);
    setEditId(null);
    await fetchVeiculos();
    await fetchTab();
  };

  const handleSaveAbast = async (e) => {
    e.preventDefault();
    setSaving(true);
    const litrosInput = Number(formAbast.litros) || 0;
    const totalInput = Number(formAbast.valor_total_input) || 0;
    // Calcula R$/L automaticamente
    const litros = litrosInput;
    const valorLitro =
      totalInput > 0 && litrosInput > 0
        ? Math.round((totalInput / litrosInput) * 100) / 100
        : 0;
    const valorTotal = totalInput || null;
    const { valor_total_input: _vt, valor_litro: _vl, ...rest } = formAbast;
    const payload = {
      ...rest,
      km: formAbast.km ? Number(formAbast.km) : null,
      litros: litros || 0,
      valor_litro: valorLitro || 0,
      valor_total: valorTotal,
    };
    if (editAbastId) {
      await supabase
        .from("veiculos_abastecimentos")
        .update(payload)
        .eq("id", editAbastId);
    } else {
      await supabase
        .from("veiculos_abastecimentos")
        .insert({ ...payload, user_id: user.id });
    }
    setSaving(false);
    setModal(null);
    setEditAbastId(null);
    await fetchTab();
  };

  const handleSaveManut = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...formManut,
      km: formManut.km ? Number(formManut.km) : null,
      valor: Number(formManut.valor),
      user_id: user.id,
    };
    if (editManutId) {
      const { user_id: _uid, ...rest } = payload;
      await supabase
        .from("veiculos_manutencoes")
        .update(rest)
        .eq("id", editManutId);
    } else {
      await supabase.from("veiculos_manutencoes").insert(payload);
    }
    setSaving(false);
    setModal(null);
    setEditManutId(null);
    await fetchTab();
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
    await fetchTab();
    await fetchVeiculos();
  };

  const openEdit = (v) => {
    setFormVeiculo({
      modelo: v.modelo || "",
      ano: v.ano || "",
      tipo: v.tipo || "moto",
      placa: v.placa || "",
      renavam: v.renavam || "",
      chassi: v.chassi || "",
      compra_valor: v.compra_valor ?? "",
      compra_data: v.compra_data || "",
      compra_km: v.compra_km ?? "",
      venda_valor: v.venda_valor ?? "",
      venda_data: v.venda_data || "",
      venda_km: v.venda_km ?? "",
      observacao: v.observacao || "",
    });
    setEditId(v.id);
    setModal("veiculo");
  };

  const openEditAbast = (item) => {
    setFormAbast({
      veiculo_id: item.veiculo_id || "",
      data: item.data || today,
      km: item.km ?? "",
      litros: item.litros ?? "",
      valor_litro: item.valor_litro ?? "",
      valor_total_input: item.valor_total ?? "",
      combustivel: item.combustivel || "gasolina_comum",
      posto: item.posto || "",
      observacao: item.observacao || "",
    });
    setEditAbastId(item.id);
    setModal("abast");
  };

  const openEditManut = (item) => {
    setFormManut({
      veiculo_id: item.veiculo_id || "",
      data: item.data || today,
      km: item.km ?? "",
      descricao: item.descricao || "",
      valor: item.valor ?? "",
      local: item.local || "",
      observacao: item.observacao || "",
    });
    setEditManutId(item.id);
    setModal("manut");
  };

  const openAdd = () => {
    if (tab === "veiculos") {
      setFormVeiculo({ ...emptyVeiculo });
      setEditId(null);
      setModal("veiculo");
    } else if (tab === "abastecimentos") {
      setFormAbast({
        veiculo_id: veiculos.find((v) => !v.venda_data)?.id ?? "",
        valor_total_input: "",
        combustivel: "gasolina_comum",
        posto: "",
        observacao: "",
      });
      setEditAbastId(null);
      setModal("abast");
    } else {
      setFormManut({
        veiculo_id: veiculos.find((v) => !v.venda_data)?.id ?? "",
        data: today,
        km: "",
        descricao: "",
        valor: "",
        local: "",
        observacao: "",
      });
      setEditManutId(null);
      setModal("manut");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="text-accent-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">Veículos</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {/* Tabs */}
      <div className="hidden md:flex gap-1 bg-surface-alt rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setItems([]);
              setTab(t.key);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 transition-colors ${tab === t.key ? "bg-surface text-primary-500 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : tab === "veiculos" ? (
        veiculos.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
            <p className="text-text-secondary">Nenhum veículo cadastrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {veiculos.map((v) => (
              <VeiculoCard
                key={v.id}
                v={v}
                latestKm={latestKmMap[v.id]}
                onDelete={() => {
                  setDeleteId(v.id);
                  setDeleteTable("veiculos");
                  setModal("delete");
                }}
                onEdit={() => openEdit(v)}
              />
            ))}
          </div>
        )
      ) : !loading && items.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
          <p className="text-text-secondary">Nenhum registro ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-surface rounded-xl border border-border-custom overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${tab === "abastecimentos" ? "bg-accent-50" : "bg-warning/10"}`}
                >
                  {tab === "abastecimentos" ? (
                    <Fuel className="text-accent-500" size={18} />
                  ) : (
                    <Wrench className="text-warning" size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">
                      {item.veiculos?.modelo}
                    </p>
                    <span className="text-error font-medium text-sm whitespace-nowrap">
                      {tab === "abastecimentos"
                        ? fmtMoney(item.valor_total)
                        : fmtMoney(item.valor)}
                    </span>
                  </div>
                  <p className="text-xs text-text-disabled truncate">
                    {item.data
                      ? new Date(item.data + "T00:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "2-digit" },
                        )
                      : "—"}
                    {tab === "abastecimentos" && (
                      <>
                        {item.km != null &&
                          ` · ${Number(item.km).toLocaleString("pt-BR")}`}
                        {` · ${item.combustivel === "gasolina_aditivada" ? "Aditivada" : "Comum"}`}
                        {item.valor_litro
                          ? ` · ${fmtMoney(item.valor_litro)}/L`
                          : ""}
                      </>
                    )}
                    {tab === "manutencoes" && (
                      <>
                        {item.descricao && ` · ${item.descricao}`}
                        {item.local && ` · ${item.local}`}
                      </>
                    )}
                  </p>
                  {item.observacao && (
                    <p className="text-xs text-text-disabled truncate mt-0.5">
                      {item.observacao}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      tab === "abastecimentos"
                        ? openEditAbast(item)
                        : openEditManut(item)
                    }
                    className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(item.id);
                      setDeleteTable(
                        tab === "abastecimentos"
                          ? "veiculos_abastecimentos"
                          : "veiculos_manutencoes",
                      );
                      setModal("delete");
                    }}
                    className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-error transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Veículo */}
      <Modal
        open={modal === "veiculo"}
        onClose={() => {
          setModal(null);
          setEditId(null);
        }}
        title={editId ? "Editar Veículo" : "Novo Veículo"}
      >
        <FormVeiculo
          data={formVeiculo}
          onChange={setFormVeiculo}
          onSave={handleSaveVeiculo}
          saving={saving}
        />
      </Modal>

      {/* Modal Abastecimento */}
      <Modal
        open={modal === "abast"}
        onClose={() => setModal(null)}
        title={editAbastId ? "Editar Abastecimento" : "Novo Abastecimento"}
      >
        <form onSubmit={handleSaveAbast} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Veículo</label>
            <select
              required
              value={formAbast.veiculo_id}
              onChange={(e) =>
                setFormAbast({ ...formAbast, veiculo_id: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {veiculos
                .filter((v) => !v.venda_data)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.modelo} ({v.placa || "s/ placa"})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                required
                value={formAbast.data}
                onChange={(e) =>
                  setFormAbast({ ...formAbast, data: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KM</label>
              <input
                type="number"
                min="0"
                value={formAbast.km}
                onChange={(e) =>
                  setFormAbast({ ...formAbast, km: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Valor total (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAbast.valor_total_input}
                onChange={(e) =>
                  setFormAbast({
                    ...formAbast,
                    valor_total_input: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="Ex: 150.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Litros</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formAbast.litros}
                onChange={(e) =>
                  setFormAbast({ ...formAbast, litros: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Comb.</label>
              <select
                value={formAbast.combustivel}
                onChange={(e) =>
                  setFormAbast({ ...formAbast, combustivel: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              >
                <option value="gasolina_comum">Gasolina Comum</option>
                <option value="gasolina_aditivada">Gasolina Aditivada</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Posto</label>
            <input
              type="text"
              list="postos-list"
              value={formAbast.posto}
              onChange={(e) =>
                setFormAbast({ ...formAbast, posto: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
            <datalist id="postos-list">
              {postos.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
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

      {/* Modal Manutenção */}
      <Modal
        open={modal === "manut"}
        onClose={() => setModal(null)}
        title={editManutId ? "Editar Manutenção" : "Nova Manutenção"}
      >
        <form onSubmit={handleSaveManut} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Veículo</label>
            <select
              required
              value={formManut.veiculo_id}
              onChange={(e) =>
                setFormManut({ ...formManut, veiculo_id: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {veiculos
                .filter((v) => !v.venda_data)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.modelo} ({v.placa || "s/ placa"})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                required
                value={formManut.data}
                onChange={(e) =>
                  setFormManut({ ...formManut, data: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KM</label>
              <input
                type="number"
                min="0"
                value={formManut.km}
                onChange={(e) =>
                  setFormManut({ ...formManut, km: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Local</label>
              <input
                type="text"
                list="locais-list"
                value={formManut.local}
                onChange={(e) =>
                  setFormManut({ ...formManut, local: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
              <datalist id="locais-list">
                {locais.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formManut.valor}
                onChange={(e) =>
                  setFormManut({ ...formManut, valor: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input
              type="text"
              required
              value={formManut.descricao}
              onChange={(e) =>
                setFormManut({ ...formManut, descricao: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Ex: Troca de óleo"
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

      {/* Modal delete */}
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
