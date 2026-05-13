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
  Filter,
  X,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

const TABS = [
  { key: "producao", label: "Produção", icon: Factory },
  { key: "despesas", label: "Despesas", icon: Wallet },
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
      .from("gelo_despesas")
      .select("valor_unitario")
      .eq("categoria", "plastico")
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
  }, [data.tamanho]); // eslint-disable-line react-hooks/exhaustive-deps

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

function FormDespesa({ data, onChange, onSave, saving }) {
  const [copied, setCopied] = useState(false);
  const isInsumo = data.categoria === "filtro" || data.categoria === "plastico";
  const isConsumo = data.categoria === "energia" || data.categoria === "agua";
  const unidadeConsumo = data.categoria === "energia" ? "kWh" : "m³";
  const valorFabrica =
    data.valor_conta && data.percentual_fabrica
      ? (Number(data.valor_conta) * Number(data.percentual_fabrica)) / 100
      : 0;
  const valorUnit =
    data.valor && data.quantidade && Number(data.quantidade) > 0
      ? (
          (Number(data.valor) + (Number(data.frete) || 0)) /
          Number(data.quantidade)
        ).toFixed(2)
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
            <option value="plastico">Embalagem</option>
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
              data.categoria === "plastico"
                ? "Ex: Saco 5kg, Bobina 10kg"
                : data.categoria === "filtro"
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
      {data.categoria === "plastico" && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Alça</label>
            <select
              value={data.alca ? "true" : "false"}
              onChange={(e) =>
                onChange({ ...data, alca: e.target.value === "true" })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tamanho</label>
            <select
              value={data.tamanho_saco}
              onChange={(e) =>
                onChange({ ...data, tamanho_saco: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="3">3 kg</option>
              <option value="3.5">3.5 kg</option>
              <option value="4">4 kg</option>
              <option value="5">5 kg</option>
              <option value="10">10 kg</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Micras</label>
            <select
              value={data.micras}
              onChange={(e) => onChange({ ...data, micras: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {Array.from({ length: 6 }, (_, i) =>
                (0.12 + i * 0.01).toFixed(2),
              ).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {isConsumo ? null : isInsumo ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Frete (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.frete}
              onChange={(e) => onChange({ ...data, frete: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
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

const today = new Date().toISOString().slice(0, 10);

export default function Gelo() {
  const { user } = useAuth();
  const { setTabs } = useBottomTabs();
  const [tab, setTab] = useState("producao");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'delete'
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [consumoResumo, setConsumoResumo] = useState(null);
  const [logModal, setLogModal] = useState(null); // { itemId, itemName, logs }
  const [movModal, setMovModal] = useState(null); // { itemId, itemName, estoque, editingLogId? }
  const [movForm, setMovForm] = useState({
    data: today,
    quantidade: "",
    acao: "saida",
    observacao: "",
  });
  const allCategorias = [
    "filtro",
    "plastico",
    "energia",
    "agua",
    "limpeza_caixa",
    "manutencao",
    "outro",
  ];
  const [filtroCategoria, setFiltroCategoria] = useState(
    new Set(allCategorias),
  );
  const [showFiltro, setShowFiltro] = useState(false);
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
  const emptyDespesa = {
    data: today,
    descricao: "",
    valor: "",
    quantidade: "",
    frete: "",
    categoria: "filtro",
    alca: false,
    tamanho_saco: 5,
    micras: "",
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

  const tableMap = {
    producao: "gelo_producao",
    despesas: "gelo_despesas",
    consumo: "gelo_consumo",
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (tab === "despesas") {
      const { data } = await supabase
        .from("gelo_despesas")
        .select("*")
        .is("deleted_at", null)
        .order("data", { ascending: false })
        .limit(50);
      setItems(data || []);
    } else if (tab === "consumo") {
      // Baixas: only filtro/plastico items with stock
      const { data } = await supabase
        .from("gelo_despesas")
        .select("*")
        .is("deleted_at", null)
        .in("categoria", ["filtro", "plastico"])
        .not("estoque_atual", "is", null)
        .gt("estoque_atual", 0)
        .order("data", { ascending: false });
      setItems(data || []);
      // Fetch 7-day comparison: production vs consumption
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startDate = sevenDaysAgo.toISOString().slice(0, 10);
      const [{ data: prodDays }, { data: logsDays }] = await Promise.all([
        supabase
          .from("gelo_producao")
          .select("quantidade, data")
          .is("deleted_at", null)
          .gte("data", startDate),
        supabase
          .from("gelo_consumo_lancamentos")
          .select("quantidade, descricao, categoria, data")
          .is("deleted_at", null)
          .gte("data", startDate),
      ]);
      // Group by day
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const prod = (prodDays || [])
          .filter((p) => p.data === ds)
          .reduce((s, p) => s + Number(p.quantidade || 0), 0);
        const dayLogs = (logsDays || []).filter((l) => l.data === ds);
        const consumo = dayLogs.reduce(
          (s, l) => s + Math.abs(Math.min(0, Number(l.quantidade || 0))),
          0,
        );
        days.push({
          date: ds,
          label: d
            .toLocaleDateString("pt-BR", { weekday: "short" })
            .replace(".", ""),
          prod,
          consumo,
        });
      }
      // Today's logs for movement list
      const logsHoje = (logsDays || []).filter((l) => l.data === today);
      setConsumoResumo({ days, logs: logsHoje });
    } else {
      const { data } = await supabase
        .from(tableMap[tab])
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
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === "producao") setForm(emptyProducao);
    else if (tab === "consumo") setForm(emptyConsumo);
    else setForm(emptyDespesa);
    setFiltroCategoria(new Set(allCategorias));
    setShowFiltro(false);
  }, [tab]);

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

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const isConsumoCateg =
      form.categoria === "energia" || form.categoria === "agua";
    const targetTable = tableMap[tab];
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
      tab === "despesas" &&
      payload.quantidade &&
      Number(payload.quantidade) > 0
    ) {
      payload.quantidade = Number(payload.quantidade);
      const totalComFrete =
        payload.valor + (payload.frete ? Number(payload.frete) : 0);
      payload.valor_unitario = Number(
        (totalComFrete / payload.quantidade).toFixed(4),
      );
      if (!editingId) payload.estoque_atual = payload.quantidade;
    } else if (tab === "despesas") {
      payload.quantidade = null;
      payload.valor_unitario = null;
    }
    if (tab === "despesas") {
      payload.frete = payload.frete ? Number(payload.frete) : null;
      payload.micras = payload.micras ? Number(payload.micras) : null;
      if (payload.categoria === "plastico") {
        // descricao comes from user input
      } else {
        payload.alca = null;
        payload.tamanho_saco = null;
        payload.micras = null;
      }
    }
    if (tab === "despesas" && isConsumoCateg) {
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
      // Clear insumo fields
      payload.frete = null;
      payload.alca = null;
      payload.tamanho_saco = null;
      payload.micras = null;
      payload.estoque_atual = null;
    } else if (tab === "despesas") {
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
    // Update custo_unitario on revenda_produtos for gelo products
    if (tab === "producao" && payload.preco_pacote != null && payload.tamanho) {
      const tamanho = parseInt(payload.tamanho);
      if (tamanho) {
        const { data: prods } = await supabase
          .from("revenda_produtos")
          .select("id")
          .eq("natureza", "Gelo")
          .eq("dimensao", "KG")
          .eq("tamanho", String(tamanho))
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
        .from(tableMap[tab])
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", deleteId),
      "remover",
    );
    setModal(null);
    setDeleteId(null);
    fetchData();
  };

  const handleMovSave = async (e) => {
    e.preventDefault();
    if (!movModal) return;
    const qty = Number(movForm.quantidade);
    if (!qty || qty <= 0) return;
    const delta = movForm.acao === "saida" ? -qty : qty;
    const item = items.find((i) => i.id === movModal.itemId);
    if (!item || item.estoque_atual == null) return;

    if (movModal.editingLogId) {
      // Edit existing log
      await saveLogEdit(
        movModal.editingLogId,
        delta,
        movForm.observacao,
        movForm.data,
      );
      setMovModal(null);
      setMovForm({
        data: today,
        quantidade: "",
        acao: "saida",
        observacao: "",
      });
      return;
    }

    // Create new
    const novoEstoque = Math.max(0, item.estoque_atual + delta);
    const { ok: ok1 } = await dbOp(
      supabase
        .from("gelo_despesas")
        .update({ estoque_atual: novoEstoque })
        .eq("id", movModal.itemId),
      "atualizar estoque",
    );
    if (!ok1) return;
    const { ok: ok2 } = await dbOp(
      supabase.from("gelo_consumo_lancamentos").insert({
        despesa_id: movModal.itemId,
        descricao: item.descricao || "",
        categoria: item.categoria || "",
        quantidade: delta,
        valor_unitario: item.valor_unitario ?? null,
        estoque_antes: item.estoque_atual,
        estoque_depois: novoEstoque,
        data: movForm.data,
        observacao: movForm.observacao || null,
        user_id: user.id,
      }),
      "registrar movimentação",
    );
    if (!ok2) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === movModal.itemId ? { ...i, estoque_atual: novoEstoque } : i,
      ),
    );
    setMovModal(null);
    setMovForm({ data: today, quantidade: "", acao: "saida", observacao: "" });
    fetchData();
  };

  const openLogHistory = async (item) => {
    const { data: logs } = await supabase
      .from("gelo_consumo_lancamentos")
      .select("*")
      .eq("despesa_id", item.id)
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .limit(50);
    setLogModal({
      itemId: item.id,
      itemName: item.descricao,
      logs: logs || [],
    });
  };

  const deleteLog = async (logId) => {
    const log = logModal.logs.find((l) => l.id === logId);
    if (!log) return;
    // Reverse the stock effect
    const item = items.find((i) => i.id === logModal.itemId);
    if (item) {
      const revertedStock = item.estoque_atual - Number(log.quantidade);
      await dbOp(
        supabase
          .from("gelo_despesas")
          .update({ estoque_atual: revertedStock })
          .eq("id", logModal.itemId),
        "reverter estoque",
      );
      setItems((prev) =>
        prev.map((i) =>
          i.id === logModal.itemId ? { ...i, estoque_atual: revertedStock } : i,
        ),
      );
    }
    await dbOp(
      supabase
        .from("gelo_consumo_lancamentos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", logId),
      "remover lançamento",
    );
    setLogModal((prev) => ({
      ...prev,
      logs: prev.logs.filter((l) => l.id !== logId),
    }));
    fetchData();
  };

  const saveLogEdit = async (logId, newDelta, newObs, newDate) => {
    const log = logModal.logs.find((l) => l.id === logId);
    if (!log) return;
    const oldDelta = Number(log.quantidade);
    const diff = newDelta - oldDelta;
    const item = items.find((i) => i.id === logModal.itemId);
    if (item) {
      const novoEstoque = Math.max(0, item.estoque_atual + diff);
      await dbOp(
        supabase
          .from("gelo_despesas")
          .update({ estoque_atual: novoEstoque })
          .eq("id", logModal.itemId),
        "atualizar estoque",
      );
      setItems((prev) =>
        prev.map((i) =>
          i.id === logModal.itemId ? { ...i, estoque_atual: novoEstoque } : i,
        ),
      );
      const updatePayload = {
        quantidade: newDelta,
        estoque_depois: Number(log.estoque_antes) + newDelta,
        observacao: newObs || null,
      };
      if (newDate) updatePayload.data = newDate;
      await dbOp(
        supabase
          .from("gelo_consumo_lancamentos")
          .update(updatePayload)
          .eq("id", logId),
        "editar lançamento",
      );
      setLogModal((prev) => ({
        ...prev,
        logs: prev.logs.map((l) =>
          l.id === logId
            ? {
                ...l,
                quantidade: newDelta,
                estoque_depois: Number(log.estoque_antes) + newDelta,
                observacao: newObs || null,
                ...(newDate ? { data: newDate } : {}),
              }
            : l,
        ),
      }));
    }
    fetchData();
  };

  const fmtMoney = (v) => (v != null ? `R$ ${Number(v).toFixed(2)}` : "—");
  const fmtDate = (d) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Snowflake className="text-accent-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">
            Fábrica de Gelo
          </h1>
        </div>
        {tab !== "consumo" && (
          <button
            onClick={() => {
              setEditingId(null);
              if (tab === "producao") setForm(emptyProducao);
              else setForm(emptyDespesa);
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
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2 transition-colors ${tab === t.key ? "bg-surface text-primary-500 shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtro por categoria (despesas) */}
      {tab === "despesas" && (
        <div className="relative">
          <button
            onClick={() => setShowFiltro((p) => !p)}
            className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors border ${
              filtroCategoria.size < allCategorias.length
                ? "border-primary-500 bg-primary-50 text-primary-500"
                : "border-border-custom bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            <Filter size={15} />
            Filtrar
            {filtroCategoria.size < allCategorias.length && (
              <span className="bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {filtroCategoria.size}
              </span>
            )}
          </button>
          {showFiltro && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowFiltro(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-50 bg-surface border border-border-custom rounded-xl shadow-lg p-2 min-w-[200px]">
                <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border-custom">
                  <span className="text-xs font-semibold text-text-secondary">
                    Categorias
                  </span>
                  <button
                    onClick={() => {
                      if (filtroCategoria.size === allCategorias.length)
                        setFiltroCategoria(new Set());
                      else setFiltroCategoria(new Set(allCategorias));
                    }}
                    className="text-xs text-primary-500 font-medium hover:underline"
                  >
                    {filtroCategoria.size === allCategorias.length
                      ? "Desmarcar todos"
                      : "Marcar todos"}
                  </button>
                </div>
                {[
                  { key: "filtro", label: "Filtro" },
                  { key: "plastico", label: "Embalagem" },
                  { key: "energia", label: "Conta de Energia" },
                  { key: "agua", label: "Conta de Água" },
                  { key: "limpeza_caixa", label: "Limpeza da Caixa" },
                  { key: "manutencao", label: "Manutenção" },
                  { key: "outro", label: "Outro" },
                ].map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-alt cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filtroCategoria.has(c.key)}
                      onChange={() => {
                        setFiltroCategoria((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.key)) next.delete(c.key);
                          else next.add(c.key);
                          return next;
                        });
                      }}
                      className="w-4 h-4 rounded border-border-custom text-primary-500 accent-primary-500"
                    />
                    <span className="text-sm">{c.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Gráfico produção vs consumo (Consumo tab) */}
      {tab === "consumo" &&
        consumoResumo &&
        (() => {
          const { days, logs } = consumoResumo;
          const maxVal = Math.max(
            ...days.map((d) => Math.max(d.prod, d.consumo)),
            1,
          );
          const isToday = (ds) => ds === today;
          return (
            <div className="bg-surface rounded-2xl border border-border-custom p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">
                  Produção vs Consumo · 7 dias
                </h3>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400/60" />{" "}
                    Produção
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/70" />{" "}
                    Consumo
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-1.5" style={{ height: 120 }}>
                {days.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="relative w-full flex justify-center"
                      style={{ height: 90 }}
                    >
                      {/* Produção bar (background, behind) */}
                      <div
                        className={`absolute bottom-0 w-full rounded-t-md ${isToday(d.date) ? "bg-sky-400/70" : "bg-sky-400/40"}`}
                        style={{
                          height: `${(d.prod / maxVal) * 100}%`,
                          minHeight: d.prod > 0 ? 4 : 0,
                        }}
                      />
                      {/* Consumo bar (foreground, same width, on top) */}
                      <div
                        className={`absolute bottom-0 w-full rounded-t-md ${isToday(d.date) ? "bg-orange-500/70" : "bg-orange-500/40"}`}
                        style={{
                          height: `${(d.consumo / maxVal) * 100}%`,
                          minHeight: d.consumo > 0 ? 4 : 0,
                        }}
                      />
                      {/* Values on top */}
                      {(d.prod > 0 || d.consumo > 0) && (
                        <div className="absolute -top-4 text-[9px] font-medium text-text-secondary whitespace-nowrap">
                          {d.prod > 0 && (
                            <span className="text-sky-500">{d.prod}</span>
                          )}
                          {d.prod > 0 && d.consumo > 0 && <span> / </span>}
                          {d.consumo > 0 && (
                            <span className="text-orange-500">{d.consumo}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] capitalize ${isToday(d.date) ? "font-bold text-text-primary" : "text-text-disabled"}`}
                    >
                      {isToday(d.date) ? "hoje" : d.label}
                    </span>
                  </div>
                ))}
              </div>
              {logs.length > 0 && (
                <div className="border-t border-border-custom pt-2">
                  <p className="text-xs font-medium text-text-secondary mb-1">
                    Movimentações de hoje
                  </p>
                  <div className="space-y-1">
                    {logs.map((l, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-text-primary truncate">
                          {l.descricao}
                        </span>
                        <span
                          className={`font-medium shrink-0 ml-2 ${Number(l.quantidade) < 0 ? "text-error" : "text-green-600"}`}
                        >
                          {Number(l.quantidade) < 0 ? "" : "+"}
                          {l.quantidade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* Lista */}
      {loading ? (
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
            tab === "despesas" && filtroCategoria.size < allCategorias.length
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
                        {(tab === "despesas" || tab === "consumo") && (
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
                      {tab === "despesas" &&
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
                      {tab === "despesas" && item.categoria === "plastico" && (
                        <p className="text-xs text-text-disabled mt-0.5">
                          {item.valor_unitario != null && (
                            <>
                              <span className="font-semibold text-primary-500">
                                R${" "}
                                {Number(item.valor_unitario)
                                  .toFixed(2)
                                  .replace(".", ",")}
                                /un
                              </span>
                              {" · "}
                            </>
                          )}
                          {item.tamanho_saco && <>{item.tamanho_saco}kg</>}
                          {item.tamanho_saco && <> · </>}
                          {item.alca ? "C/ Alça" : "S/ Alça"}
                          {item.micras && <> · {item.micras} µm</>}
                        </p>
                      )}
                      {tab === "despesas" &&
                        item.categoria !== "plastico" &&
                        item._table !== "gelo_consumo" &&
                        item.categoria === "limpeza_caixa" && (
                          <p className="text-xs text-text-disabled mt-0.5">
                            <span className="font-semibold text-primary-500">
                              {fmtMoney(item.valor)}
                            </span>
                            {item.descricao && <> · {item.descricao}</>}
                          </p>
                        )}
                      {tab === "despesas" &&
                        item.categoria !== "plastico" &&
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
                      {tab !== "despesas" &&
                        tab !== "consumo" &&
                        (item.observacao || item.funcionario) && (
                          <p className="text-xs text-text-disabled mt-0.5 truncate">
                            {item.funcionario && `${item.funcionario}`}
                            {item.funcionario && item.observacao && " · "}
                            {item.observacao}
                          </p>
                        )}
                      {tab === "consumo" && item.categoria === "plastico" && (
                        <p className="text-xs text-text-disabled mt-0.5">
                          {item.tamanho_saco && <>{item.tamanho_saco}kg</>}
                          {item.alca ? " · C/ Alça" : " · S/ Alça"}
                          {item.micras && <> · {item.micras} µm</>}
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
                          } else if (tab === "despesas") {
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
                              frete: item.frete ?? "",
                              categoria: item.categoria || "filtro",
                              alca: item.alca ?? false,
                              tamanho_saco: item.tamanho_saco ?? 5,
                              micras: item.micras ?? "",
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
                  {/* Estoque row */}
                  {tab === "consumo" && item.estoque_atual != null && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <span
                        className={`text-xs font-medium ${item.estoque_atual <= 0 ? "text-error" : "text-text-secondary"}`}
                      >
                        Estoque: {item.estoque_atual}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setMovModal({
                              itemId: item.id,
                              itemName: item.descricao,
                              estoque: item.estoque_atual,
                            });
                            setMovForm({
                              data: today,
                              quantidade: "",
                              acao: "saida",
                              observacao: "",
                            });
                          }}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-text-disabled hover:text-primary-500 transition-colors"
                          title="Nova movimentação"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => openLogHistory(item)}
                          className="p-1.5 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-accent-500 transition-colors"
                          title="Histórico"
                        >
                          <History size={14} />
                        </button>
                      </div>
                    </div>
                  )}
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
                : "Editar Despesa"
            : tab === "producao"
              ? "Nova Produção"
              : tab === "consumo"
                ? "Novo Consumo"
                : "Nova Despesa"
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
        {tab === "despesas" && (
          <FormDespesa
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

      {/* Modal Nova Movimentação */}
      <Modal
        open={!!movModal}
        onClose={() => setMovModal(null)}
        title={`${movModal?.editingLogId ? "Editar" : "Nova"} Movimentação · ${movModal?.itemName || ""}`}
      >
        {movModal && (
          <form onSubmit={handleMovSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input
                  type="date"
                  value={movForm.data}
                  onChange={(e) =>
                    setMovForm({ ...movForm, data: e.target.value })
                  }
                  className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={movForm.quantidade}
                  onChange={(e) =>
                    setMovForm({ ...movForm, quantidade: e.target.value })
                  }
                  className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Ação</label>
                <p className="text-xs text-text-disabled">
                  Estoque:{" "}
                  <span className="font-medium">{movModal.estoque}</span>
                  {movForm.quantidade && (
                    <>
                      {" → "}
                      <span
                        className={`font-medium ${movForm.acao === "saida" ? "text-error" : "text-green-600"}`}
                      >
                        {Math.max(
                          0,
                          movModal.estoque +
                            (movForm.acao === "saida"
                              ? -Number(movForm.quantidade)
                              : Number(movForm.quantidade)),
                        )}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovForm({ ...movForm, acao: "saida" })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    movForm.acao === "saida"
                      ? "bg-error/10 text-error border-2 border-error"
                      : "bg-surface-alt text-text-secondary border border-border-custom"
                  }`}
                >
                  <ArrowUpCircle size={16} /> Saída
                </button>
                <button
                  type="button"
                  onClick={() => setMovForm({ ...movForm, acao: "entrada" })}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    movForm.acao === "entrada"
                      ? "bg-green-500/10 text-green-600 border-2 border-green-500"
                      : "bg-surface-alt text-text-secondary border border-border-custom"
                  }`}
                >
                  <ArrowDownCircle size={16} /> Entrada
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Observação
              </label>
              <input
                type="text"
                value={movForm.observacao}
                onChange={(e) =>
                  setMovForm({ ...movForm, observacao: e.target.value })
                }
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                placeholder="Opcional"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg py-2.5 transition-colors"
            >
              Salvar
            </button>
          </form>
        )}
      </Modal>

      {/* Modal Histórico de Movimentações */}
      <Modal
        open={!!logModal}
        onClose={() => {
          setLogModal(null);
        }}
        title={`Histórico · ${logModal?.itemName || ""}`}
      >
        {logModal && (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {logModal.logs.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">
                Nenhuma movimentação registrada.
              </p>
            ) : (
              logModal.logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-surface-alt rounded-lg px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-semibold ${Number(log.quantidade) < 0 ? "text-error" : "text-green-600"}`}
                        >
                          {Number(log.quantidade) < 0 ? "" : "+"}
                          {log.quantidade}
                        </span>
                        <span className="text-text-disabled text-xs">
                          {log.estoque_antes} → {log.estoque_depois}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-disabled mt-0.5">
                        {log.data
                          ? new Date(log.data + "T00:00:00").toLocaleDateString(
                              "pt-BR",
                            )
                          : "—"}
                        {log.observacao && <> · {log.observacao}</>}
                        {log.valor_unitario != null && (
                          <>
                            {" "}
                            · R${" "}
                            {Number(log.valor_unitario)
                              .toFixed(2)
                              .replace(".", ",")}
                            /un
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => {
                          setMovModal({
                            itemId: logModal.itemId,
                            itemName: logModal.itemName,
                            estoque:
                              items.find((i) => i.id === logModal.itemId)
                                ?.estoque_atual ?? 0,
                            editingLogId: log.id,
                          });
                          setMovForm({
                            data: log.data || today,
                            quantidade: String(
                              Math.abs(Number(log.quantidade)),
                            ),
                            acao:
                              Number(log.quantidade) < 0 ? "saida" : "entrada",
                            observacao: log.observacao || "",
                          });
                        }}
                        className="p-1.5 rounded-lg hover:bg-surface text-text-disabled hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Excluir esta movimentação e reverter o estoque?",
                            )
                          ) {
                            deleteLog(log.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-text-disabled hover:text-error transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
