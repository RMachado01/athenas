/**
 * Regras das Metas (funções puras). Os limites espelham os CHECKs da tabela `goals`.
 *
 * Para a pessoa, meta de foco é em HORAS ("5 h por semana"); no banco guardamos MINUTOS
 * (a mesma unidade das sessões de foco). A conversão acontece só aqui.
 */
import { formatarMinutos } from "@/features/focus/resumos";

export type TipoDeMeta = "minutos" | "tarefas";
export type PeriodoDeMeta = "semana" | "mes";

export interface Meta {
  id: string;
  titulo: string;
  tipo: TipoDeMeta;
  periodo: PeriodoDeMeta;
  /** Em minutos (tipo "minutos") ou em tarefas. */
  alvo: number;
  trilhaId: string | null;
  atual: number;
  percentual: number;
}

export const TIPOS_DE_META: { id: TipoDeMeta; rotulo: string }[] = [
  { id: "minutos", rotulo: "Horas de foco" },
  { id: "tarefas", rotulo: "Tarefas" },
];

export const PERIODOS_DE_META: { id: PeriodoDeMeta; rotulo: string }[] = [
  { id: "semana", rotulo: "Por semana" },
  { id: "mes", rotulo: "Por mês" },
];

export interface RascunhoDeMeta {
  titulo: string;
  tipo: TipoDeMeta;
  periodo: PeriodoDeMeta;
  /** Texto digitado: horas ("5", "1,5") para foco; número inteiro para tarefas. */
  alvo: string;
  trilhaId: string | null;
}

export interface MetaValidada {
  titulo: string;
  tipo: TipoDeMeta;
  periodo: PeriodoDeMeta;
  alvo: number;
  trilhaId: string | null;
}

export type ErrosDaMeta = Partial<Record<"titulo" | "alvo", string>>;

/** Título padrão quando a pessoa não escreve um: "5 h de foco por semana". */
export function tituloSugerido(
  tipo: TipoDeMeta,
  periodo: PeriodoDeMeta,
  alvoTexto: string,
): string {
  const quando = periodo === "semana" ? "por semana" : "por mês";
  const n = alvoTexto.trim() || "?";
  return tipo === "minutos" ? `${n} h de foco ${quando}` : `${n} tarefas ${quando}`;
}

/** Valida o formulário e devolve a meta pronta para gravar (alvo já em minutos/tarefas). */
export function validarMeta(
  r: RascunhoDeMeta,
): { ok: true; meta: MetaValidada } | { ok: false; erros: ErrosDaMeta } {
  const erros: ErrosDaMeta = {};
  const texto = r.alvo.trim().replace(",", ".");
  let alvo = 0;

  if (r.tipo === "minutos") {
    if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
      erros.alvo = "Digite as horas, por exemplo 5 ou 1,5.";
    } else {
      alvo = Math.round(Number(texto) * 60);
      if (alvo < 15) erros.alvo = "A meta precisa ter pelo menos 15 minutos (0,25 h).";
      else if (alvo > 100_000) erros.alvo = "Meta grande demais.";
    }
  } else if (!/^\d+$/.test(texto)) {
    erros.alvo = "Digite um número inteiro de tarefas.";
  } else {
    alvo = Number(texto);
    if (alvo < 1) erros.alvo = "A meta precisa de pelo menos 1 tarefa.";
    else if (alvo > 10_000) erros.alvo = "Meta grande demais.";
  }

  const titulo = (r.titulo.trim() || tituloSugerido(r.tipo, r.periodo, r.alvo)).slice(0, 80);
  if (titulo.length === 0) erros.titulo = "Dê um nome para a meta.";

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return {
    ok: true,
    meta: { titulo, tipo: r.tipo, periodo: r.periodo, alvo, trilhaId: r.trilhaId },
  };
}

/** "2h30 de 5h", "3 de 10 tarefas". */
export function descreverProgresso(meta: Pick<Meta, "tipo" | "atual" | "alvo">): string {
  if (meta.tipo === "minutos")
    return `${formatarMinutos(meta.atual)} de ${formatarMinutos(meta.alvo)}`;
  return `${meta.atual} de ${meta.alvo} ${meta.alvo === 1 ? "tarefa" : "tarefas"}`;
}

/** "nesta semana" / "neste mês". */
export function descreverPeriodo(periodo: PeriodoDeMeta): string {
  return periodo === "semana" ? "nesta semana" : "neste mês";
}

/** Ordem de exibição: as mais perto de bater primeiro, as já batidas por último. */
export function ordenarMetas(metas: readonly Meta[]): Meta[] {
  return [...metas].sort((a, b) => {
    const aFeita = a.percentual >= 100;
    const bFeita = b.percentual >= 100;
    if (aFeita !== bFeita) return aFeita ? 1 : -1;
    return b.percentual - a.percentual;
  });
}
