/**
 * CONCEITOS de movimento (para aprovação): cada animação é uma lista de quadros que descreve
 * como mexer as peças do pet (pernas, sobe/desce, cabeça, olhos, rabo). Os mesmos desenhos da
 * espécie geram tudo; só o bocejo precisou de uma cabeça nova (boca aberta).
 */
import { componer, contornar, type Camada, type Grade } from "../motor";
import {
  CABECA_DE_GATO_FECHADA,
  moldeDe,
  sombrearPescoco,
  type Especie,
  type Molde,
} from "../pets/especies";
import { ACESSORIOS, TIPO_DE_CABECA, type Padrao } from "./pecas-extras";

export interface QuadroDaAnimacao {
  /** "A"/"B" = posição das pernas; null = sem pernas (deitado). */
  pernas?: "A" | "B" | null;
  /** Sobe (negativo) ou desce o corpo (cabeça e rabo vão junto). */
  dy?: number;
  /** No pulo, as pernas também saem do chão. */
  pernasDy?: number;
  deitado?: boolean;
  cabeca?: "aberta" | "fechada" | "bocejo";
  cabecaDx?: number;
  cabecaDy?: number;
  rabo?: 1 | 2;
  /** Quem não tem rabo "respira" neste quadro (cabeça desce 1 pixel). */
  respira?: boolean;
}

export interface Animacao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  cicloMs: number;
  quadros: readonly QuadroDaAnimacao[];
}

export const ANIMACOES: readonly Animacao[] = [
  {
    id: "piscar",
    codigo: "M1",
    nome: "Parado (piscando)",
    descricao: "Respira, balança o rabo e pisca de vez em quando.",
    cicloMs: 2400,
    quadros: [
      { rabo: 1 },
      { rabo: 2, respira: true },
      { rabo: 1 },
      { rabo: 2, cabeca: "fechada", respira: true },
    ],
  },
  {
    id: "andar",
    codigo: "M2",
    nome: "Andando",
    descricao: "O passeio de sempre pela sala (trote leve).",
    cicloMs: 440,
    quadros: [{ pernas: "A" }, { pernas: "B", dy: -1, rabo: 2 }],
  },
  {
    id: "correr",
    codigo: "M3",
    nome: "Correndo",
    descricao: "Para buscar a bolinha ou comemorar: passos rápidos e quique maior.",
    cicloMs: 360,
    quadros: [
      { pernas: "A" },
      { pernas: "B", dy: -1, rabo: 2 },
      { pernas: "A", dy: -2 },
      { pernas: "B", dy: -1, rabo: 2 },
    ],
  },
  {
    id: "pulo",
    codigo: "M4",
    nome: "Pulinho",
    descricao: "Agacha e pula de alegria (ao fazer carinho ou concluir um Pomodoro).",
    cicloMs: 700,
    quadros: [
      { pernas: "A", dy: 1 },
      { pernas: "A", dy: -3, pernasDy: -3 },
      { pernas: "A", dy: -5, pernasDy: -5, cabeca: "fechada" },
      { pernas: "A", dy: -2, pernasDy: -2 },
    ],
  },
  {
    id: "espreguicar",
    codigo: "M5",
    nome: "Espreguiçando",
    descricao: "Abaixa a cabeça e se estica ao acordar.",
    cicloMs: 2000,
    quadros: [
      {},
      { cabecaDy: 2, cabecaDx: 1, rabo: 1 },
      { cabecaDy: 3, cabecaDx: 1, cabeca: "fechada", rabo: 2 },
      { cabecaDy: 1 },
    ],
  },
  {
    id: "descansar",
    codigo: "M6",
    nome: "Descansando",
    descricao: "Deitadinho, mas acordado, fazendo companhia enquanto você estuda.",
    cicloMs: 1600,
    quadros: [
      { deitado: true, pernas: null, rabo: 1 },
      { deitado: true, pernas: null, rabo: 2, respira: true },
    ],
  },
  {
    id: "bocejo",
    codigo: "M7",
    nome: "Bocejo",
    descricao: "Abre a boca e fecha os olhos (inspirado no gatinho bocejando da referência).",
    cicloMs: 2400,
    quadros: [
      {},
      { cabeca: "fechada" },
      { cabeca: "bocejo" },
      { cabeca: "bocejo", rabo: 2 },
      { cabeca: "fechada" },
      {},
    ],
  },
  {
    id: "comer",
    codigo: "M8",
    nome: "Comendo",
    descricao: "Cabeça na tigela, mastigando (ação Petisco).",
    cicloMs: 600,
    quadros: [
      { cabecaDy: 3, cabecaDx: 1, cabeca: "fechada" },
      { cabecaDy: 2, cabecaDx: 1, cabeca: "fechada", rabo: 2 },
    ],
  },
  {
    id: "dormir",
    codigo: "M9",
    nome: "Dormindo",
    descricao: "Enroladinho, respirando devagar.",
    cicloMs: 2600,
    quadros: [
      { deitado: true, pernas: null, cabeca: "fechada", rabo: 1 },
      { deitado: true, pernas: null, cabeca: "fechada", rabo: 2, cabecaDy: -1 },
    ],
  },
  {
    id: "feliz",
    codigo: "M10",
    nome: "Feliz",
    descricao: "Olhinhos fechados de contente, balançando o rabo.",
    cicloMs: 500,
    quadros: [
      { cabeca: "fechada", rabo: 1 },
      { cabeca: "fechada", rabo: 2, respira: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cabeças de bocejo (boca aberta "m" e língua "p")
// ---------------------------------------------------------------------------
const BOCEJO_GATO: Grade = CABECA_DE_GATO_FECHADA.map((linha, j) =>
  j === 6 ? "bbbbmmmmbbbb" : j === 7 ? ".bbbmppmbbb." : linha,
);

const BOCEJOS: Record<Especie, Grade> = {
  gato: sombrearPescoco(BOCEJO_GATO),
  gato_banana: BOCEJO_GATO,
  capivara: [
    "...bb.....",
    "..bbbbbb..",
    ".sbbbbbbbb",
    "sbbbeeebbd",
    "sbbbbbbbdd",
    "sbbbbbbmmd",
    ".sbbbbbmm.",
  ],
  macaco: [
    "..bbbbbbbb..",
    ".bbbbbbbbbb.",
    "bbbbbbbbbbbb",
    "lbbllllllbbl",
    "lbleelleelbl",
    "lblllddlllbl",
    ".blllmmlllb.",
    "..bblmmlbb..",
    "....bbbb....",
  ],
};

export function cabecaDeBocejo(especie: Especie): Grade {
  return BOCEJOS[especie];
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------
export interface OpcoesDoConceito {
  acessorio?: string;
  padrao?: Padrao;
}

function camadas(
  especie: Especie,
  m: Molde,
  q: QuadroDaAnimacao,
  { acessorio, padrao }: OpcoesDoConceito,
): Camada[] {
  const deitado = q.deitado ?? false;
  const base = deitado ? m.dormindo : m.em_pe;
  const dy = q.dy ?? 0;
  const rabo = q.rabo === 2 ? m.rabo2 : m.rabo1;
  const inspira = q.respira && !m.rabo1 ? 1 : 0;
  const lista: Camada[] = [];

  if (rabo) {
    const g = padrao?.rabo ? padrao.rabo(rabo) : rabo;
    lista.push({ grade: g, x: base.rabo.x, y: base.rabo.y + dy });
  }
  lista.push({
    grade: padrao?.corpo ? padrao.corpo(m.corpo) : m.corpo,
    x: base.corpo.x,
    y: base.corpo.y + dy,
  });
  const pernas =
    q.pernas === null || deitado ? undefined : q.pernas === "B" ? m.pernasB : m.pernasA;
  if (pernas)
    lista.push({ grade: pernas, x: m.em_pe.pernas.x, y: m.em_pe.pernas.y + (q.pernasDy ?? 0) });

  const tipo = q.cabeca ?? "aberta";
  const cabecaBase =
    tipo === "bocejo" ? cabecaDeBocejo(especie) : tipo === "fechada" ? m.cabecaFechada : m.cabeca;
  const cabeca = padrao?.cabeca ? padrao.cabeca(cabecaBase) : cabecaBase;
  const cx = base.cabeca.x + (q.cabecaDx ?? 0);
  const cy = base.cabeca.y + dy + (q.cabecaDy ?? 0) + inspira;
  lista.push({ grade: cabeca, x: cx, y: cy });

  const enc = ACESSORIOS.find((a) => a.id === acessorio)?.porTipo[TIPO_DE_CABECA[especie]];
  if (enc) lista.push({ grade: enc.grade, x: cx + enc.x, y: cy + enc.y });
  return lista;
}

/** Caixa comum a TODAS as animações e acessórios da espécie (o pet não "pula" de lugar). */
function caixa(especie: Especie) {
  const m = moldeDe(especie);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const opcoes: OpcoesDoConceito[] = [{}, ...ACESSORIOS.map((a) => ({ acessorio: a.id }))];
  for (const anim of ANIMACOES) {
    for (const q of anim.quadros) {
      for (const op of opcoes) {
        for (const c of camadas(especie, m, q, op)) {
          x0 = Math.min(x0, c.x);
          y0 = Math.min(y0, c.y);
          x1 = Math.max(x1, c.x + (c.grade[0]?.length ?? 0));
          y1 = Math.max(y1, c.y + c.grade.length);
        }
      }
    }
  }
  return { x0: x0 - 1, y0: y0 - 1, largura: x1 - x0 + 2, altura: y1 - y0 + 2 };
}

/** Os quadros (com contorno) de uma animação conceito, com acessório e padrão opcionais. */
export function quadrosDoConceito(
  especie: Especie,
  animacaoId: string,
  opcoes: OpcoesDoConceito = {},
): string[][] {
  const anim = ANIMACOES.find((a) => a.id === animacaoId);
  if (!anim) throw new Error(`Animação desconhecida: ${animacaoId}`);
  const m = moldeDe(especie);
  const cx = caixa(especie);
  return anim.quadros.map((q) => {
    const lista = camadas(especie, m, q, opcoes).map((c) => ({
      ...c,
      x: c.x - cx.x0,
      y: c.y - cx.y0,
    }));
    return contornar(componer(lista, cx.largura, cx.altura));
  });
}
