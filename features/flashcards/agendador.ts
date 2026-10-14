import { fsrs, generatorParameters, type Card, type Grade } from "ts-fsrs";

/**
 * Ponte entre o Athenas e a biblioteca ts-fsrs (algoritmo FSRS, o mesmo do Anki atual).
 * Só este arquivo conhece a biblioteca: trocar de versão ou de parâmetros mexe só aqui.
 *
 * O banco guarda o estado em colunas com os mesmos nomes da biblioteca, mas com datas em
 * texto ISO (é o que chega pela API). Aqui convertemos nos dois sentidos.
 */

/** 1 Errei · 2 Difícil · 3 Bom · 4 Fácil (mesma numeração do FSRS). */
export type Avaliacao = 1 | 2 | 3 | 4;

export const AVALIACOES = [
  { valor: 1, rotulo: "Errei", tom: "danger" },
  { valor: 2, rotulo: "Difícil", tom: "warning" },
  { valor: 3, rotulo: "Bom", tom: "accent" },
  { valor: 4, rotulo: "Fácil", tom: "success" },
] as const satisfies readonly { valor: Avaliacao; rotulo: string; tom: string }[];

export interface EstadoDoCartao {
  state: 0 | 1 | 2 | 3;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: string | null;
}

// Retenção desejada de 90% (recomendação do manual do Anki); intervalo máximo de 100 anos;
// "fuzz" espalha um pouco as datas para os cartões não vencerem todos no mesmo dia.
const agendador = fsrs(
  generatorParameters({ request_retention: 0.9, maximum_interval: 36500, enable_fuzz: true }),
);

function paraCard(e: EstadoDoCartao): Card {
  return {
    due: new Date(e.due),
    stability: e.stability,
    difficulty: e.difficulty,
    elapsed_days: e.elapsed_days,
    scheduled_days: e.scheduled_days,
    learning_steps: e.learning_steps,
    reps: e.reps,
    lapses: e.lapses,
    state: e.state,
    last_review: e.last_review ? new Date(e.last_review) : undefined,
  };
}

function deCard(c: Card): EstadoDoCartao {
  return {
    state: c.state as EstadoDoCartao["state"],
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    last_review: c.last_review ? c.last_review.toISOString() : null,
  };
}

/** Estado de um cartão que nunca foi revisado (vence agora). */
export function estadoNovo(agora: Date): EstadoDoCartao {
  return {
    state: 0,
    due: agora.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
  };
}

/** O que cada botão faria agora (para mostrar "10 min · 1 d · 4 d" nos botões). */
export function previa(
  estado: EstadoDoCartao,
  agora: Date,
): Record<Avaliacao, { estado: EstadoDoCartao; intervalo: string }> {
  const resultado = {} as Record<Avaliacao, { estado: EstadoDoCartao; intervalo: string }>;
  for (const { valor } of AVALIACOES) {
    const { card } = agendador.next(paraCard(estado), agora, valor as Grade);
    resultado[valor] = { estado: deCard(card), intervalo: rotuloDoIntervalo(agora, card.due) };
  }
  return resultado;
}

/** Novo estado depois da resposta. */
export function responder(
  estado: EstadoDoCartao,
  avaliacao: Avaliacao,
  agora: Date,
): EstadoDoCartao {
  return deCard(agendador.next(paraCard(estado), agora, avaliacao as Grade).card);
}

const UMA_CASA = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** "<1 min", "10 min", "3 h", "4 d", "1,5 m", "1,1 a". */
export function rotuloDoIntervalo(de: Date, ate: Date): string {
  const minutos = (ate.getTime() - de.getTime()) / 60_000;
  if (minutos < 1) return "<1 min";
  if (minutos < 60) return `${Math.round(minutos)} min`;
  const horas = minutos / 60;
  if (horas < 24) return `${Math.round(horas)} h`;
  const dias = horas / 24;
  if (dias < 30) return `${Math.round(dias)} d`;
  if (dias < 365) return `${UMA_CASA.format(dias / 30)} m`;
  return `${UMA_CASA.format(dias / 365)} a`;
}
