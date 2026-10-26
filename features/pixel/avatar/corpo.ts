/**
 * AVATAR "RPG" (rodada 2 de conceitos): bonequinho chibi DETALHADO, visto de lado (olha para a
 * direita, como os pets) com o rosto em 3/4. Cada parte tem 3 tons (luz, base, sombra) e o corpo
 * é montado em CAMADAS, para "vestir" itens por parte (cabeça, rosto, blusa, pernas, pés, costas,
 * mão), como num jogo de RPG.
 *
 * Letras minúsculas = corpo e roupa base (recoloridas pelas escolhas):
 *   pele  y luz · s base · z sombra · b bochecha · m boca
 *   olho  e cílio/pupila · x íris · w brilho
 *   cabelo l luz · h base · j sombra
 *   blusa f luz · c base · d sombra
 *   calça n luz · t base · p sombra
 *   sapato g luz · q base · r sombra
 * Letras MAIÚSCULAS = itens equipados (cada item traz as cores das suas letras).
 */
import type { Grade } from "../motor";

/** Ponto relativo à origem do avatar (canto de cima da cabeça). */
export interface Ponto {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Cabeça (18 x 15), rosto em 3/4 olhando para a direita
// ---------------------------------------------------------------------------
export const CABECA: Grade = [
  "......ssssss......",
  "....ssssssssss....",
  "...ssssssssssyy...",
  "..sssssssssssyyy..",
  ".zsssssssssssssys.",
  ".zsssssssssssssss.",
  "zzssssssssssssssss",
  "zzsssssseessseess.",
  "zzssssssxwsssxwss.",
  "zzssssssxxsssxxss.",
  "zzsssssbbsssbbsss.",
  "zzsssssssssmmsss..",
  ".zzsssssssssssss..",
  "..zzssssssssssss..",
  "....zzssssssss....",
];

/** Olhos fechados (piscar, feliz): só a linha do meio vira traço. */
export const CABECA_PISCANDO: Grade = CABECA.map((l, j) =>
  j === 7 || j === 9
    ? l.replace(/[ex]/g, "s").replace(/w/g, "s")
    : j === 8
      ? l.replace(/[xw]/g, "e")
      : l,
);

/** Onde ficam os olhos (para conferir que cabelo e itens nunca cobrem o rosto). */
export const OLHOS: readonly Ponto[] = [
  { x: 8, y: 8 },
  { x: 9, y: 8 },
  { x: 13, y: 8 },
  { x: 14, y: 8 },
];

// ---------------------------------------------------------------------------
// Corpo por pose. Ordem das camadas (de trás para a frente):
//   costas · cabelo de trás · pernas · torso · braço · mão (item) · cabeça · cabelo · rosto · chapéu
// ---------------------------------------------------------------------------
export interface QuadroDoCorpo {
  torso: Grade;
  pernas: Grade;
  braco: Grade;
  /** Posição do braço (da frente) e da mão (onde o item segurado é desenhado). */
  bracoEm: Ponto;
  maoEm: Ponto;
  /** Deslocamento da cabeça (respirar, passo). */
  cabecaDy?: number;
  olhosFechados?: boolean;
}

export const TORSO_EM: Ponto = { x: 3, y: 14 };
export const PERNAS_EM: Ponto = { x: 4, y: 22 };
/** Onde a mochila/capa encaixa (nas costas, à esquerda do torso). */
export const COSTAS_EM: Ponto = { x: 0, y: 15 };

const TORSO: Grade = [
  "....zss.....",
  "..ccccccc...",
  ".ccccccccc..",
  ".dcccccccfc.",
  ".dcccccccfc.",
  ".dcccccccfc.",
  ".dccccccccc.",
  ".dddccccccc.",
];

const BRACO_PARADO: Grade = ["dcf", "dcf", "dcf", "dcf", "dcf", "dcc", "zsy", "zss"];
const BRACO_BALANCA: Grade = [".dcf", ".dcf", "dcf.", "dcf.", "dcf.", "dcc.", "zsy.", "zss."];

const PERNAS_PARADO: Grade = [
  "ptttttttn..",
  ".ppt.tttn..",
  ".ppt.tttn..",
  ".ppt.tttn..",
  ".ppt.tttn..",
  ".rrq.qqqgq.",
  ".rrr.rqqqqq",
];
const PERNAS_PASSO_A: Grade = [
  "ptttttttn..",
  "ppt..tttn..",
  "pp....ttn..",
  "pp.....ttn.",
  "pp.....ttn.",
  "rrq....qqgq",
  "rrr....rqqq",
];
const PERNAS_PASSO_B: Grade = [
  "ptttttttn..",
  ".pptttttn..",
  "..pptttn...",
  "..pptttn...",
  "..pptttn...",
  "..rrqqqgq..",
  "..rrrqqqqq.",
];

/** Sentado (de lado, numa cadeira): coxas para a frente, canelas para baixo. */
const PERNAS_SENTADO: Grade = [
  "pttttttttttn.",
  "ppttttttttnn.",
  "........tttn.",
  "........tttn.",
  "........tttn.",
  "........qqqgq",
  "........rqqqq",
];
/** Braço esticado até a mesa (escrevendo). */
const BRACO_MESA_A: Grade = ["dccccff...", "dccccffzsy", ".dddddd.zs"];
const BRACO_MESA_B: Grade = ["dccccff...", "dccccff.zs", ".dddddd.zy"];
/** Braço dobrado segurando algo na frente do peito (ler um livro). */
const BRACO_DOBRADO: Grade = ["dcf..", "dcf..", "dccff", ".dczs", "...zy"];
/** Braço levantado (acenar), com a mão no alto. */
const BRACO_ACENO_A: Grade = [".zs", ".sy", ".cf", "dcf", "dcf", "dcf", "dcc"];
const BRACO_ACENO_B: Grade = ["zs.", "sy.", ".cf", "dcf", "dcf", "dcf", "dcc"];

export type PoseDoAvatar = "parado" | "andando" | "sentado" | "lendo" | "acenando";

export interface PoseAnimada {
  id: PoseDoAvatar;
  codigo: string;
  nome: string;
  descricao: string;
  cicloMs: number;
  quadros: readonly QuadroDoCorpo[];
}

const emPe = (braco: Grade, pernas: Grade, extra: Partial<QuadroDoCorpo> = {}): QuadroDoCorpo => ({
  torso: TORSO,
  pernas,
  braco,
  bracoEm: { x: 10, y: 16 },
  maoEm: { x: 10, y: 22 },
  ...extra,
});

const sentado = (
  braco: Grade,
  bracoEm: Ponto,
  maoEm: Ponto,
  extra: Partial<QuadroDoCorpo> = {},
) => ({
  torso: TORSO,
  pernas: PERNAS_SENTADO,
  braco,
  bracoEm,
  maoEm,
  ...extra,
});

export const POSES: readonly PoseAnimada[] = [
  {
    id: "parado",
    codigo: "P1",
    nome: "Parado",
    descricao: "Respira e pisca.",
    cicloMs: 2400,
    quadros: [
      emPe(BRACO_PARADO, PERNAS_PARADO),
      emPe(BRACO_PARADO, PERNAS_PARADO, { cabecaDy: 1 }),
      emPe(BRACO_PARADO, PERNAS_PARADO),
      emPe(BRACO_PARADO, PERNAS_PARADO, { olhosFechados: true }),
    ],
  },
  {
    id: "andando",
    codigo: "P2",
    nome: "Andando",
    descricao: "Passo com o braço balançando.",
    cicloMs: 520,
    quadros: [
      emPe(BRACO_BALANCA, PERNAS_PASSO_A, { bracoEm: { x: 9, y: 16 }, maoEm: { x: 9, y: 22 } }),
      emPe(BRACO_PARADO, PERNAS_PASSO_B, { cabecaDy: 1 }),
    ],
  },
  {
    id: "sentado",
    codigo: "P3",
    nome: "Sentado escrevendo",
    descricao: "Na mesa da biblioteca; a mão mexe.",
    cicloMs: 900,
    quadros: [
      sentado(BRACO_MESA_A, { x: 9, y: 17 }, { x: 17, y: 18 }),
      sentado(BRACO_MESA_B, { x: 9, y: 17 }, { x: 17, y: 18 }),
    ],
  },
  {
    id: "lendo",
    codigo: "P4",
    nome: "Lendo",
    descricao: "Sentado, segurando o item da mão na frente do peito.",
    cicloMs: 2400,
    quadros: [
      sentado(BRACO_DOBRADO, { x: 9, y: 16 }, { x: 12, y: 19 }),
      sentado(BRACO_DOBRADO, { x: 9, y: 16 }, { x: 12, y: 19 }, { olhosFechados: true }),
    ],
  },
  {
    id: "acenando",
    codigo: "P5",
    nome: "Acenando",
    descricao: "Oi! A mão balança no alto.",
    cicloMs: 600,
    quadros: [
      emPe(BRACO_ACENO_A, PERNAS_PARADO, { bracoEm: { x: 10, y: 9 }, maoEm: { x: 11, y: 9 } }),
      emPe(BRACO_ACENO_B, PERNAS_PARADO, { bracoEm: { x: 10, y: 9 }, maoEm: { x: 10, y: 9 } }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Pele e olhos
// ---------------------------------------------------------------------------
export interface TomDePele {
  id: string;
  nome: string;
  y: string;
  s: string;
  z: string;
  b: string;
}

export const PELES: readonly TomDePele[] = [
  { id: "p1", nome: "Pele 1", y: "#fff1e6", s: "#fde0c8", z: "#eab99a", b: "#f6a4a0" },
  { id: "p2", nome: "Pele 2", y: "#fbdcc0", s: "#f1c29c", z: "#d99d77", b: "#ec9388" },
  { id: "p3", nome: "Pele 3", y: "#f0c39b", s: "#dea57a", z: "#bf825b", b: "#d97e6b" },
  { id: "p4", nome: "Pele 4", y: "#dca377", s: "#c4885c", z: "#a06944", b: "#c46a55" },
  { id: "p5", nome: "Pele 5", y: "#b27b55", s: "#98623e", z: "#784b2e", b: "#a7513f" },
  { id: "p6", nome: "Pele 6", y: "#86573a", s: "#6c4329", z: "#52311d", b: "#83402f" },
];

export interface CorDosOlhos {
  id: string;
  nome: string;
  x: string;
}

export const OLHOS_CORES: readonly CorDosOlhos[] = [
  { id: "castanho", nome: "Castanhos", x: "#6b3f22" },
  { id: "preto", nome: "Pretos", x: "#2b2230" },
  { id: "verde", nome: "Verdes", x: "#3f8a5a" },
  { id: "azul", nome: "Azuis", x: "#3f74c4" },
  { id: "mel", nome: "Mel", x: "#b8862e" },
];
