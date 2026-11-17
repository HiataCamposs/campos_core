import { useState } from "react";
import {
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { fmtMoney, fmtDate } from "../../lib/format";

// ── Movimentação Card ──────────────────────────────────

export default function MovCard({
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

  // Summaries (pre-calculated via DB trigger, fallback to itens if needed)
  const totalQty =
    mov.total_qty != null
      ? Number(mov.total_qty)
      : itens.reduce((s, i) => s + (i.quantidade || 0), 0);
  const totalCompra =
    mov.total_compra != null
      ? Number(mov.total_compra)
      : itens.reduce(
          (s, i) => s + (i.quantidade || 0) * (i.valor_compra_unitario || 0),
          0,
        );
  const totalVenda =
    (mov.total_venda != null
      ? Number(mov.total_venda)
      : itens.reduce(
          (s, i) => s + (i.quantidade || 0) * (i.valor_venda_unitario || 0),
          0,
        )) + Number(mov.frete || 0);
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
