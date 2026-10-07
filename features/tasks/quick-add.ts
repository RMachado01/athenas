/**
 * "Adicionar rápido": transforma uma frase em tarefa estruturada, em português.
 *
 *   "5 exercícios de CTE amanhã 19h #sql !alta ~45min"
 *     -> título "5 exercícios de CTE", prazo amanhã às 19:00, trilha "sql", prioridade alta, 45 min
 *
 * É uma função PURA (sem rede, sem relógio): o "hoje" entra como parâmetro. Isso a deixa fácil de
 * testar e correta no fuso da pessoa (quem chama calcula o "hoje" no fuso dela).
 *
 * O que ela reconhece (cada tipo é opcional e vale só a PRIMEIRA ocorrência):
 *   Prazo   : hoje · amanhã · depois de amanhã · segunda…domingo (próxima ocorrência) ·
 *             dia 15 · 15/10 · 15/10/2026 · em 3 dias · em 2 semanas
 *   Hora    : 19h · 19h30 · 19:30 · às 19
 *   Trilha  : #sql  #power-bi
 *   Prior.  : !alta · !media · !baixa · !1 !2 !3
 *   Tempo   : ~45min · ~2h · ~1h30   (o til evita confundir com a HORA "19h")
 *
 * Tudo que não for reconhecido continua no título. Cada trecho reconhecido é devolvido em
 * `trechos`, com posição, para a tela destacá-los (chips) enquanto a pessoa digita.
 */

import { dataValida, diaDaSemana, paraIso, partes, somarDias } from "@/lib/datas";

export { somarDias };

export type TipoDeTrecho = "prazo" | "hora" | "trilha" | "prioridade" | "estimativa";

export interface Trecho {
  tipo: TipoDeTrecho;
  texto: string;
  inicio: number;
  fim: number;
}

export interface TarefaRapida {
  titulo: string;
  /** "AAAA-MM-DD" ou null. */
  prazo: string | null;
  /** "HH:MM" ou null. Só existe se houver prazo? Não: a hora sozinha assume HOJE (ver abaixo). */
  hora: string | null;
  /** Texto da trilha sem o "#", ex.: "power bi". A tela casa com as trilhas da pessoa. */
  trilha: string | null;
  /** 1 = baixa · 2 = média · 3 = alta. */
  prioridade: 1 | 2 | 3 | null;
  estimativaMin: number | null;
  trechos: Trecho[];
}

const DIAS_DA_SEMANA: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

// ---------------------------------------------------------------------------
// Expressões. Trabalhamos num texto "dobrado" (sem acento, minúsculo) do MESMO tamanho do
// original, para as posições valerem nos dois. "Fora de palavra" usa letras/números Unicode,
// porque o \b do JavaScript não entende acentos.
// ---------------------------------------------------------------------------

const ANTES = "(?<![\\p{L}\\p{N}])";
const DEPOIS = "(?![\\p{L}\\p{N}])";
const R = (corpo: string) => new RegExp(`${ANTES}${corpo}${DEPOIS}`, "gu");

const RE = {
  depoisDeAmanha: R("depois\\s+de\\s+amanha"),
  amanha: R("amanha"),
  hoje: R("hoje"),
  semana: R("(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:[\\s-]+feira)?"),
  diaN: R("dia\\s+(\\d{1,2})"),
  dataCompleta: R("(\\d{1,2})/(\\d{1,2})/(\\d{4})"),
  dataCurta: R("(\\d{1,2})/(\\d{1,2})"),
  emN: R("em\\s+(\\d{1,3})\\s+(dias?|semanas?)"),
  // Só "às/as": o "a" sozinho confundiria frases comuns como "estudar a 5 capítulos".
  horaComAs: R("as\\s+(\\d{1,2})(?:(?:h|:)(\\d{2}))?"),
  horaComH: R("(\\d{1,2})h(\\d{2})?"),
  horaComDoisPontos: R("(\\d{1,2}):(\\d{2})"),
  trilha: /(?<![\p{L}\p{N}])#([\p{L}\p{N}_-]+)/gu,
  prioridade: R("!(alta|media|baixa|[123])"),
  estimativa:
    /(?<![\p{L}\p{N}])~\s*(?:(\d{1,2})\s*h(?:\s*(\d{1,2})\s*(?:min|m)?)?|(\d{1,3})\s*(?:min|m))(?![\p{L}\p{N}])/gu,
};

interface Achado {
  inicio: number;
  fim: number;
  grupos: string[];
}

/** Primeira ocorrência de `re` (texto dobrado) que não encosta em área já usada. */
function primeiro(re: RegExp, dobrado: string, usado: boolean[]): Achado | null {
  re.lastIndex = 0;
  for (const m of dobrado.matchAll(re)) {
    const inicio = m.index ?? 0;
    const fim = inicio + m[0].length;
    if (usado.slice(inicio, fim).some(Boolean)) continue;
    return { inicio, fim, grupos: m.slice(1) };
  }
  return null;
}

function marcar(usado: boolean[], inicio: number, fim: number) {
  for (let i = inicio; i < fim; i++) usado[i] = true;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

/**
 * @param entrada texto digitado
 * @param hoje    "AAAA-MM-DD" do dia de hoje NO FUSO DA PESSOA
 */
export function interpretarTarefaRapida(entrada: string, hoje: string): TarefaRapida {
  const texto = entrada.normalize("NFC");
  const dobrado = texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  // Se o tamanho mudou (caso raro de caracteres exóticos), não arriscamos posições erradas.
  const seguro = dobrado.length === texto.length ? dobrado : texto.toLowerCase();

  const usado: boolean[] = new Array(texto.length).fill(false);
  const trechos: Trecho[] = [];
  const registrar = (tipo: TipoDeTrecho, a: Achado) => {
    marcar(usado, a.inicio, a.fim);
    trechos.push({ tipo, texto: texto.slice(a.inicio, a.fim), inicio: a.inicio, fim: a.fim });
  };

  // ----- Prazo: vale a expressão que aparece PRIMEIRO no texto -----
  type CandidatoDePrazo = { achado: Achado; data: string };
  const candidatos: CandidatoDePrazo[] = [];

  const depois = primeiro(RE.depoisDeAmanha, seguro, usado);
  if (depois) candidatos.push({ achado: depois, data: somarDias(hoje, 2) });

  // "depois de amanhã" contém "amanhã": reservamos a área antes de procurar o resto.
  const reservaDepois = [...usado];
  if (depois) marcar(reservaDepois, depois.inicio, depois.fim);

  const amanha = primeiro(RE.amanha, seguro, reservaDepois);
  if (amanha) candidatos.push({ achado: amanha, data: somarDias(hoje, 1) });

  const hojeAchado = primeiro(RE.hoje, seguro, usado);
  if (hojeAchado) candidatos.push({ achado: hojeAchado, data: hoje });

  const sem = primeiro(RE.semana, seguro, usado);
  if (sem) {
    const alvo = DIAS_DA_SEMANA[sem.grupos[0] ?? ""];
    if (alvo !== undefined) {
      // Sempre a PRÓXIMA ocorrência (1 a 7 dias à frente). Para "hoje" a pessoa escreve "hoje".
      const falta = ((alvo - diaDaSemana(hoje) + 6) % 7) + 1;
      candidatos.push({ achado: sem, data: somarDias(hoje, falta) });
    }
  }

  const completa = primeiro(RE.dataCompleta, seguro, usado);
  if (completa) {
    const [d, m, a] = completa.grupos.map(Number) as [number, number, number];
    if (dataValida(a, m, d)) candidatos.push({ achado: completa, data: paraIso(a, m, d) });
  }

  const [anoHoje, mesHoje, diaHoje] = partes(hoje);

  const curta = primeiro(RE.dataCurta, seguro, usado);
  if (curta && !(completa && curta.inicio >= completa.inicio && curta.fim <= completa.fim)) {
    const [d, m] = curta.grupos.map(Number) as [number, number];
    // Sem ano: a próxima vez que essa data acontece (se já passou este ano, vale o ano que vem).
    let ano = anoHoje;
    if (dataValida(ano, m, d) && paraIso(ano, m, d) < hoje) ano += 1;
    if (dataValida(ano, m, d)) candidatos.push({ achado: curta, data: paraIso(ano, m, d) });
  }

  const diaN = primeiro(RE.diaN, seguro, usado);
  if (diaN) {
    const d = Number(diaN.grupos[0]);
    // "dia 15": este mês se ainda não passou; senão, o primeiro mês seguinte em que o dia EXISTE
    // (dito em novembro, "dia 31" vira 31 de dezembro). Procuramos até 12 meses à frente.
    let ano = anoHoje;
    let mes = mesHoje;
    for (let tentativa = 0; tentativa < 13; tentativa++) {
      const jaPassouEsteMes = tentativa === 0 && d < diaHoje;
      if (!jaPassouEsteMes && dataValida(ano, mes, d)) {
        candidatos.push({ achado: diaN, data: paraIso(ano, mes, d) });
        break;
      }
      mes += 1;
      if (mes > 12) {
        mes = 1;
        ano += 1;
      }
    }
  }

  const emN = primeiro(RE.emN, seguro, usado);
  if (emN) {
    const n = Number(emN.grupos[0]);
    const unidade = emN.grupos[1] ?? "";
    candidatos.push({
      achado: emN,
      data: somarDias(hoje, unidade.startsWith("semana") ? n * 7 : n),
    });
  }

  const escolhido = candidatos.sort(
    (a, b) => a.achado.inicio - b.achado.inicio || b.achado.fim - a.achado.fim,
  )[0];
  let prazo: string | null = null;
  if (escolhido) {
    registrar("prazo", escolhido.achado);
    prazo = escolhido.data;
  }

  // ----- Estimativa (antes da hora: o "~1h30" não pode ser lido como hora) -----
  let estimativaMin: number | null = null;
  const es = primeiro(RE.estimativa, seguro, usado);
  if (es) {
    const [h, mDepoisDaHora, soMin] = es.grupos;
    const total = soMin
      ? Number(soMin)
      : Number(h) * 60 + (mDepoisDaHora ? Number(mDepoisDaHora) : 0);
    if (total >= 1 && total <= 1440) {
      registrar("estimativa", es);
      estimativaMin = total;
    }
  }

  // ----- Hora -----
  let hora: string | null = null;
  const horaValida = (h: number, min: number) => h >= 0 && h <= 23 && min >= 0 && min <= 59;
  for (const re of [RE.horaComAs, RE.horaComH, RE.horaComDoisPontos]) {
    const a = primeiro(re, seguro, usado);
    if (!a) continue;
    const h = Number(a.grupos[0]);
    const min = a.grupos[1] ? Number(a.grupos[1]) : 0;
    if (!horaValida(h, min)) continue;
    registrar("hora", a);
    hora = `${pad2(h)}:${pad2(min)}`;
    break;
  }
  // Hora sem dia ("estudar 19h"): assume hoje, para a tarefa nunca ficar com hora sem data.
  if (hora && !prazo) prazo = hoje;

  // ----- Trilha -----
  let trilha: string | null = null;
  const tr = primeiro(RE.trilha, texto, usado);
  if (tr?.grupos[0]) {
    registrar("trilha", tr);
    trilha = tr.grupos[0].replace(/[-_]+/g, " ").trim();
  }

  // ----- Prioridade -----
  let prioridade: 1 | 2 | 3 | null = null;
  const pr = primeiro(RE.prioridade, seguro, usado);
  if (pr) {
    registrar("prioridade", pr);
    const v = pr.grupos[0];
    prioridade = v === "alta" || v === "3" ? 3 : v === "media" || v === "2" ? 2 : 1;
  }

  // ----- Título: o que sobrou -----
  const titulo = [...texto]
    .map((c, i) => (usado[i] ? " " : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  trechos.sort((a, b) => a.inicio - b.inicio);
  return { titulo, prazo, hora, trilha, prioridade, estimativaMin, trechos };
}
