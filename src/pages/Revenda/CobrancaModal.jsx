import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../../components/Modal";
import { Copy, MessageCircle, Check } from "lucide-react";
import { fmtMoney, fmtDate } from "../../lib/format";

const brl = (v) => fmtMoney(v || 0);

const agoraBR = () => {
  const d = new Date();
  const tz = { timeZone: "America/Sao_Paulo" };
  const data = d.toLocaleDateString("pt-BR", tz);
  const hora = d.toLocaleTimeString("pt-BR", {
    ...tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} às ${hora}`;
};

export default function CobrancaModal({ open, onClose, pdvs }) {
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [pdvId, setPdvId] = useState("");
  const [selecionados, setSelecionados] = useState({});
  const [detalharItens, setDetalharItens] = useState(true);
  const [telefone, setTelefone] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Carrega todos os pedidos não pagos ao abrir
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data: saidas, error } = await supabase
        .from("revenda_mov_saidas")
        .select("id, data, pdv_id, status_pagamento, frete, total_venda")
        .is("deleted_at", null)
        .eq("is_perda", false)
        .neq("status_pagamento", "pago")
        .order("data", { ascending: true });
      if (error) {
        alert(`Erro ao carregar pedidos: ${error.message}`);
        if (!ignore) setLoading(false);
        return;
      }
      const ids = (saidas || []).map((s) => s.id);
      const [resItens, resTransacoes, resProdutos] =
        ids.length
          ? await Promise.all([
              supabase
                .from("revenda_mov_saidas_itens")
                .select("mov_id, produto_id, quantidade, valor_venda_unitario")
                .in("mov_id", ids),
              supabase
                .from("revenda_saida_transacoes")
                .select("mov_id, valor")
                .in("mov_id", ids),
              supabase.from("revenda_produtos").select("id, nome"),
            ])
          : [{ data: [] }, { data: [] }, { data: [] }];
      if (ignore) return;
      // Sem as transações, todo pedido pareceria sem pagamento: aborta
      const falha = [resItens, resTransacoes, resProdutos].find((r) => r.error);
      if (falha) {
        alert(`Erro ao carregar pedidos: ${falha.error.message}`);
        setPedidos([]);
        setLoading(false);
        return;
      }
      const itens = resItens.data;
      const transacoes = resTransacoes.data;
      const produtos = resProdutos.data;

      const nomeProduto = Object.fromEntries(
        (produtos || []).map((p) => [p.id, p.nome]),
      );
      const lista = (saidas || [])
        .map((s) => {
          const its = (itens || [])
            .filter((i) => i.mov_id === s.id)
            .map((i) => ({
              nome: nomeProduto[i.produto_id] || "Produto",
              quantidade: Number(i.quantidade || 0),
              valor: Number(i.valor_venda_unitario || 0),
            }));
          const pago = (transacoes || [])
            .filter((t) => t.mov_id === s.id)
            .reduce((acc, t) => acc + Number(t.valor || 0), 0);
          const total = Number(s.total_venda || 0) + Number(s.frete || 0);
          return {
            ...s,
            itens: its,
            total,
            pago,
            restante: Math.max(Math.round((total - pago) * 100), 0) / 100,
          };
        })
        .filter((p) => p.restante > 0);
      setPedidos(lista);
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [open]);

  // Reseta seleção ao fechar
  const fechar = () => {
    setPdvId("");
    setSelecionados({});
    setTelefone("");
    setCopiado(false);
    onClose();
  };

  // PDVs com pendência, com total em aberto
  const totaisPdv = {};
  pedidos.forEach((p) => {
    totaisPdv[p.pdv_id] = (totaisPdv[p.pdv_id] || 0) + p.restante;
  });
  const pdvsPendentes = pdvs
    .filter((p) => totaisPdv[p.id])
    .map((p) => ({ ...p, totalAberto: totaisPdv[p.id] }));

  const pdv = pdvs.find((p) => p.id === pdvId);
  const pedidosPdv = pedidos.filter((p) => p.pdv_id === pdvId);
  const pedidosSel = pedidosPdv.filter((p) => selecionados[p.id]);
  const totalSel = pedidosSel.reduce((acc, p) => acc + p.restante, 0);
  const contatosComFone = (pdv?.contatos || []).filter((c) =>
    c.telefone?.replace(/\D/g, ""),
  );

  const escolherPdv = (id) => {
    setPdvId(id);
    setSelecionados(
      Object.fromEntries(
        pedidos.filter((p) => p.pdv_id === id).map((p) => [p.id, true]),
      ),
    );
    const novoPdv = pdvs.find((p) => p.id === id);
    const primeiro = (novoPdv?.contatos || []).find((c) =>
      c.telefone?.replace(/\D/g, ""),
    );
    setTelefone(primeiro?.telefone || "");
    setCopiado(false);
  };

  const montarMensagem = () => {
    if (!pdv || pedidosSel.length === 0) return "";
    const SEP = "────────────────";
    const qtd = (n) => Number(n).toLocaleString("pt-BR");
    const n = pedidosSel.length;
    const linhas = ["Segue extrato de pedidos em aberto:", ""];

    if (detalharItens) {
      pedidosSel.forEach((p) => {
        linhas.push(SEP, `*Pedido de ${fmtDate(p.data)}*`);
        p.itens.forEach((i) => {
          linhas.push(`${qtd(i.quantidade)}x ${i.nome}: ${brl(i.quantidade * i.valor)}`);
        });
        if (Number(p.frete) > 0) linhas.push(`Frete: ${brl(p.frete)}`);
        if (p.pago > 0) {
          linhas.push(
            `Total do pedido: ${brl(p.total)}`,
            `Já pago: ${brl(p.pago)}`,
          );
        }
        linhas.push(`*Em aberto: ${brl(p.restante)}*`, "");
      });
    } else {
      linhas.push(SEP);
      pedidosSel.forEach((p) => {
        linhas.push(`${fmtDate(p.data)}: ${brl(p.restante)}`);
      });
      linhas.push("");
    }

    linhas.push(
      SEP,
      `*Total em aberto: ${brl(totalSel)}*`,
      `_Pedidos: ${n}_`,
      `_Emitido em: ${agoraBR()}_`,
    );
    return linhas.join("\n");
  };
  const mensagem = montarMensagem();

  const enviarWhatsApp = () => {
    const fone = telefone.replace(/\D/g, "");
    const url = fone
      ? `https://wa.me/55${fone}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  };

  const copiar = async () => {
    let ok = false;
    // API moderna: só existe em HTTPS ou localhost
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(mensagem);
        ok = true;
      } catch {
        ok = false;
      }
    }
    // Fallback para HTTP (ex.: acesso pelo IP da rede no celular)
    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = mensagem;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      ta.style.fontSize = "16px"; // evita zoom no iOS
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, mensagem.length);
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } else {
      alert("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  return (
    <Modal open={open} onClose={fechar}title="Cobrança de pendências">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-7 w-7 border-3 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : pdvsPendentes.length === 0 ? (
        <p className="text-sm text-text-secondary py-6 text-center">
          Nenhum pedido com pagamento pendente.
        </p>
      ) : (
        <div className="space-y-3 pb-2">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Estabelecimento
            </label>
            <select
              value={pdvId}
              onChange={(e) => escolherPdv(e.target.value)}
              className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
            >
              <option value="">Selecione um PDV…</option>
              {pdvsPendentes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {brl(p.totalAberto)}
                </option>
              ))}
            </select>
          </div>

          {pdv && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">
                    Pedidos em aberto ({pedidosSel.length}/{pedidosPdv.length})
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={detalharItens}
                      onChange={(e) => setDetalharItens(e.target.checked)}
                    />
                    Detalhar itens
                  </label>
                </div>
                {pedidosPdv.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!selecionados[p.id]}
                      onChange={(e) =>
                        setSelecionados((s) => ({
                          ...s,
                          [p.id]: e.target.checked,
                        }))
                      }
                    />
                    <span className="flex-1">{fmtDate(p.data)}</span>
                    {p.pago > 0 && (
                      <span className="text-xs text-text-disabled">
                        de {brl(p.total)}
                      </span>
                    )}
                    <span className="font-medium">{brl(p.restante)}</span>
                  </label>
                ))}
                <div className="flex justify-between text-sm font-semibold pt-1 px-1">
                  <span>Total selecionado</span>
                  <span>{brl(totalSel)}</span>
                </div>
              </div>

              {mensagem && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Prévia da mensagem
                    </label>
                    <pre className="whitespace-pre-wrap text-xs bg-surface-alt rounded-lg p-3 max-h-56 overflow-y-auto font-sans">
                      {mensagem}
                    </pre>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Enviar para
                    </label>
                    {contatosComFone.length > 0 ? (
                      <select
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="w-full rounded-lg border border-border-custom bg-bg px-3 py-2 text-sm"
                      >
                        {contatosComFone.map((c) => (
                          <option key={c._id} value={c.telefone}>
                            {c.nome || c.tipo || "Contato"} — {c.telefone}
                          </option>
                        ))}
                        <option value="">Escolher no WhatsApp</option>
                      </select>
                    ) : (
                      <p className="text-xs text-text-disabled">
                        PDV sem telefone cadastrado — você escolhe o contato no
                        WhatsApp.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={copiar}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-border-custom text-text-primary text-sm font-medium rounded-lg px-3 py-2 hover:bg-surface-alt transition-colors"
                    >
                      {copiado ? <Check size={16} /> : <Copy size={16} />}
                      {copiado ? "Copiado" : "Copiar"}
                    </button>
                    <button
                      onClick={enviarWhatsApp}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-success hover:bg-success/90 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
                    >
                      <MessageCircle size={16} /> WhatsApp
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
