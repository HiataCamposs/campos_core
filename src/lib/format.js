// Formatação padrão do app (pt-BR). Use estas funções em vez de recriar
// formatadores em cada tela.

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 → "R$ 1.234,50". Vazio/nulo → "—". */
export const fmtMoney = (v) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : `R$ ${moneyFmt.format(Number(v))}`;

/**
 * "2026-11-16" (ou "2026-11-16T10:00:00+00:00") → "16/11/2026". Vazio → "—".
 * Lê a parte da data direto do texto, sem passar por Date, para não sofrer
 * deslocamento de fuso.
 */
export const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, dd] = String(d).slice(0, 10).split("-");
  return dd && m && y ? `${dd}/${m}/${y}` : "—";
};
