import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const PRIORIDADE_COLORS = {
  baixa: "text-text-disabled",
  normal: "text-accent-500",
  alta: "text-error",
};

export default function Lembretes() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState("pendentes"); // pendentes | todos

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    data: today,
    hora: "",
    prioridade: "normal",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("lembretes")
      .select("*")
      .is("deleted_at", null)
      .order("data")
      .order("hora", { nullsFirst: false });
    if (filtro === "pendentes") query = query.eq("concluido", false);
    const { data } = await query.limit(100);
    setItems(data || []);
    setLoading(false);
  }, [filtro]);

  useEffect(() => {
    let ignore = false;
    fetchData().then(() => {
      if (ignore) return;
    });
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      hora: form.hora || null,
      user_id: user.id,
    };
    await supabase.from("lembretes").insert(payload);
    setSaving(false);
    setModal(null);
    setForm({
      titulo: "",
      descricao: "",
      data: today,
      hora: "",
      prioridade: "normal",
    });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-accent-500" size={22} />
          <h1 className="text-xl font-bold text-text-primary">Lembretes</h1>
        </div>
        <button
          onClick={() => {
            setForm({
              titulo: "",
              descricao: "",
              data: today,
              hora: "",
              prioridade: "normal",
            });
            setModal("add");
          }}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        {["pendentes", "todos"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors capitalize ${filtro === f ? "bg-primary-500 text-white border-primary-500" : "border-border-custom text-text-secondary hover:bg-surface-alt"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border-custom p-8 text-center">
          <p className="text-text-secondary">Nenhum lembrete.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-surface rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                item.concluido
                  ? "border-border-custom opacity-60"
                  : isAtrasado(item)
                    ? "border-error/30 bg-red-50/30"
                    : isHoje(item)
                      ? "border-primary-300/40 bg-primary-50/20"
                      : "border-border-custom"
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleConcluido(item.id, item.concluido)}
                className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  item.concluido
                    ? "bg-success border-success text-white"
                    : "border-border-custom hover:border-primary-400"
                }`}
              >
                {item.concluido && <Check size={12} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold text-sm ${item.concluido ? "line-through text-text-disabled" : ""}`}
                  >
                    {item.titulo}
                  </span>
                  {isAtrasado(item) && (
                    <AlertTriangle className="text-error" size={13} />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  <CalendarClock size={12} className="text-text-disabled" />
                  <span
                    className={`${isAtrasado(item) ? "text-error font-medium" : "text-text-secondary"}`}
                  >
                    {fmtDate(item.data)}
                    {item.hora ? ` às ${item.hora.slice(0, 5)}` : ""}
                  </span>
                  <span
                    className={`${PRIORIDADE_COLORS[item.prioridade]} font-medium capitalize`}
                  >
                    {item.prioridade}
                  </span>
                </div>
                {item.descricao && (
                  <p className="text-xs text-text-disabled mt-1 truncate">
                    {item.descricao}
                  </p>
                )}
              </div>

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
          ))}
        </div>
      )}

      {/* Modal Adicionar */}
      <Modal
        open={modal === "add"}
        onClose={() => setModal(null)}
        title="Novo Lembrete"
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              placeholder="Ex: Pagar conta de luz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                required
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hora</label>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prioridade</label>
            <select
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
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
