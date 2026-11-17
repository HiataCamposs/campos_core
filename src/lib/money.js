// Cálculos de dinheiro. Compara em centavos para evitar erro de float
// (em JS, 0.7 + 0.1 = 0.7999999999999999, que é menor que 0.8).

export const toCents = (v) => Math.round(Number(v || 0) * 100);

/** Quanto falta pagar (nunca negativo), em reais. */
export const calcRestante = (total, pago) =>
  Math.max(0, toCents(total) - toCents(pago)) / 100;

/**
 * Status de pagamento de uma saída.
 * Espelha fn_calc_status_pagamento (migration 045), que é a fonte da verdade.
 */
export const calcStatusPagamento = (total, pago) => {
  const p = toCents(pago);
  if (p <= 0) return "pendente";
  return p >= toCents(total) ? "pago" : "parcial";
};
