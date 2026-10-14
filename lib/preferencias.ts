/**
 * Regras das preferências de estudo e de movimento. Funções puras (sem React/Supabase).
 * Os limites ESPELHAM os CHECKs da tabela `profiles` (migration 0001): o banco é a palavra final,
 * mas validar aqui evita ida e volta e permite mostrar o erro ao lado do campo.
 */

export type ModoDeMovimento = "system" | "full" | "reduced";

export const MODOS_DE_MOVIMENTO: { id: ModoDeMovimento; nome: string; descricao: string }[] = [
  { id: "system", nome: "Automático", descricao: "Segue o ajuste do seu aparelho" },
  { id: "full", nome: "Completo", descricao: "Todas as animações" },
  { id: "reduced", nome: "Reduzido", descricao: "Sem animações" },
];

export function ehModoDeMovimento(valor: unknown): valor is ModoDeMovimento {
  return valor === "system" || valor === "full" || valor === "reduced";
}

export interface PreferenciasDeEstudo {
  daily_goal_min: number;
  streak_min_min: number;
  pomodoro_focus_min: number;
  pomodoro_break_min: number;
  pomodoro_long_break_min: number;
  pomodoro_cycle_length: number;
  new_cards_per_day: number;
}

export type CampoDeEstudo = keyof PreferenciasDeEstudo;

export const CAMPOS_DE_ESTUDO: {
  campo: CampoDeEstudo;
  rotulo: string;
  ajuda: string;
  unidade: string;
  min: number;
  max: number;
}[] = [
  {
    campo: "daily_goal_min",
    rotulo: "Meta diária",
    ajuda: "Quanto você quer estudar por dia",
    unidade: "min",
    min: 5,
    max: 1440,
  },
  {
    campo: "streak_min_min",
    rotulo: "Mínimo para a sequência",
    ajuda: "Minutos de foco para o dia contar na sequência",
    unidade: "min",
    min: 1,
    max: 1440,
  },
  {
    campo: "pomodoro_focus_min",
    rotulo: "Foco",
    ajuda: "Duração de cada bloco de foco",
    unidade: "min",
    min: 1,
    max: 180,
  },
  {
    campo: "pomodoro_break_min",
    rotulo: "Pausa curta",
    ajuda: "Descanso entre os focos",
    unidade: "min",
    min: 1,
    max: 60,
  },
  {
    campo: "pomodoro_long_break_min",
    rotulo: "Pausa longa",
    ajuda: "Descanso ao fechar um ciclo",
    unidade: "min",
    min: 1,
    max: 120,
  },
  {
    campo: "pomodoro_cycle_length",
    rotulo: "Focos por ciclo",
    ajuda: "Quantos focos até a pausa longa",
    unidade: "focos",
    min: 2,
    max: 10,
  },
  {
    campo: "new_cards_per_day",
    rotulo: "Flashcards novos",
    ajuda: "Comece com poucos: cada cartão novo volta nos dias seguintes",
    unidade: "/dia",
    min: 0,
    max: 100,
  },
];

/**
 * Lê o texto digitado e devolve o número ou uma mensagem de erro em português.
 * Aceita só inteiros (sem vírgula, sem "e", sem espaços no meio).
 */
export function validarCampoDeEstudo(
  campo: CampoDeEstudo,
  texto: string,
): { ok: true; valor: number } | { ok: false; erro: string } {
  const def = CAMPOS_DE_ESTUDO.find((c) => c.campo === campo);
  if (!def) return { ok: false, erro: "Campo desconhecido." };
  const limpo = texto.trim();
  if (!/^\d+$/.test(limpo)) return { ok: false, erro: "Digite um número inteiro." };
  const valor = Number(limpo);
  if (valor < def.min || valor > def.max) {
    return { ok: false, erro: `Use um valor entre ${def.min} e ${def.max}.` };
  }
  return { ok: true, valor };
}
