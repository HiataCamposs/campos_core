// Datas do app sempre no fuso de Brasília.
//
// Use FUNÇÕES (todaySP()) e não constantes de módulo: uma constante é
// calculada uma vez quando o app abre e fica velha se a aba ficar aberta
// de um dia para o outro (comum no celular).
//
// Nunca use toISOString() para obter "a data de hoje": ele converte para UTC,
// e depois das 21h em Brasília já é o dia seguinte.

export const TZ = "America/Sao_Paulo";

const pad = (n) => String(n).padStart(2, "0");

/** Hoje em Brasília, formato "YYYY-MM-DD". */
export const todaySP = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: TZ });

/** Soma n dias (arredondado) a uma data "YYYY-MM-DD", sem efeito de fuso. */
export const addDaysISO = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + Math.round(n) * 86400000);
  return dt.toISOString().slice(0, 10);
};

/** Data de n dias atrás em Brasília, formato "YYYY-MM-DD". */
export const daysAgoSP = (n) => addDaysISO(todaySP(), -n);

/** Data local de um objeto Date, formato "YYYY-MM-DD" (sem converter para UTC). */
export const localISO = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
