/**
 * Quais tarefas aparecem em cada aba, em que grupos e em que ordem. Funções puras (testáveis).
 *
 *   Hoje       = Atrasadas + Hoje
 *   Semana     = Atrasadas + Hoje + Esta semana
 *   Todas      = tudo que está aberto (inclui "Depois" e "Sem prazo")
 *   Concluídas = só as concluídas
 *
 * Subtarefas nunca aparecem soltas na lista: ficam dentro da tarefa-mãe (painel de detalhes).
 */
import type { GrupoDeTarefa } from "./datas";
import { nomeLongoDoDia, numeroDoDia } from "./resumos";
import type { Tarefa } from "./tipos";

export type Aba = "hoje" | "semana" | "todas" | "concluidas";

export const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "semana", rotulo: "Semana" },
  { id: "todas", rotulo: "Todas" },
  { id: "concluidas", rotulo: "Concluídas" },
];

const GRUPOS_DA_ABA: Record<Aba, GrupoDeTarefa[]> = {
  hoje: ["atrasada", "hoje"],
  semana: ["atrasada", "hoje", "semana"],
  todas: ["atrasada", "hoje", "semana", "depois", "sem_prazo"],
  concluidas: ["concluida"],
};

const TITULO_DO_GRUPO: Record<GrupoDeTarefa, string> = {
  atrasada: "Atrasadas",
  hoje: "Hoje",
  semana: "Esta semana",
  depois: "Depois",
  sem_prazo: "Sem prazo",
  concluida: "Concluídas",
};

export interface GrupoParaExibir {
  grupo: GrupoDeTarefa | "dia";
  titulo: string;
  tom: "neutro" | "perigo";
  tarefas: Tarefa[];
}

/** Menor primeiro; valores ausentes (null) vão para o fim. */
function compararNulosPorUltimo(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

/** Ordem dentro de um grupo aberto: prazo, hora, prioridade (alta primeiro), ordem manual, criação. */
export function ordemDeAberta(a: Tarefa, b: Tarefa): number {
  return (
    compararNulosPorUltimo(a.due_on, b.due_on) ||
    compararNulosPorUltimo(a.due_time, b.due_time) ||
    b.priority - a.priority ||
    a.sort_order - b.sort_order ||
    compararNulosPorUltimo(a.created_at, b.created_at)
  );
}

/** Concluídas: as mais recentes primeiro. */
export function ordemDeConcluida(a: Tarefa, b: Tarefa): number {
  return compararNulosPorUltimo(b.completed_at, a.completed_at);
}

export function agruparPorAba(tarefas: readonly Tarefa[], aba: Aba): GrupoParaExibir[] {
  const raizes = tarefas.filter((t) => t.parent_id === null);

  return GRUPOS_DA_ABA[aba].map((grupo) => ({
    grupo,
    titulo: TITULO_DO_GRUPO[grupo],
    tom: grupo === "atrasada" ? ("perigo" as const) : ("neutro" as const),
    tarefas: raizes
      .filter((t) => t.grupo === grupo)
      .sort(grupo === "concluida" ? ordemDeConcluida : ordemDeAberta),
  }));
}

/** Resumo do cabeçalho: "14 abertas · 2 atrasadas". Só conta tarefas-raiz. */
export function resumir(tarefas: readonly Tarefa[]): { abertas: number; atrasadas: number } {
  const raizes = tarefas.filter((t) => t.parent_id === null && t.status !== "done");
  return { abertas: raizes.length, atrasadas: raizes.filter((t) => t.grupo === "atrasada").length };
}

/** Subtarefas de cada tarefa-mãe, na ordem de criação. */
export function subtarefasPorMae(tarefas: readonly Tarefa[]): Map<string, Tarefa[]> {
  const mapa = new Map<string, Tarefa[]>();
  for (const t of tarefas) {
    if (t.parent_id === null) continue;
    const lista = mapa.get(t.parent_id) ?? [];
    lista.push(t);
    mapa.set(t.parent_id, lista);
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  }
  return mapa;
}

/**
 * Lista de UM dia (quando a pessoa toca num dia da faixa da semana): tudo que vence naquele dia,
 * abertas primeiro (na ordem de sempre) e concluídas no fim. Subtarefas não entram.
 */
export function agruparDoDia(tarefas: readonly Tarefa[], dia: string): GrupoParaExibir {
  const doDia = tarefas.filter((t) => t.parent_id === null && t.due_on === dia);
  const abertas = doDia.filter((t) => t.status !== "done").sort(ordemDeAberta);
  const feitas = doDia.filter((t) => t.status === "done").sort(ordemDeConcluida);
  const nome = nomeLongoDoDia(dia);
  return {
    grupo: "dia",
    titulo: `${nome.charAt(0).toUpperCase()}${nome.slice(1)}, ${numeroDoDia(dia)}`,
    tom: "neutro",
    tarefas: [...abertas, ...feitas],
  };
}
