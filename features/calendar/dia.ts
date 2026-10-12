/**
 * Lógica pura da grade do dia (estilo Notion Calendar): converte eventos para minutos no FUSO
 * da pessoa e distribui os que se sobrepõem lado a lado, em colunas.
 */
import { somarDias } from "@/lib/datas";

export interface EventoDaAgenda {
  id: string;
  titulo: string;
  agendaId: string;
  diaInteiro: boolean;
  /** ISO UTC (eventos com horário). */
  inicio: string | null;
  fim: string | null;
  /** "AAAA-MM-DD" (dia inteiro; fim exclusivo). */
  diaInicio: string | null;
  diaFim: string | null;
}

export interface BlocoPosicionado<T> {
  item: T;
  /** Minutos desde 00:00 do dia (no fuso). */
  inicioMin: number;
  fimMin: number;
  coluna: number;
  colunas: number;
}

const MIN_DIA = 24 * 60;
/** Bloco curto demais fica ilegível: altura mínima de 20 min na grade. */
export const DURACAO_MINIMA_VISIVEL = 20;

/** Data local ("AAAA-MM-DD") e minutos desde a meia-noite de um instante, no fuso dado. */
export function noFuso(isoUtc: string, fuso: string): { dia: string; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoUtc));
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return {
    dia: `${v("year")}-${v("month")}-${v("day")}`,
    minutos: Number(v("hour")) * 60 + Number(v("minute")),
  };
}

/** O evento aparece neste dia? (dia inteiro: dentro do intervalo; com horário: encosta no dia). */
export function eventoNoDia(e: EventoDaAgenda, dia: string, fuso: string): boolean {
  if (e.diaInteiro) return !!e.diaInicio && !!e.diaFim && e.diaInicio <= dia && dia < e.diaFim;
  if (!e.inicio || !e.fim) return false;
  const ini = noFuso(e.inicio, fuso);
  const fim = noFuso(e.fim, fuso);
  // termina exatamente à meia-noite do dia seguinte: não "vaza" para ele
  const fimEfetivo = fim.minutos === 0 && fim.dia > ini.dia ? somarDias(fim.dia, -1) : fim.dia;
  return ini.dia <= dia && dia <= fimEfetivo;
}

/** Recorta um evento com horário ao dia pedido (ex.: plantão das 20h às 8h). */
export function intervaloNoDia(
  e: EventoDaAgenda,
  dia: string,
  fuso: string,
): { inicioMin: number; fimMin: number } | null {
  if (e.diaInteiro || !e.inicio || !e.fim || !eventoNoDia(e, dia, fuso)) return null;
  const ini = noFuso(e.inicio, fuso);
  const fim = noFuso(e.fim, fuso);
  const inicioMin = ini.dia < dia ? 0 : ini.minutos;
  const fimMin = fim.dia > dia ? MIN_DIA : fim.minutos;
  return { inicioMin, fimMin: Math.max(fimMin, inicioMin) };
}

/**
 * Distribui blocos que se sobrepõem em colunas (como Notion/Google Calendar): cada grupo de
 * blocos que se encostam divide a largura; cada bloco vai para a primeira coluna livre.
 */
export function distribuirEmColunas<T>(
  blocos: readonly { item: T; inicioMin: number; fimMin: number }[],
): BlocoPosicionado<T>[] {
  const ordenados = [...blocos]
    .map((b) => ({ ...b, fimVisivel: Math.max(b.fimMin, b.inicioMin + DURACAO_MINIMA_VISIVEL) }))
    .sort((a, b) => a.inicioMin - b.inicioMin || b.fimVisivel - a.fimVisivel);

  const resultado: BlocoPosicionado<T>[] = [];
  let grupo: (BlocoPosicionado<T> & { fimVisivel: number })[] = [];
  let fimDoGrupo = -1;

  const fecharGrupo = () => {
    const colunas = Math.max(1, ...grupo.map((b) => b.coluna + 1));
    for (const b of grupo) {
      resultado.push({
        item: b.item,
        inicioMin: b.inicioMin,
        fimMin: b.fimMin,
        coluna: b.coluna,
        colunas,
      });
    }
    grupo = [];
  };

  for (const b of ordenados) {
    if (grupo.length > 0 && b.inicioMin >= fimDoGrupo) fecharGrupo();
    const ocupadas = new Set(grupo.filter((g) => g.fimVisivel > b.inicioMin).map((g) => g.coluna));
    let coluna = 0;
    while (ocupadas.has(coluna)) coluna++;
    grupo.push({ ...b, coluna, colunas: 1 });
    fimDoGrupo = Math.max(fimDoGrupo, b.fimVisivel);
  }
  if (grupo.length > 0) fecharGrupo();
  return resultado;
}

/** "09:30" a partir de minutos. */
export function formatarHora(minutos: number): string {
  const m = Math.max(0, Math.min(MIN_DIA, Math.round(minutos)));
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "há 2 min", "agora há pouco", "há 3 h", "ontem" — para o status da sincronização. */
export function haQuantoTempo(iso: string | null, agora: Date): string {
  if (!iso) return "nunca";
  const seg = Math.max(0, (agora.getTime() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return "agora há pouco";
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}
