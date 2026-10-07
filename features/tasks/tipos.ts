import type { Database } from "@/lib/database.types";
import type { GrupoDeTarefa } from "./datas";

type LinhaDaView = Database["public"]["Views"]["v_tasks"]["Row"];

export type StatusDeTarefa = "todo" | "doing" | "done";
export type Prioridade = 1 | 2 | 3;

/** Tarefa como a tela usa: campos obrigatórios de verdade (a view os declara como "pode ser nulo"). */
export interface Tarefa {
  id: string;
  user_id: string;
  track_id: string | null;
  parent_id: string | null;
  title: string;
  notes: string;
  priority: Prioridade;
  status: StatusDeTarefa;
  due_on: string | null;
  due_time: string | null;
  estimate_min: number | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  grupo: GrupoDeTarefa;
}

const GRUPOS: readonly GrupoDeTarefa[] = [
  "atrasada",
  "hoje",
  "semana",
  "depois",
  "sem_prazo",
  "concluida",
];

/** Converte a linha da view v_tasks em Tarefa. Linha malformada é um bug (lança erro). */
export function paraTarefa(linha: LinhaDaView): Tarefa {
  if (!linha.id || !linha.user_id || linha.title === null || !linha.created_at) {
    throw new Error("Linha de v_tasks incompleta");
  }
  const grupo = GRUPOS.find((g) => g === linha.bucket) ?? "sem_prazo";
  const prioridade = linha.priority === 1 || linha.priority === 3 ? linha.priority : 2;
  const status: StatusDeTarefa =
    linha.status === "doing" || linha.status === "done" ? linha.status : "todo";

  return {
    id: linha.id,
    user_id: linha.user_id,
    track_id: linha.track_id,
    parent_id: linha.parent_id,
    title: linha.title,
    notes: linha.notes ?? "",
    priority: prioridade,
    status,
    due_on: linha.due_on,
    due_time: linha.due_time,
    estimate_min: linha.estimate_min,
    completed_at: linha.completed_at,
    sort_order: linha.sort_order ?? 0,
    created_at: linha.created_at,
    updated_at: linha.updated_at ?? linha.created_at,
    grupo,
  };
}
