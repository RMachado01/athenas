/**
 * Regras do Mural das Tarefas (post-its que a pessoa posiciona livremente). Funções puras.
 *
 * Só tarefas ABERTAS e RAÍZES aparecem. Com posição salva (task_positions) ficam no mural; sem
 * posição, esperam na bandeja "Chegando" até a pessoa colocá-las. Ao concluir, o post-it some do
 * mural, mas a posição fica guardada: reabrindo a tarefa, ela volta ao mesmo lugar.
 */
import { encaixar, GRADE } from "@/features/boards/geometria";
import { ordemDeAberta } from "./agrupar";
import type { Tarefa } from "./tipos";

export const LARGURA_DO_POSTIT = 208;
export const ALTURA_DO_POSTIT = 96;

export interface Ponto {
  x: number;
  y: number;
}

export interface PostitNoMural {
  tarefa: Tarefa;
  x: number;
  y: number;
}

export function separarTarefas(
  tarefas: readonly Tarefa[],
  posicoes: ReadonlyMap<string, Ponto>,
): { noMural: PostitNoMural[]; chegando: Tarefa[] } {
  const abertas = tarefas.filter((t) => t.parent_id === null && t.status !== "done");
  const noMural: PostitNoMural[] = [];
  const chegando: Tarefa[] = [];
  for (const tarefa of abertas) {
    const p = posicoes.get(tarefa.id);
    if (p) noMural.push({ tarefa, x: p.x, y: p.y });
    else chegando.push(tarefa);
  }
  return { noMural, chegando: chegando.sort(ordemDeAberta) };
}

/**
 * Onde nasce um post-it novo: centralizado em `centro` (coordenadas do mural), encaixado na grade
 * de 16 px. Se já houver um post-it quase no mesmo canto, desce em diagonal (+32, +32) até achar
 * espaço, para eles nunca ficarem empilhados e escondidos um sob o outro.
 */
export function posicaoLivre(
  centro: Ponto,
  existentes: readonly (Ponto & { w?: number; h?: number })[],
): Ponto {
  let x = encaixar(centro.x - LARGURA_DO_POSTIT / 2);
  let y = encaixar(centro.y - ALTURA_DO_POSTIT / 2);
  for (let i = 0; i < 100; i += 1) {
    const ocupado = existentes.some((e) => Math.abs(e.x - x) < 24 && Math.abs(e.y - y) < 24);
    if (!ocupado) break;
    x += 2 * GRADE;
    y += 2 * GRADE;
  }
  return { x, y };
}
