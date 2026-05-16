import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import Modal from "../components/Modal";
import ConfirmDelete from "../components/ConfirmDelete";
import {
  Bell,
  Plus,
  Trash2,
  Check,
  CalendarClock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const PRIORIDADE_COLORS = {
  baixa: "text-text-disabled",
  normal: "text-accent-500",
  alta: "text-error",
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Returns the start of a 7-day rolling window (today at position 3, i.e. 2 days back)
function getWindowStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 2);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtISO(date) {
  return date.toISOString().slice(0, 10);
}

export default function Lembretes() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("agenda"); // agenda | lista
  const [filtro, setFiltro] = useState("pendentes"); // pendentes | todos
  const [weekOffset, setWeekOffset] = useState(0);

  const emptyForm = {
    titulo: "",
    descricao: "",
    data: today,
    hora: "16:00",
    prioridade: "normal",
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("lembretes")
      .select("*")
      .is("deleted_at", null)
      .order("data")
      .order("hora", { nullsFirst: false });
    if (filtro === "pendentes") query = query.eq("concluido", false);
    const { data } = await query.limit(200);
    setItems(data || []);
    setLoading(false);
  }, [filtro]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      hora: form.hora || null,
    };
    if (editingId) {
      delete payload.user_id;
      await supabase.from("lembretes").update(payload).eq("id", editingId);
    } else {
      payload.user_id = user.id;
      await supabase.from("lembretes").insert(payload);
    }
    setSaving(false);
    setModal(null);
    setEditingId(null);
    setForm(emptyForm);
    fetchData();
  };

  const toggleConcluido = async (id, atual) => {
    await supabase.from("lembretes").update({ concluido: !atual }).eq("id", id);
    fetchData();
  };

  const handleDelete = async () => {
    await supabase
      .from("lembretes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteId);
    setModal(null);
    setDeleteId(null);
    fetchData();
  };

  const fmtDate = (d) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  const isAtrasado = (item) => !item.concluido && item.data < today;
  const isHoje = (item) => item.data === today;

  // ── Agenda helpers ──
  const windowStart = useMemo(() => {
    const base = getWindowStart(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = addDays(windowStart, i);
      return {
        date: fmtISO(d),
        dayName: DIAS_SEMANA[d.getDay()],
        dayNum: d.getDate(),
        month: d.toLocaleDateString("pt-BR", { month: "short" }),
        isToday: fmtISO(d) === today,
      };
    });
  }, [windowStart]);

  const weekLabel = useMemo(() => {
    const end = addDays(windowStart, 6);
    const m1 = windowStart.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    const m2 = end.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
    return `${m1} — ${m2}`;
  }, [windowStart]);

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const it of items) {
      if (!map[it.data]) map[it.data] = [];
      map[it.data].push(it);
    }
    // Sort by hora within each day
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) =>
        (a.hora || "99:99").localeCompare(b.hora || "99:99"),
      );
    }
    return map;
  }, [items]);

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo,
      descricao: item.descricao || "",
      data: item.data,
      hora: item.hora ? item.hora.slice(0, 5) : "",
      prioridade: item.prioridade || "normal",
    });
    setModal("add");
  };

  const openAdd = (prefillDate) => {
    setEditingId(null);
    setForm({ ...emptyForm, data: prefillDate || today });
    setModal("add");
  };

  // ── Render item row (reused in both views) ──
  const ItemRow = ({ item, compact }) => (
    <div
      className={`flex items-start gap-2.5 ${compact ? "py-1.5" : "bg-surface rounded-xl border p-4"} ${
        !compact
          ? item.concluido
            ? "border-border-custom opacity-60"
            : isAtrasado(item)
              ? "border-error/30 bg-red-50/30"
              : isHoje(item)
                ? "border-primary-300/40 bg-primary-50/20"
                : "border-border-custom"
          : ""
      }`}
    >
      <button
        onClick={() => toggleConcluido(item.id, item.concluido)}
        className={`mt-0.5 h-4.5 w-4.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.concluido
            ? "bg-success border-success text-white"
            : "border-border-custom hover:border-primary-400"
        }`}
      >
        {item.concluido && <Check size={10} />}
      </button>

      <div className="flex-1 min-w-0" onClick={() => openEdit(item)}>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-medium text-xs ${item.concluido ? "line-through text-text-disabled" : ""}`}
          >
            {item.titulo}
          </span>
          {isAtrasado(item) && (
            <AlertTriangle className="text-error" size={11} />
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-disabled">
          {item.hora && <span>{item.hora.slice(0, 5)}</span>}
          {!compact && <span>{fmtDate(item.data)}</span>}
          <span
            className={`${PRIORIDADE_COLORS[item.prioridade]} font-medium capitalize`}
          >
            {item.prioridade}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => openEdit(item)}
          className="p-1.5 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => {
            setDeleteId(item.id);
            setModal("delete");
          }}
          className="p-1.5 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-error transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 -mx-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-accent-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">Lembretes</h1>
        </div>
        <button
          onClick={() => openAdd(null)}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {/* View toggle + Filtro */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: "agenda", label: "Agenda" },
            { key: "lista", label: "Lista" },
          ].map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${view === v.key ? "bg-primary-500 text-white border-primary-500" : "border-border-custom text-text-secondary hover:bg-surface-alt"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["pendentes", "todos"].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors capitalize ${filtro === f ? "bg-accent-500 text-white border-accent-500" : "border-border-custom text-text-secondary hover:bg-surface-alt"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : view === "agenda" ? (
        /* ═══════════ AGENDA VIEW ═══════════ */
        <div className="space-y-3">
          {/* Week nav */}
          <div className="flex items-center justify-between bg-surface rounded-xl border border-border-custom px-4 py-2.5">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1 rounded-lg hover:bg-surface-alt text-text-secondary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">
                {weekLabel}
              </p>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-[10px] text-primary-500 font-medium hover:underline"
                >
                  Voltar p/ hoje
                </button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1 rounded-lg hover:bg-surface-alt text-text-secondary transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Days */}
          {weekDays.map((day) => {
            const dayItems = itemsByDate[day.date] || [];
            return (
              <div
                key={day.date}
                className={`bg-surface rounded-xl border overflow-hidden ${
                  day.isToday
                    ? "border-primary-400/50 ring-1 ring-primary-400/20"
                    : "border-border-custom"
                }`}
              >
                {/* Day header */}
                <div
                  className={`flex items-center justify-between px-4 py-2 ${
                    day.isToday ? "bg-primary-50/40" : "bg-surface-alt/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase ${day.isToday ? "text-primary-500" : "text-text-disabled"}`}
                    >
                      {day.dayName}
                    </span>
                    <span
                      className={`text-sm font-semibold ${day.isToday ? "text-primary-500" : "text-text-primary"}`}
                    >
                      {day.dayNum}
                    </span>
                    <span className="text-[10px] text-text-disabled">
                      {day.month}
                    </span>
                    {day.isToday && (
                      <span className="text-[9px] bg-primary-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                        HOJE
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openAdd(day.date)}
                    className="p-1 rounded-lg hover:bg-surface-alt text-text-disabled hover:text-primary-500 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Day items */}
                <div className="px-3 pb-2">
                  {dayItems.length === 0 ? (
                    <p className="text-[10px] text-text-disabled py-1.5 text-center">
                      —
                    </p>
                  ) : (
                    dayItems.map((item) => (
                      <ItemRow key={item.id} item={item} compact />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ═══════════ LIST VIEW ═══════════ */
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
              <p className="text-text-secondary">Nenhum lembrete.</p>
            </div>
          ) : (
            items.map((item) => <ItemRow key={item.id} item={item} />)
          )}
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      <Modal
        open={modal === "add"}
        onClose={() => {
          setModal(null);
          setEditingId(null);
        }}
        title={editingId ? "Editar Lembrete" : "Novo Lembrete"}
      >
        <form onSubmit={handleSave} className="space-y-2">
          <div>
            <label className="block text-xs font-medium mb-0.5">Título</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-1.5 text-sm"
              placeholder="Ex: Pagar conta de luz"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-0.5">
              Descrição
            </label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-0.5">Data</label>
              <input
                type="date"
                required
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-0.5">Hora</label>
              <div className="flex gap-1 items-center">
                <select
                  value={form.hora ? form.hora.split(":")[0] : ""}
                  onChange={(e) => {
                    const h = e.target.value;
                    const m = form.hora ? form.hora.split(":")[1] || "00" : "00";
                    setForm({ ...form, hora: h ? `${h}:${m}` : "" });
                  }}
                  className="flex-1 rounded-lg border border-border-custom bg-bg px-2 py-1.5 text-sm"
                >
                  <option value="">--</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-text-disabled font-bold">:</span>
                <select
                  value={form.hora ? form.hora.split(":")[1] || "00" : ""}
                  onChange={(e) => {
                    const h = form.hora ? form.hora.split(":")[0] || "00" : "00";
                    const m = e.target.value;
                    setForm({ ...form, hora: m ? `${h}:${m}` : "" });
                  }}
                  className="flex-1 rounded-lg border border-border-custom bg-bg px-2 py-1.5 text-sm"
                >
                  <option value="">--</option>
                  {[0, 10, 20, 30, 40, 50].map((m) => (
                    <option key={m} value={String(m).padStart(2, "0")}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-0.5">
              Prioridade
            </label>
            <select
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-1.5 text-sm"
            >
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </Modal>

      {/* Modal Delete */}
      <Modal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Confirmar exclusão"
      >
        <ConfirmDelete
          message="Tem certeza que deseja excluir este lembrete?"
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
