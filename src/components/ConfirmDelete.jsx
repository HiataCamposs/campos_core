import { useState } from "react";
import { Trash2 } from "lucide-react";

export default function ConfirmDelete({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Excluir",
}) {
  // Trava os botões enquanto a exclusão roda (evita clique duplo)
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-red-50 flex items-center justify-center">
          <Trash2 className="text-error" size={18} />
        </div>
        <p className="text-sm text-text-primary">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 text-sm rounded-lg border border-border-custom hover:bg-surface-alt transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="px-4 py-2 text-sm rounded-lg bg-error text-white hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {busy ? "Excluindo..." : confirmLabel}
        </button>
      </div>
    </div>
  );
}
