/**
 * Números que alimentam o Início e a faixa da semana (anel de hoje, constância, pontos por dia).
 * Funções puras sobre a lista de tarefas: sem rede, sem relógio (o "hoje" e o fuso entram como
 * parâmetro), então são fáceis de testar e corretas no fuso da pessoa.
 *
 * Só contam tarefas-RAIZ: subtarefas são detalhe da tarefa-mãe e não inflam os números.
 */
import { diaIso, hojeNoFuso, somarDias } from "@/lib/datas";
import type { Tarefa } from "./tipos";

const raizes = (tarefas: readonly Tarefa[]) => tarefas.filter((t) => t.parent_id === null);

/** Os 7 dias (segunda a domingo) da semana que contém `hoje`, em "AAAA-MM-DD". */
export function semanaDe(hoje: string): string[] {
  const segunda = somarDias(hoje, 1 - diaIso(hoje));
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const DIA_LONGO = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });

function dataUtc(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d));
}

/** "seg", "ter"… (sem o ponto que o Intl coloca). */
export function nomeCurtoDoDia(iso: string): string {
  return DIA_CURTO.format(dataUtc(iso)).replace(".", "");
}

/** "segunda-feira", "sábado"… */
export function nomeLongoDoDia(iso: string): string {
  return DIA_LONGO.format(dataUtc(iso));
}

/** Dia do mês sem zero à esquerda: "2026-10-05" -> 5. */
export function numeroDoDia(iso: string): number {
  return Number(iso.slice(8, 10));
}

/** Quantas tarefas ABERTAS vencem em cada dia (a faixa da semana mostra até 3 pontinhos). */
export function pontosPorDia(
  tarefas: readonly Tarefa[],
  dias: readonly string[],
): Record<string, number> {
  const resultado: Record<string, number> = Object.fromEntries(dias.map((d) => [d, 0]));
  for (const t of raizes(tarefas)) {
    if (t.status === "done" || t.due_on === null) continue;
    if (t.due_on in resultado) resultado[t.due_on] = (resultado[t.due_on] ?? 0) + 1;
  }
  return resultado;
}

/** Quantas tarefas foram CONCLUÍDAS em cada dia (no fuso da pessoa). */
export function concluidasPorDia(tarefas: readonly Tarefa[], fuso: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const t of raizes(tarefas)) {
    if (t.status !== "done" || !t.completed_at) continue;
    const dia = hojeNoFuso(fuso, new Date(t.completed_at));
    mapa.set(dia, (mapa.get(dia) ?? 0) + 1);
  }
  return mapa;
}

export interface ResumoDeHoje {
  /** Pendentes de hoje (e atrasadas) + as concluídas hoje. */
  total: number;
  feitas: number;
  /** 0 a 100. Sem nada para fazer, 0. */
  percentual: number;
  pendentes: number;
}

/**
 * "Hoje": o que ainda falta (vence hoje ou está atrasado) mais o que já foi concluído hoje.
 * Assim o anel sobe a cada tarefa concluída em vez de sumir com ela.
 */
export function resumoDeHoje(tarefas: readonly Tarefa[], hoje: string, fuso: string): ResumoDeHoje {
  const pendentes = raizes(tarefas).filter(
    (t) => t.status !== "done" && (t.grupo === "hoje" || t.grupo === "atrasada"),
  ).length;
  const feitas = concluidasPorDia(tarefas, fuso).get(hoje) ?? 0;
  const total = pendentes + feitas;
  return {
    total,
    feitas,
    pendentes,
    percentual: total === 0 ? 0 : Math.round((100 * feitas) / total),
  };
}

export interface DiaDaConstancia {
  dia: string;
  rotulo: string;
  concluidas: number;
  hoje: boolean;
  futuro: boolean;
}

/** A semana inteira com quantas tarefas foram concluídas em cada dia (selos da "Constância"). */
export function constanciaDaSemana(
  tarefas: readonly Tarefa[],
  hoje: string,
  fuso: string,
): DiaDaConstancia[] {
  const feitas = concluidasPorDia(tarefas, fuso);
  return semanaDe(hoje).map((dia) => ({
    dia,
    rotulo: nomeCurtoDoDia(dia),
    concluidas: feitas.get(dia) ?? 0,
    hoje: dia === hoje,
    futuro: dia > hoje,
  }));
}

/** Abertas (não concluídas) e concluídas nos últimos 7 dias, para os cartões de número. */
export function totaisDaSemana(
  tarefas: readonly Tarefa[],
  hoje: string,
  fuso: string,
): { abertas: number; concluidasNaSemana: number } {
  const dias = new Set(semanaDe(hoje));
  const feitas = concluidasPorDia(tarefas, fuso);
  let concluidasNaSemana = 0;
  for (const [dia, n] of feitas) if (dias.has(dia)) concluidasNaSemana += n;
  return {
    abertas: raizes(tarefas).filter((t) => t.status !== "done").length,
    concluidasNaSemana,
  };
}

export interface Manchete {
  antes: string;
  /** A parte que ganha a cor do tema (como "learn best." na referência). */
  destaque: string;
  depois: string;
}

/**
 * Frase grande do Início. Fala do que importa AGORA (o que falta hoje), no tom do design system:
 * curta, com número antes de adjetivo e sem cobrança.
 */
export function manchete(hojeResumo: ResumoDeHoje, abertasNoTotal: number): Manchete {
  const { pendentes, feitas } = hojeResumo;
  const plural = (n: number, um: string, varios: string) =>
    n === 1 ? `1 ${um}` : `${n} ${varios}`;

  if (pendentes > 0) {
    return {
      antes: "Faltam ",
      destaque: plural(pendentes, "tarefa", "tarefas"),
      depois: " para fechar o dia.",
    };
  }
  if (feitas > 0) {
    return {
      antes: "Dia fechado. Você concluiu ",
      destaque: plural(feitas, "tarefa", "tarefas"),
      depois: " hoje.",
    };
  }
  if (abertasNoTotal > 0) {
    return { antes: "Nada para hoje. Adiante o que vem ", destaque: "depois", depois: "." };
  }
  return { antes: "Comece criando a sua ", destaque: "primeira tarefa", depois: "." };
}
