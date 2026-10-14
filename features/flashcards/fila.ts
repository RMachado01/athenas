import type { EstadoDoCartao } from "./agendador";

/**
 * Regras da sessão de revisão (puras, sem banco e sem tela):
 *  - o "hoje" é o da pessoa (fuso do perfil), igual ao Foco;
 *  - ordem: cartões em aprendizagem vencidos → revisões de hoje → novos até o limite do dia;
 *  - com muitos atrasados (> 50), os novos ficam pausados: primeiro pôr em dia;
 *  - aprendizagem que vence em até 20 min pode ser antecipada (como no Anki).
 */

export interface CartaoDaFila {
  id: string;
  frente: string;
  verso: string;
  deckId: string;
  noteId: string | null;
  estado: EstadoDoCartao;
}

export const LIMITE_DE_ATRASADOS = 50;
export const ANTECIPACAO_MS = 20 * 60_000;
const FUSO_PADRAO = "America/Sao_Paulo";

/** Instante (UTC) da meia-noite de hoje no fuso informado. */
export function inicioDoDiaNoFuso(fuso: string, agora: Date): Date {
  const calcular = (tz: string) => {
    const partes = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(agora)
        .map((p) => [p.type, p.value]),
    );
    // Diferença entre o relógio local e o UTC neste instante = deslocamento do fuso.
    const localComoUtc = Date.UTC(
      Number(partes.year),
      Number(partes.month) - 1,
      Number(partes.day),
      Number(partes.hour),
      Number(partes.minute),
      Number(partes.second),
    );
    const deslocamento = localComoUtc - Math.floor(agora.getTime() / 1000) * 1000;
    const meiaNoiteLocalComoUtc = Date.UTC(
      Number(partes.year),
      Number(partes.month) - 1,
      Number(partes.day),
    );
    return new Date(meiaNoiteLocalComoUtc - deslocamento);
  };
  try {
    return calcular(fuso);
  } catch {
    return calcular(FUSO_PADRAO);
  }
}

const venc = (c: CartaoDaFila) => Date.parse(c.estado.due);
const porVencimento = (a: CartaoDaFila, b: CartaoDaFila) => venc(a) - venc(b);
const emAprendizagem = (c: CartaoDaFila) => c.estado.state === 1 || c.estado.state === 3;

export function montarFila(e: {
  revisoes: CartaoDaFila[];
  novos: CartaoDaFila[];
  agora: Date;
  inicioDoDia: Date;
  novosJaHoje: number;
  limiteDeNovos: number;
}): { fila: CartaoDaFila[]; atrasados: number; novosPausados: boolean } {
  const agora = e.agora.getTime();
  const fimDoDia = e.inicioDoDia.getTime() + 86_400_000;

  const aprendendo = e.revisoes
    .filter((c) => emAprendizagem(c) && venc(c) <= agora + ANTECIPACAO_MS)
    .sort(porVencimento);
  const revisoes = e.revisoes
    .filter((c) => c.estado.state === 2 && venc(c) < fimDoDia)
    .sort(porVencimento);
  const atrasados = revisoes.filter((c) => venc(c) < e.inicioDoDia.getTime()).length;
  const novosPausados = atrasados > LIMITE_DE_ATRASADOS;
  const vagas = novosPausados ? 0 : Math.max(0, e.limiteDeNovos - e.novosJaHoje);

  return {
    fila: [...aprendendo, ...revisoes, ...e.novos.slice(0, vagas)],
    atrasados,
    novosPausados,
  };
}

/** Próximo cartão a mostrar: o primeiro já vencido, ou um que vence em até 20 min. */
export function proximoDaFila(fila: CartaoDaFila[], agora: Date): CartaoDaFila | null {
  const limite = agora.getTime() + ANTECIPACAO_MS;
  return fila.find((c) => c.estado.state === 0 || venc(c) <= limite) ?? null;
}

/**
 * Depois de responder: se o cartão continua em aprendizagem e vence em até 20 min, volta para
 * a fila na posição do vencimento (atrás de quem vence antes). Senão, sai da sessão.
 */
export function reinserir(fila: CartaoDaFila[], cartao: CartaoDaFila, agora: Date): CartaoDaFila[] {
  const semEle = fila.filter((c) => c.id !== cartao.id);
  if (!emAprendizagem(cartao) || venc(cartao) > agora.getTime() + ANTECIPACAO_MS) return semEle;
  const i = semEle.findIndex((c) => c.estado.state !== 0 && venc(c) > venc(cartao));
  const pos = i < 0 ? semEle.length : i;
  return [...semEle.slice(0, pos), cartao, ...semEle.slice(pos)];
}

/**
 * Tempo de estudo da sessão em trechos: momentos = início da sessão + cada resposta.
 * Uma pausa maior que 5 min corta o trecho; trechos com menos de 1 min não contam.
 */
export function trechosDeEstudo(
  momentos: Date[],
  pausaMaximaMs = 5 * 60_000,
  minimoMs = 60_000,
): { inicio: Date; fim: Date }[] {
  const ordenados = [...momentos].sort((a, b) => a.getTime() - b.getTime());
  const trechos: { inicio: Date; fim: Date }[] = [];
  let atual: { inicio: Date; fim: Date } | null = null;
  for (const m of ordenados) {
    if (atual && m.getTime() - atual.fim.getTime() <= pausaMaximaMs) {
      atual.fim = m;
    } else {
      if (atual) trechos.push(atual);
      atual = { inicio: m, fim: m };
    }
  }
  if (atual) trechos.push(atual);
  return trechos.filter((t) => t.fim.getTime() - t.inicio.getTime() >= minimoMs);
}
