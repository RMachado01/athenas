/**
 * Regras do Quadro (Kanban) das Tarefas. Funções puras, sem tela (testáveis).
 *
 * O Quadro agrupa as tarefas em colunas por STATUS, por TRILHA ou por PRIORIDADE. Arrastar um
 * cartão para outra coluna muda o campo que está agrupando (`camposAoMover`), e o "+ Nova" de
 * cada coluna já cria a tarefa naquele campo (`camposDeNovaTarefa`).
 */
import type { CorDoMural } from "@/features/boards/cores";
import { ordemDeAberta, ordemDeConcluida } from "./agrupar";
import type { CamposEditaveis, NovaTarefa } from "./mutations";
import type { Prioridade, StatusDeTarefa, Tarefa } from "./tipos";

export type AgruparPor = "status" | "trilha" | "prioridade";

export const OPCOES_DE_AGRUPAMENTO: readonly { valor: AgruparPor; rotulo: string }[] = [
  { valor: "status", rotulo: "Status" },
  { valor: "trilha", rotulo: "Trilha" },
  { valor: "prioridade", rotulo: "Prioridade" },
];

/** Id da coluna das tarefas sem trilha (não colide com nenhum uuid). */
export const SEM_TRILHA = "__sem_trilha__";

export interface ColunaDoQuadro {
  id: string;
  titulo: string;
  /** Cor do cabeçalho (a da trilha, ou uma fixa por status/prioridade). null = neutro. */
  cor: CorDoMural | null;
  tarefas: Tarefa[];
}

interface TrilhaDoQuadro {
  id: string;
  name: string;
  color: CorDoMural;
}

const STATUS: { id: StatusDeTarefa; titulo: string; cor: CorDoMural | null }[] = [
  { id: "todo", titulo: "A fazer", cor: "cinza" },
  { id: "doing", titulo: "Fazendo", cor: "azul" },
  { id: "done", titulo: "Feito", cor: "verde" },
];

const PRIORIDADES: { id: Prioridade; titulo: string; cor: CorDoMural }[] = [
  { id: 3, titulo: "Alta", cor: "laranja" },
  { id: 2, titulo: "Média", cor: "amarelo" },
  { id: 1, titulo: "Baixa", cor: "cinza" },
];

/** Monta as colunas. Subtarefas nunca viram cartão (ficam dentro da tarefa-mãe). */
export function montarColunas(
  tarefas: readonly Tarefa[],
  agruparPor: AgruparPor,
  trilhas: readonly TrilhaDoQuadro[],
): ColunaDoQuadro[] {
  const raizes = tarefas.filter((t) => t.parent_id === null);
  const abertas = raizes.filter((t) => t.status !== "done");

  if (agruparPor === "status") {
    return STATUS.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      cor: s.cor,
      tarefas: raizes
        .filter((t) => t.status === s.id)
        .sort(s.id === "done" ? ordemDeConcluida : ordemDeAberta),
    }));
  }

  if (agruparPor === "prioridade") {
    return PRIORIDADES.map((p) => ({
      id: String(p.id),
      titulo: p.titulo,
      cor: p.cor,
      tarefas: abertas.filter((t) => t.priority === p.id).sort(ordemDeAberta),
    }));
  }

  const conhecidas = new Set(trilhas.map((t) => t.id));
  return [
    ...trilhas.map((tr) => ({
      id: tr.id,
      titulo: tr.name,
      cor: tr.color as CorDoMural | null,
      tarefas: abertas.filter((t) => t.track_id === tr.id).sort(ordemDeAberta),
    })),
    {
      id: SEM_TRILHA,
      titulo: "Sem trilha",
      cor: null,
      // Trilha arquivada também cai aqui: a tarefa nunca "some" do Quadro.
      tarefas: abertas
        .filter((t) => t.track_id === null || !conhecidas.has(t.track_id))
        .sort(ordemDeAberta),
    },
  ];
}

/** O que muda na tarefa ao soltá-la numa coluna. */
export function camposAoMover(agruparPor: AgruparPor, colunaId: string): CamposEditaveis {
  if (agruparPor === "status") return { status: colunaId as StatusDeTarefa };
  if (agruparPor === "prioridade") return { priority: Number(colunaId) as Prioridade };
  return { track_id: colunaId === SEM_TRILHA ? null : colunaId };
}

/** O que a tarefa nova já leva ao ser criada dentro de uma coluna (null = coluna sem "+ Nova"). */
export function camposDeNovaTarefa(
  agruparPor: AgruparPor,
  colunaId: string,
): Partial<NovaTarefa> | null {
  if (agruparPor === "status") {
    if (colunaId === "done") return null; // criar já concluída não faz sentido
    return { status: colunaId as StatusDeTarefa };
  }
  if (agruparPor === "prioridade") return { priority: Number(colunaId) as Prioridade };
  return colunaId === SEM_TRILHA ? {} : { track_id: colunaId };
}
