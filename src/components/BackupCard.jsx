import { useEffect, useState } from "react";
import {
  DatabaseBackup,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { TZ } from "../lib/date";

// O backup roda todo domingo às 03:00 (Brasília). Passados mais de 8 dias
// desde o último sucesso, algo deu errado (ex.: workflow desativado).
const DIAS_ATRASO = 8;

const fmtQuando = (iso) => {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR", { timeZone: TZ });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${data} às ${hora}`;
};

const fmtTamanho = (bytes) => {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
};

const diasDesde = (iso) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

/** Próximo domingo às 03:00 de Brasília (06:00 UTC). */
const proximoBackup = () => {
  const agora = new Date();
  const alvo = new Date(agora);
  alvo.setUTCHours(6, 0, 0, 0);
  const faltam = (7 - alvo.getUTCDay()) % 7;
  alvo.setUTCDate(alvo.getUTCDate() + faltam);
  if (alvo <= agora) alvo.setUTCDate(alvo.getUTCDate() + 7);
  return alvo.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
};

export default function BackupCard() {
  const [historico, setHistorico] = useState(null); // null = carregando
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ignore = false;
    supabase
      .from("backup_historico")
      .select("id, executado_em, status, tamanho_bytes, run_url, mensagem")
      .order("executado_em", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (ignore) return;
        if (error) setErro(error.message);
        else setHistorico(data || []);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (erro) {
    return (
      <div className="bg-surface rounded-2xl border border-border-custom p-5 text-sm">
        <h2 className="font-semibold text-text-primary flex items-center gap-2 mb-1">
          <DatabaseBackup size={16} /> Backup
        </h2>
        <p className="text-text-secondary">
          Não foi possível ler o histórico de backups. A migration 048 já foi
          rodada no Supabase?
        </p>
      </div>
    );
  }
  if (historico === null) return null;

  const ultimo = historico[0];
  const ultimoSucesso = historico.find((b) => b.status === "sucesso");
  const atrasado =
    !ultimoSucesso || diasDesde(ultimoSucesso.executado_em) > DIAS_ATRASO;

  // Resumo no topo: falha > atraso > ok
  let resumo;
  if (!ultimo) {
    resumo = {
      cor: "text-text-secondary",
      bg: "bg-surface-alt",
      Icon: AlertTriangle,
      texto: "Nenhum backup registrado ainda",
    };
  } else if (ultimo.status === "falha") {
    resumo = {
      cor: "text-error",
      bg: "bg-red-50",
      Icon: XCircle,
      texto: `Último backup FALHOU (${fmtQuando(ultimo.executado_em)})`,
    };
  } else if (atrasado) {
    resumo = {
      cor: "text-warning",
      bg: "bg-warning/10",
      Icon: AlertTriangle,
      texto: `Backup atrasado: último há ${diasDesde(ultimoSucesso.executado_em)} dias`,
    };
  } else {
    resumo = {
      cor: "text-success",
      bg: "bg-success/10",
      Icon: CheckCircle2,
      texto: `Último backup: ${fmtQuando(ultimo.executado_em)}`,
    };
  }

  return (
    <div className="bg-surface rounded-2xl border border-border-custom p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <DatabaseBackup size={16} /> Backup
        </h2>
        <span className="text-xs text-text-disabled">
          Próximo: {proximoBackup()} · 03:00
        </span>
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${resumo.bg} ${resumo.cor}`}
      >
        <resumo.Icon size={16} className="shrink-0" />
        <span>{resumo.texto}</span>
      </div>

      {historico.length > 0 && (
        <div className="mt-3 space-y-1">
          {historico.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-2 text-xs py-1 text-text-secondary"
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${b.status === "sucesso" ? "bg-success" : "bg-error"}`}
              />
              <span className="text-text-primary">
                {fmtQuando(b.executado_em)}
              </span>
              <span className="flex-1 truncate">
                {b.status === "sucesso"
                  ? fmtTamanho(b.tamanho_bytes)
                  : b.mensagem || "Falhou"}
              </span>
              {b.run_url && (
                <a
                  href={b.run_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary-500 hover:underline shrink-0 p-1 -m-1"
                >
                  {b.status === "sucesso" ? "Baixar" : "Ver log"}
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
