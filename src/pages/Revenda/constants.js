// Constantes e helpers da tela Movimentações
import {
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
} from "lucide-react";

export const cleanPhone = (val) => val.replace(/^\+55\s?/, "").replace(/[\s-]/g, "");


export const TABS = [
  { key: "entradas", label: "Entradas", icon: ArrowDownCircle },
  { key: "saidas", label: "Saídas", icon: ArrowUpCircle },
  { key: "gerencial", label: "Gerencial", icon: BarChart3 },
  { key: "cadastro", label: "Cadastro", icon: Package },
];

export const DIAS_SEMANA = [
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];
