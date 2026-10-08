/**
 * Cronômetro Pomodoro como FUNÇÕES PURAS (sem React, sem relógio escondido): o "agora" entra
 * sempre como argumento. Assim dá para testar tudo e o estado sobrevive a recarregar a página
 * (guardamos instantes, não "segundos que faltam": se o aparelho dormir, a conta continua certa).
 */

export type Fase = "foco" | "pausa" | "pausa-longa";

/** Configuração vinda do perfil (padrões do Pomodoro clássico). */
export interface ConfigPomodoro {
  focoMin: number;
  pausaMin: number;
  pausaLongaMin: number;
  /** A cada quantos focos vem a pausa longa. */
  cicloDe: number;
}

export const CONFIG_PADRAO: ConfigPomodoro = {
  focoMin: 25,
  pausaMin: 5,
  pausaLongaMin: 15,
  cicloDe: 4,
};

export interface EstadoDoTimer {
  fase: Fase;
  /** Quantos focos já foram concluídos neste ciclo (0 a cicloDe - 1). */
  ciclo: number;
  duracaoMs: number;
  /** Tarefa em que a pessoa está trabalhando (só faz sentido na fase "foco"). */
  taskId: string | null;
  /** Instante (ms) em que rodou pela última vez; null = pausado. */
  retomadoEm: number | null;
  /** Tempo já acumulado antes da última retomada. */
  acumuladoMs: number;
}

const MIN = 60_000;

export function duracaoDaFase(fase: Fase, cfg: ConfigPomodoro): number {
  if (fase === "foco") return cfg.focoMin * MIN;
  return (fase === "pausa" ? cfg.pausaMin : cfg.pausaLongaMin) * MIN;
}

/** Começa uma fase já rodando. */
export function iniciar(
  fase: Fase,
  cfg: ConfigPomodoro,
  agora: number,
  opcoes: { ciclo?: number; taskId?: string | null } = {},
): EstadoDoTimer {
  return {
    fase,
    ciclo: opcoes.ciclo ?? 0,
    duracaoMs: duracaoDaFase(fase, cfg),
    taskId: fase === "foco" ? (opcoes.taskId ?? null) : null,
    retomadoEm: agora,
    acumuladoMs: 0,
  };
}

/** Tempo já decorrido (nunca passa da duração: o excedente não conta como estudo). */
export function decorrido(e: EstadoDoTimer, agora: number): number {
  const rodando = e.retomadoEm === null ? 0 : Math.max(0, agora - e.retomadoEm);
  return Math.min(e.duracaoMs, e.acumuladoMs + rodando);
}

export function restante(e: EstadoDoTimer, agora: number): number {
  return e.duracaoMs - decorrido(e, agora);
}

export function terminou(e: EstadoDoTimer, agora: number): boolean {
  return restante(e, agora) <= 0;
}

export function pausar(e: EstadoDoTimer, agora: number): EstadoDoTimer {
  if (e.retomadoEm === null) return e;
  return { ...e, acumuladoMs: decorrido(e, agora), retomadoEm: null };
}

export function retomar(e: EstadoDoTimer, agora: number): EstadoDoTimer {
  if (e.retomadoEm !== null) return e;
  return { ...e, retomadoEm: agora };
}

/** Próxima fase depois de concluir a atual: foco → pausa (ou pausa longa ao fechar o ciclo) → foco. */
export function proximaFase(e: EstadoDoTimer, cfg: ConfigPomodoro): { fase: Fase; ciclo: number } {
  if (e.fase !== "foco") {
    // Depois da pausa longa o ciclo recomeça; depois da curta continua contando.
    return { fase: "foco", ciclo: e.fase === "pausa-longa" ? 0 : e.ciclo };
  }
  const feitos = e.ciclo + 1;
  return feitos >= cfg.cicloDe
    ? { fase: "pausa-longa", ciclo: feitos }
    : { fase: "pausa", ciclo: feitos };
}

/**
 * Intervalo a gravar no banco ao encerrar uma fase de foco: termina agora e começou
 * `decorrido` antes. (Pausas no meio não entram: o banco só "enxerga" o tempo realmente focado.)
 */
export function intervaloParaGravar(
  e: EstadoDoTimer,
  agora: number,
): { inicio: Date; fim: Date; minutosPlanejados: number } {
  const feito = decorrido(e, agora);
  return {
    inicio: new Date(agora - feito),
    fim: new Date(agora),
    minutosPlanejados: Math.round(e.duracaoMs / MIN),
  };
}

/** Só vale gravar se passou de 1 minuto (o banco ignora menos que isso mesmo). */
export function valeGravar(e: EstadoDoTimer, agora: number): boolean {
  return e.fase === "foco" && decorrido(e, agora) >= MIN;
}

/** "24:59" a partir de milissegundos (arredonda para cima: 0:00 só quando acabou). */
export function formatarRelogio(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Valida o que veio do localStorage (nunca confie em dado de fora). */
export function lerEstado(bruto: unknown): EstadoDoTimer | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const o = bruto as Record<string, unknown>;
  const fases: Fase[] = ["foco", "pausa", "pausa-longa"];
  if (!fases.includes(o.fase as Fase)) return null;
  if (typeof o.ciclo !== "number" || !Number.isInteger(o.ciclo) || o.ciclo < 0) return null;
  if (typeof o.duracaoMs !== "number" || !(o.duracaoMs > 0) || o.duracaoMs > 4 * 3_600_000) {
    return null;
  }
  if (typeof o.acumuladoMs !== "number" || o.acumuladoMs < 0) return null;
  if (o.retomadoEm !== null && typeof o.retomadoEm !== "number") return null;
  if (o.taskId !== null && typeof o.taskId !== "string") return null;
  return {
    fase: o.fase as Fase,
    ciclo: o.ciclo,
    duracaoMs: o.duracaoMs,
    taskId: o.taskId as string | null,
    retomadoEm: o.retomadoEm as number | null,
    acumuladoMs: o.acumuladoMs,
  };
}
