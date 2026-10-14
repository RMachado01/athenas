/**
 * Visões da tela de Tarefas e a preferência lembrada no perfil (profiles.appearance).
 * Funções puras: a leitura aceita qualquer lixo do JSON e sempre devolve um valor válido.
 */
import type { AgruparPor } from "./quadro";

export type Visao = "lista" | "quadro" | "calendario" | "mural";

export const VISOES: readonly { id: Visao; rotulo: string }[] = [
  { id: "lista", rotulo: "Lista" },
  { id: "quadro", rotulo: "Quadro" },
  { id: "calendario", rotulo: "Calendário" },
  { id: "mural", rotulo: "Mural" },
];

/** Visões que já existem na tela (as outras entram nos próximos PRs). */
export const VISOES_DISPONIVEIS: readonly Visao[] = ["lista", "quadro", "calendario"];

const CHAVE_VISAO = "visao_tarefas";
const CHAVE_AGRUPAR = "quadro_agrupar";

export function lerVisao(aparencia: Record<string, unknown>): Visao {
  const v = aparencia[CHAVE_VISAO];
  return VISOES.some((x) => x.id === v) ? (v as Visao) : "lista";
}

export function lerAgruparPor(aparencia: Record<string, unknown>): AgruparPor {
  const v = aparencia[CHAVE_AGRUPAR];
  return v === "trilha" || v === "prioridade" ? v : "status";
}

export const paraSalvarVisao = (v: Visao) => ({ [CHAVE_VISAO]: v });
export const paraSalvarAgruparPor = (v: AgruparPor) => ({ [CHAVE_AGRUPAR]: v });
