import { diaIso, somarDias } from "@/lib/datas";
import { semanaDe } from "@/features/tasks/resumos";

/** Uma linha da view v_focus_days: minutos de foco num dia local. */
export interface DiaDeFoco {
  dia: string;
  minutos: number;
  sessoes: number;
}

export function minutosPorDia(dias: readonly DiaDeFoco[]): Map<string, number> {
  return new Map(dias.map((d) => [d.dia, d.minutos]));
}

/** Minutos estudados em `dia` (0 se não houve nada). */
export function minutosDoDia(dias: readonly DiaDeFoco[], dia: string): number {
  return dias.find((d) => d.dia === dia)?.minutos ?? 0;
}

/** Nível de 0 a 4 para colorir o mapa de calor, relativo à meta diária da pessoa. */
export function nivelDeCalor(minutos: number, metaMin: number): 0 | 1 | 2 | 3 | 4 {
  if (minutos <= 0) return 0;
  const razao = minutos / Math.max(1, metaMin);
  if (razao < 0.25) return 1;
  if (razao < 0.5) return 2;
  if (razao < 1) return 3;
  return 4;
}

export interface CelulaDeCalor {
  dia: string;
  minutos: number;
  nivel: 0 | 1 | 2 | 3 | 4;
  /** Dias que ainda não chegaram não são pintados. */
  futuro: boolean;
}

/**
 * Grade do mapa de calor: `semanas` colunas (a última é a semana de hoje), cada uma com 7 dias
 * de segunda a domingo. Como no app de referência, lê-se coluna por coluna, da esquerda para a direita.
 */
export function gradeDeCalor(
  dias: readonly DiaDeFoco[],
  hoje: string,
  metaMin: number,
  semanas = 13,
): CelulaDeCalor[][] {
  const mapa = minutosPorDia(dias);
  const segundaAtual = somarDias(hoje, 1 - diaIso(hoje));
  return Array.from({ length: semanas }, (_, s) => {
    const segunda = somarDias(segundaAtual, -7 * (semanas - 1 - s));
    return Array.from({ length: 7 }, (_, i) => {
      const dia = somarDias(segunda, i);
      const minutos = mapa.get(dia) ?? 0;
      return { dia, minutos, nivel: nivelDeCalor(minutos, metaMin), futuro: dia > hoje };
    });
  });
}

export interface BarraDaSemana {
  dia: string;
  minutos: number;
  hoje: boolean;
  futuro: boolean;
}

/** Os 7 dias da semana de `hoje` com os minutos de cada um (alimenta o gráfico de barras). */
export function barrasDaSemana(dias: readonly DiaDeFoco[], hoje: string): BarraDaSemana[] {
  const mapa = minutosPorDia(dias);
  return semanaDe(hoje).map((dia) => ({
    dia,
    minutos: mapa.get(dia) ?? 0,
    hoje: dia === hoje,
    futuro: dia > hoje,
  }));
}

/** Total de minutos da semana de `hoje`. */
export function totalDaSemana(dias: readonly DiaDeFoco[], hoje: string): number {
  return barrasDaSemana(dias, hoje).reduce((soma, b) => soma + b.minutos, 0);
}

/** "2h30", "45 min", "0 min". */
export function formatarMinutos(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${h}h` : `${h}h${String(resto).padStart(2, "0")}`;
}
