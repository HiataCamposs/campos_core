// Helpers de acesso ao Supabase compartilhados entre as telas.

/**
 * Executa uma query/mutação e avisa o usuário se der erro.
 * Retorna { ok, data, error }. Sempre confira `ok` antes de fechar modais.
 */
export const dbOp = async (query, label = "Operação") => {
  const res = await query;
  if (res.error) {
    console.error(`[${label}]`, res.error);
    alert(`Erro ao ${label}: ${res.error.message}`);
    return { ok: false, error: res.error, data: res.data };
  }
  return { ok: true, data: res.data };
};

/**
 * Busca TODAS as linhas de uma consulta, em páginas.
 *
 * O Supabase devolve no máximo 1000 linhas por requisição. Sem paginação,
 * quando a tabela passa disso, as linhas excedentes somem sem aviso.
 *
 * `build` deve devolver uma query NOVA a cada chamada, com ordenação
 * determinística (inclua .order("id") como desempate), por exemplo:
 *   fetchAll(() => supabase.from("t").select("*").order("data").order("id"))
 *
 * Retorna { data, error } no mesmo formato de uma query normal.
 */
export const fetchAll = async (build, pageSize = 1000) => {
  let all = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) return { data: all, error };
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
  }
  return { data: all, error: null };
};
