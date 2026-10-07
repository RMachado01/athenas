/**
 * Datas em texto "AAAA-MM-DD", sem Date local e sem surpresa de fuso horário.
 * A aritmética de calendário é feita em UTC (só para contar dias; nunca para mostrar horas).
 * O "hoje" é sempre o hoje NO FUSO DA PESSOA (profiles.timezone), e não o do servidor/navegador.
 */

const FUSO_PADRAO = "America/Sao_Paulo";

/** "AAAA-MM-DD" -> [ano, mês, dia]. */
export function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return [a, m, d];
}

export function paraIso(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** true se a data existe de verdade (31/02 não existe). */
export function dataValida(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = partes(iso);
  const nova = new Date(Date.UTC(a, m - 1, d + dias));
  return paraIso(nova.getUTCFullYear(), nova.getUTCMonth() + 1, nova.getUTCDate());
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(iso: string): number {
  const [a, m, d] = partes(iso);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** 1 = segunda … 7 = domingo (ISO). */
export function diaIso(iso: string): number {
  const dia = diaDaSemana(iso);
  return dia === 0 ? 7 : dia;
}

/** Quantos dias de `a` até `b` (positivo se `b` é depois). */
export function diferencaDeDias(a: string, b: string): number {
  const [aa, am, ad] = partes(a);
  const [ba, bm, bd] = partes(b);
  return Math.round((Date.UTC(ba, bm - 1, bd) - Date.UTC(aa, am - 1, ad)) / 86_400_000);
}

/** "AAAA-MM-DD" do dia de hoje no fuso informado. Fuso inválido cai em São Paulo. */
export function hojeNoFuso(fuso: string, agora: Date = new Date()): string {
  const formatar = (tz: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(agora);
  try {
    return formatar(fuso);
  } catch {
    return formatar(FUSO_PADRAO);
  }
}
