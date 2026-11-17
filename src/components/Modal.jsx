import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  if (!open) return null;

  // Portal no body: garante que o modal fique acima de tudo (inclusive a
  // barra de abas inferior), independente de onde for renderizado.
  // h-dvh / max-h-[85dvh]: usam a área realmente visível no celular,
  // descontando a barra do navegador (vh inclui a área escondida atrás dela).
  return createPortal(
    <div className="fixed inset-x-0 top-0 h-dvh z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Painel */}
      <div className="relative w-full max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl border border-border-custom shadow-xl max-h-[85dvh] flex flex-col animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-custom">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — padding extra embaixo para a área segura do iPhone */}
        <div className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
