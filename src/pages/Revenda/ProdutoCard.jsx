import {
  Package,
  Trash2,
  Pencil,
} from "lucide-react";

// ── Produto Card ────────────

export default function ProdutoCard({ produto, onEdit, onDelete }) {
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
