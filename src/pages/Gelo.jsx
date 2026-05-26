import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useBottomTabs } from "../contexts/BottomTabsContext";
import Modal from "../components/Modal";
import ConfirmDelete from "../components/ConfirmDelete";
import {
  Snowflake,
  Plus,
  Wallet,
  Factory,
  Trash2,
  Gauge,
  Pencil,
  Copy,
  X,
} from "lucide-react";

const TABS = [
  { key: "producao", label: "Produção", icon: Factory },
  { key: "custos", label: "Custos", icon: Wallet },
  { key: "consumo", label: "Consumo", icon: Gauge },
];

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

// ── Formulários ────────────────────────────────────────

function FormProducao({ data, onChange, onSave, saving, funcionarios }) {
  const [ultimaEmbalagem, setUltimaEmbalagem] = useState(null);

  useEffect(() => {
    const tamanho = parseInt(data.tamanho);
    if (!tamanho) return;
    supabase
      .from("gelo_custo_embalagens")
      .select("valor_unitario")
      .eq("tamanho_saco", tamanho)
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .limit(1)
      .then(({ data: rows }) => {
        if (rows && rows.length > 0 && rows[0].valor_unitario != null) {
          setUltimaEmbalagem(Number(rows[0].valor_unitario).toFixed(2));
        } else {
          setUltimaEmbalagem(null);
        }
      });
  }, [data.tamanho]);

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input
            type="date"
            required
            value={data.data}
            onChange={(e) => onChange({ ...data, data: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Funcionário</label>
          <input
            type="text"
            list="funcionarios-list"
            value={data.funcionario}
            onChange={(e) => onChange({ ...data, funcionario: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            placeholder="Nome"
          />
          <datalist id="funcionarios-list">
            {funcionarios.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Tamanho</label>
          <select
            value={data.tamanho}
            onChange={(e) =>
              onChange({ ...data, tamanho: Number(e.target.value) })
            }
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          >
            <option value={5}>5 kg</option>
            <option value={10}>10 kg</option>
            <option value={20}>20 kg</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Qtd sacos</label>
          <input
            type="number"
            required
            min="1"
            value={data.quantidade}
            onChange={(e) => onChange({ ...data, quantidade: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label className="flex items-center justify-between text-sm font-medium mb-1">
          <span>Preço por pacote (R$)</span>
          {ultimaEmbalagem && (
            <span className="text-xs text-text-disabled font-normal">
              R$ {ultimaEmbalagem}/embalagem
            </span>
          )}
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={data.preco_pacote}
          onChange={(e) => onChange({ ...data, preco_pacote: e.target.value })}
          className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          placeholder="0,00"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Observação</label>
        <input
          type="text"
          value={data.observacao}
          onChange={(e) => onChange({ ...data, observacao: e.target.value })}
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

function FormCusto({ data, onChange, onSave, saving }) {
  const [copied, setCopied] = useState(false);
  const isInsumo = data.categoria === "filtro";
  const isConsumo = data.categoria === "energia" || data.categoria === "agua";
  const unidadeConsumo = data.categoria === "energia" ? "kWh" : "m³";
  const valorFabrica =
    data.valor_conta && data.percentual_fabrica
      ? (Number(data.valor_conta) * Number(data.percentual_fabrica)) / 100
      : 0;
  const valorUnit =
    data.valor && data.quantidade && Number(data.quantidade) > 0
      ? (Number(data.valor) / Number(data.quantidade)).toFixed(2)
      : null;

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="grid grid-cols-[2fr_3fr] gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input
            type="date"
            required
            value={data.data}
            onChange={(e) => onChange({ ...data, data: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Categoria</label>
          <select
            value={data.categoria}
            onChange={(e) => onChange({ ...data, categoria: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          >
            <option value="filtro">Refil filtro</option>
            <option value="energia">Conta de Energia</option>
            <option value="agua">Conta de Água</option>
            <option value="limpeza_caixa">Limpeza da Caixa</option>
            <option value="manutencao">Manutenção</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      </div>
      {!isConsumo && (
        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <input
            type="text"
            required
            value={data.descricao}
            onChange={(e) => onChange({ ...data, descricao: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            placeholder={
              data.categoria === "filtro"
                ? "Ex: Refil 10 polegadas"
                : "Descrição"
            }
          />
        </div>
      )}
      {isConsumo && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Consumo ({unidadeConsumo})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={data.consumo || ""}
                onChange={(e) => onChange({ ...data, consumo: e.target.value })}
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Valor da conta (R$)
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={data.valor_conta || ""}
                onChange={(e) =>
                  onChange({ ...data, valor_conta: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Valor destinado à fábrica
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 pt-7 pb-1">
                <div
                  className="absolute -top-0.5 -translate-x-1/2 pointer-events-none"
                  style={{
                    left: `calc(${data.percentual_fabrica || 100}% + ${(50 - (data.percentual_fabrica || 100)) * 0.2}px)`,
                  }}
                >
                  <div className="bg-primary-500 text-white text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap shadow">
                    {data.percentual_fabrica || 100}%
                  </div>
                  <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-primary-500 mx-auto" />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={data.percentual_fabrica || 100}
                  onChange={(e) =>
                    onChange({ ...data, percentual_fabrica: e.target.value })
                  }
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border-custom [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
                />
              </div>
              <span className="w-[5.5rem] text-right text-lg font-bold text-primary-500 shrink-0">
                R$ {valorFabrica.toFixed(2)}
              </span>
            </div>
          </div>
        </>
      )}
      {isConsumo ? null : isInsumo ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Valor total (R$)
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={data.valor}
              onChange={(e) => onChange({ ...data, valor: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <input
              type="number"
              min="1"
              value={data.quantidade}
              onChange={(e) =>
                onChange({ ...data, quantidade: e.target.value })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-1">
            Valor total (R$)
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={data.valor}
            onChange={(e) => onChange({ ...data, valor: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
      )}
      {isInsumo && !isConsumo && (
        <div className="bg-primary-50 rounded-lg px-3 py-2 text-sm">
          <span className="text-text-secondary">Valor unitário: </span>
          <span className="font-semibold text-primary-500">
            {valorUnit ? `R$ ${valorUnit}` : "—"}
          </span>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Observação</label>
          {data.observacao && (
            <button
              type="button"
              onClick={() => {
                const ta = document.createElement("textarea");
                ta.value = data.observacao;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 text-xs text-text-disabled hover:text-primary-500 transition-colors"
            >
              <Copy size={12} />
              {copied ? "Copiado!" : "Copiar"}
            </button>
          )}
        </div>
        <textarea
          rows={2}
          value={data.observacao}
          onChange={(e) => onChange({ ...data, observacao: e.target.value })}
          className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          placeholder="Links, notas, etc..."
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

function FormConsumo({ data, onChange, onSave, saving }) {
  const unidade = data.tipo === "energia" ? "kWh" : "m³";
  const valorFabrica =
    data.valor_conta && data.percentual_fabrica
      ? (Number(data.valor_conta) * Number(data.percentual_fabrica)) / 100
      : 0;

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Tipo</label>
          <select
            value={data.tipo}
            onChange={(e) => onChange({ ...data, tipo: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          >
            <option value="energia">Conta de Energia</option>
            <option value="agua">Conta de Água</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Data da medição
          </label>
          <input
            type="date"
            required
            value={data.data}
            onChange={(e) => onChange({ ...data, data: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Consumo ({unidade})
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={data.consumo}
            onChange={(e) => onChange({ ...data, consumo: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Valor da conta (R$)
          </label>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={data.valor_conta}
            onChange={(e) => onChange({ ...data, valor_conta: e.target.value })}
            className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          Valor destinado à fábrica
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 pt-7 pb-1">
            {/* Tooltip que acompanha o thumb */}
            <div
              className="absolute -top-0.5 -translate-x-1/2 pointer-events-none"
              style={{
                left: `calc(${data.percentual_fabrica}% + ${(50 - data.percentual_fabrica) * 0.2}px)`,
              }}
            >
              <div className="bg-primary-500 text-white text-xs font-semibold rounded-md px-2 py-0.5 whitespace-nowrap shadow">
                {data.percentual_fabrica}%
              </div>
              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-primary-500 mx-auto" />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={data.percentual_fabrica}
              onChange={(e) =>
                onChange({ ...data, percentual_fabrica: e.target.value })
              }
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border-custom [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
          <span className="w-[5.5rem] text-right text-lg font-bold text-primary-500 shrink-0">
            R$ {valorFabrica.toFixed(2)}
          </span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Observação</label>
        <input
          type="text"
          value={data.observacao}
          onChange={(e) => onChange({ ...data, observacao: e.target.value })}
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

const today = new Date().toLocaleDateString("sv-SE", {
  timeZone: "America/Sao_Paulo",
});
const TABLE_MAP = {
  producao: "gelo_producao",
  custos: "gelo_custos",
  consumo: "gelo_consumo",
};

export default function Gelo() {
  const { user } = useAuth();
  const { setTabs } = useBottomTabs();
  const [tab, setTab] = useState("producao");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'delete'
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const allCategorias = [
    "filtro",
    "energia",
    "agua",
    "limpeza_caixa",
    "manutencao",
    "outro",
  ];
  const [filtroCategoria, setFiltroCategoria] = useState(
    new Set(allCategorias),
  );
  const [custoSub, setCustoSub] = useState(null);
  const [saving, setSaving] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);

  const emptyProducao = {
    data: today,
    quantidade: "",
    tamanho: 5,
    preco_pacote: "",
    funcionario: "",
    observacao: "",
  };
  const emptyCusto = {
    data: today,
    descricao: "",
    valor: "",
    quantidade: "",
    categoria: "filtro",
    observacao: "",
    // consumo fields (for energia/agua)
    consumo: "",
    valor_conta: "",
    percentual_fabrica: "100",
  };
  const emptyConsumo = {
    tipo: "energia",
    consumo: "",
    valor_conta: "",
    percentual_fabrica: "100",
    data: today,
    observacao: "",
  };

  const [form, setForm] = useState(emptyProducao);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (tab === "custos" && custoSub === "embalagens") {
      const { data } = await supabase
        .from("gelo_custo_embalagens")
        .select("*")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(50);
      setItems(data || []);
    } else if (tab === "custos") {
      const { data } = await supabase
        .from("gelo_custos")
        .select("*")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(50);
      setItems(data || []);
    } else if (tab === "consumo") {
      // Baixas: only filtro items with stock
      const { data } = await supabase
        .from("gelo_custos")
        .select("*")
        .is("deleted_at", null)
        .eq("categoria", "filtro")
        .not("estoque_atual", "is", null)
        .gt("estoque_atual", 0)
        .order("data", { ascending: false });
      setItems(data || []);
    } else {
      const { data } = await supabase
        .from(TABLE_MAP[tab])
        .select("*")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(50);
      setItems(data || []);
    }
    setLoading(false);

    // Distinct funcionarios for autocomplete
    if (tab === "producao") {
      const { data: prods } = await supabase
        .from("gelo_producao")
        .select("funcionario")
        .is("deleted_at", null)
        .not("funcionario", "is", null);
      const unique = [
        ...new Set((prods || []).map((p) => p.funcionario).filter(Boolean)),
      ];
      setFuncionarios(unique.sort());
    }
  }, [tab, custoSub]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === "producao") setForm(emptyProducao);
    else if (tab === "consumo") setForm(emptyConsumo);
    else setForm(emptyCusto);
    setFiltroCategoria(new Set(allCategorias));
    setCustoSub(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Register bottom tabs for mobile
  useEffect(() => {
    setTabs(
      <div className="flex justify-around py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "custos") {
                setCustoSub(null);
                setFiltroCategoria(new Set(allCategorias));
              }
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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isConsumoCateg =
      form.categoria === "energia" || form.categoria === "agua";
    const targetTable = TABLE_MAP[tab];
    const payload = { ...form, user_id: user.id };
    // converter numéricos
    if (payload.quantidade) payload.quantidade = Number(payload.quantidade);
    if (payload.valor_unitario)
      payload.valor_unitario = Number(payload.valor_unitario);
    if (payload.valor) payload.valor = Number(payload.valor);
    if (payload.preco_pacote !== "" && payload.preco_pacote != null)
      payload.preco_pacote = Number(payload.preco_pacote);
    else payload.preco_pacote = null;
    // preco_pacote only exists on gelo_producao
    if (tab !== "producao") delete payload.preco_pacote;
    if (
      tab === "custos" &&
      payload.quantidade &&
      Number(payload.quantidade) > 0
    ) {
      payload.quantidade = Number(payload.quantidade);
      const totalComFrete = payload.valor;
      payload.valor_unitario = Number(
        (totalComFrete / payload.quantidade).toFixed(4),
      );
      if (!editingId) payload.estoque_atual = payload.quantidade;
    } else if (tab === "custos") {
      payload.quantidade = null;
      payload.valor_unitario = null;
    }
    if (tab === "custos") {
      // Remove embalagem fields (now in gelo_custo_embalagens)
      delete payload.alca;
      delete payload.tamanho_saco;
      delete payload.micras;
      delete payload.frete;
    }
    if (tab === "custos" && isConsumoCateg) {
      // Energia/Água: map form fields to DB columns
      const consumoVal = payload.consumo ? Number(payload.consumo) : null;
      const valorContaVal = payload.valor_conta
        ? Number(payload.valor_conta)
        : null;
      const percFabrica = Number(payload.percentual_fabrica || 100);
      const valorFabrica = valorContaVal
        ? Number(((valorContaVal * percFabrica) / 100).toFixed(2))
        : null;
      payload.quantidade = consumoVal; // DB quantidade = consumo (kWh/m³)
      payload.valor = valorContaVal; // DB valor = valor_conta
      payload.valor_unitario = valorFabrica; // DB valor_unitario = valor_fabrica
      payload.percentual_fabrica = percFabrica;
      payload.descricao =
        payload.categoria === "energia" ? "Conta de Energia" : "Conta de Água";
      // Remove form-only fields
      delete payload.consumo;
      delete payload.valor_conta;
      payload.estoque_atual = null;
    } else if (tab === "custos") {
      // Non-consumo: clear consumo-related fields
      delete payload.consumo;
      delete payload.valor_conta;
      payload.percentual_fabrica = null;
    }
    if (editingId) {
      delete payload.user_id;
      const { ok } = await dbOp(
        supabase.from(targetTable).update(payload).eq("id", editingId),
        "salvar",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    } else {
      const { ok } = await dbOp(
        supabase.from(targetTable).insert(payload),
        "salvar",
      );
      if (!ok) {
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setEditingId(null);
    setModal(null);
    // Update custo_unitario on revenda_produtos for gelo products (match by name)
    if (tab === "producao" && payload.preco_pacote != null && payload.tamanho) {
      const tamanho = parseInt(payload.tamanho);
      if (tamanho) {
        const { data: prods } = await supabase
          .from("revenda_produtos")
          .select("id")
          .ilike("nome", `%gelo%${tamanho}%kg%`)
          .is("deleted_at", null);
        if (prods && prods.length > 0) {
          for (const p of prods) {
            await dbOp(
              supabase
                .from("revenda_produtos")
                .update({ custo_unitario: payload.preco_pacote })
                .eq("id", p.id),
              "atualizar custo produto",
            );
          }
        }
      }
    }
    fetchData();
  };

  const handleDelete = async () => {
    await dbOp(
      supabase
        .from(TABLE_MAP[tab])
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deleteId),
      "remover",
    );
    setModal(null);
    setDeleteId(null);
    fetchData();
  };

  const fmtMoney = (v) => (v != null ? `R$ ${Number(v).toFixed(2)}` : "—");
  const fmtDate = (d) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-4 -mx-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Snowflake className="text-accent-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">
            Fábrica de Gelo
          </h1>
        </div>
        {tab !== "consumo" && !(tab === "custos" && !custoSub) && (
          <button
            onClick={() => {
              setEditingId(null);
              if (tab === "producao") setForm(emptyProducao);
              else setForm(emptyCusto);
              setModal("add");
            }}
            className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
          >
            <Plus size={16} /> Novo
          </button>
        )}
      </div>

      {/* Tabs (desktop only, mobile uses bottom bar) */}
      <div className="hidden md:flex gap-1 bg-surface-alt rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "custos") {
                setCustoSub(null);
                setFiltroCategoria(new Set(allCategorias));
              }
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 transition-colors ${tab === t.key ? "bg-surface text-primary-500 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-abas custos */}
      {tab === "custos" && !custoSub && (
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              key: "embalagens",
              label: "Embalagens",
              desc: "Sacos de gelo",
              icon: "📦",
              categs: ["plastico"],
            },
            {
              key: "servicos",
              label: "Serviços",
              desc: "Água, Luz",
              icon: "⚡",
              categs: ["energia", "agua"],
            },
            {
              key: "manutencao",
              label: "Manutenção",
              desc: "Limpeza, filtros, reparos",
              icon: "🔧",
              categs: ["limpeza_caixa", "filtro", "manutencao"],
            },
            {
              key: "outros",
              label: "Outros",
              desc: "Custos diversos",
              icon: "📋",
              categs: ["outro"],
            },
          ].map((g) => (
            <button
              key={g.key}
              onClick={() => {
                setCustoSub(g.key);
                setFiltroCategoria(new Set(g.categs));
              }}
              className="flex flex-col items-center gap-1.5 bg-surface rounded-xl border border-border-custom p-4 hover:border-primary-500/50 hover:bg-primary-50/30 transition-colors"
            >
              <span className="text-2xl">{g.icon}</span>
              <span className="text-sm font-semibold text-text-primary">
                {g.label}
              </span>
              <span className="text-[11px] text-text-secondary text-center">
                {g.desc}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {tab === "custos" && !custoSub ? null : loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
          <p className="text-text-secondary">Nenhum registro ainda.</p>
        </div>
      ) : (
        (() => {
          const filtered =
            tab === "custos" &&
            custoSub !== "embalagens" &&
            filtroCategoria.size < allCategorias.length
              ? items.filter((i) => filtroCategoria.has(i.categoria))
              : items;
          return filtered.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
              <p className="text-text-secondary">
                Nenhum registro nesta categoria.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface rounded-xl border border-border-custom p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-text-secondary">
                          {fmtDate(item.data)}
                        </span>
                        {tab === "producao" && (
                          <span className="font-semibold">
                            {item.quantidade} sacos {item.tamanho}kg
                          </span>
                        )}
                        {(tab === "custos" || tab === "consumo") && (
                          <span className="font-semibold truncate">
                            {item.categoria === "limpeza_caixa"
                              ? "Limpeza da Caixa"
                              : item.descricao}
                          </span>
                        )}
                        {tab === "consumo" && item.estoque_atual != null && (
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${item.estoque_atual <= 3 ? "bg-error/10 text-error" : "bg-green-500/10 text-green-600"}`}
                          >
                            {item.estoque_atual} un
                          </span>
                        )}
                      </div>
                      {tab === "custos" &&
                        (item.categoria === "energia" ||
                          item.categoria === "agua") && (
                          <p className="text-xs text-text-disabled mt-0.5">
                            <span className="font-semibold text-primary-500">
                              {fmtMoney(item.valor_unitario)}
                            </span>
                            {item.percentual_fabrica < 100 && (
                              <> ({item.percentual_fabrica}%)</>
                            )}
                            {item.quantidade && (
                              <>
                                {" · "}
                                {item.quantidade}{" "}
                                {item.categoria === "energia" ? "kWh" : "m³"}
                              </>
                            )}
                          </p>
                        )}

                      {tab === "custos" &&
                        item._table !== "gelo_consumo" &&
                        item.categoria === "limpeza_caixa" && (
                          <p className="text-xs text-text-disabled mt-0.5">
                            <span className="font-semibold text-primary-500">
                              {fmtMoney(item.valor)}
                            </span>
                            {item.descricao && <> · {item.descricao}</>}
                          </p>
                        )}
                      {tab === "custos" &&
                        item.categoria !== "energia" &&
                        item.categoria !== "agua" &&
                        item._table !== "gelo_consumo" &&
                        item.categoria !== "limpeza_caixa" &&
                        item.valor_unitario != null && (
                          <p className="text-xs text-text-disabled mt-0.5">
                            <span className="font-semibold text-primary-500">
                              R${" "}
                              {Number(item.valor_unitario)
                                .toFixed(2)
                                .replace(".", ",")}
                              /un
                            </span>
                          </p>
                        )}
                      {tab !== "custos" &&
                        tab !== "consumo" &&
                        (item.observacao || item.funcionario) && (
                          <p className="text-xs text-text-disabled mt-0.5 truncate">
                            {item.funcionario && `${item.funcionario}`}
                            {item.funcionario && item.observacao && " · "}
                            {item.observacao}
                          </p>
                        )}
                    </div>
                    <div
                      className={`flex items-center gap-0.5 ml-2 shrink-0 ${tab === "consumo" ? "hidden" : ""}`}
                    >
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          if (tab === "producao") {
                            setForm({
                              data: item.data || "",
                              quantidade: item.quantidade ?? "",
                              tamanho: item.tamanho || 5,
                              preco_pacote: item.preco_pacote ?? "",
                              funcionario: item.funcionario || "",
                              observacao: item.observacao || "",
                            });
                          } else if (tab === "custos") {
                            const isConsumoItem =
                              item.categoria === "energia" ||
                              item.categoria === "agua";
                            setForm({
                              data: item.data || "",
                              descricao: item.descricao || "",
                              valor: isConsumoItem ? "" : (item.valor ?? ""),
                              quantidade: isConsumoItem
                                ? ""
                                : (item.quantidade ?? ""),
                              categoria: item.categoria || "filtro",
                              observacao: item.observacao || "",
                              consumo: isConsumoItem
                                ? (item.quantidade ?? "")
                                : "",
                              valor_conta: isConsumoItem
                                ? (item.valor ?? "")
                                : "",
                              percentual_fabrica:
                                item.percentual_fabrica ?? "100",
                            });
                          } else {
                            setForm({
                              tipo: item.tipo || "energia",
                              consumo: item.quantidade ?? "",
                              valor_conta: item.valor ?? "",
                              percentual_fabrica:
                                item.percentual_fabrica ?? "100",
                              data: item.data || "",
                              observacao: item.observacao || "",
                            });
                          }
                          setModal("add");
                        }}
                        className="p-2 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteId(item.id);
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
          );
        })()
      )}

      {/* Modal Adicionar */}
      <Modal
        open={modal === "add"}
        onClose={() => setModal(null)}
        title={
          editingId
            ? tab === "producao"
              ? "Editar Produção"
              : tab === "consumo"
                ? "Editar Consumo"
                : "Editar Custo"
            : tab === "producao"
              ? "Nova Produção"
              : tab === "consumo"
                ? "Novo Consumo"
                : "Novo Custo"
        }
      >
        {tab === "producao" && (
          <FormProducao
            data={form}
            onChange={setForm}
            onSave={handleSave}
            saving={saving}
            funcionarios={funcionarios}
          />
        )}
        {tab === "custos" && (
          <FormCusto
            data={form}
            onChange={setForm}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {tab === "consumo" && (
          <FormConsumo
            data={form}
            onChange={setForm}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </Modal>

      {/* Modal Delete */}
      <Modal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Confirmar exclusão"
      >
        <ConfirmDelete
          message="Tem certeza que deseja excluir este registro?"
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
