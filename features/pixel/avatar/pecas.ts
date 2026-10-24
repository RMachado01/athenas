/**
 * CONCEITOS do avatar (para aprovação do Renan): um bonequinho "chibi" (cabeça grande) visto de
 * LADO, olhando para a direita como os pets, com o rosto de frente (fica mais expressivo). É
 * montado por CAMADAS, como os pets: cabelo de trás · corpo (pose) · cabeça · cabelo da frente ·
 * acessório. Cada camada é uma grade de letras; o contorno escuro é posto pelo motor.
 *
 * Letras: s pele · z sombra da pele · e olho · b bochecha · m boca · h cabelo · j sombra do
 * cabelo · c roupa · d sombra da roupa (manga) · w branco/detalhe · t calça/saia · q sapato ·
 * acessórios usam as cores extras dos pets (k preto, r vermelho, u dourado, a azul, n laranja…).
 */
import type { Grade, Paleta } from "../motor";

// ---------------------------------------------------------------------------
// Cabeça (12 x 10): rosto de frente, sombra na nuca (luz vindo da direita)
// ---------------------------------------------------------------------------
export const CABECA: Grade = [
  "...ssssss...",
  ".ssssssssss.",
  "ssssssssssss",
  "ssssssssssss",
  "zsssssssssss",
  "zssessssesss",
  "zssessssesss",
  "zsbssssssbss",
  "zssssmmsssss",
  ".zssssssssz.",
];

/** Olhos fechados (piscar / feliz): uma linha só. */
export const CABECA_PISCANDO: Grade = CABECA.map((l, j) => (j === 5 ? "zsssssssssss" : l));

// ---------------------------------------------------------------------------
// Cabelos: grade de 14 de largura posta 1 pixel à esquerda e 1 acima da cabeça.
// A FRENTE fica por cima do rosto; o de TRÁS (cabelo comprido) fica atrás do corpo.
// Regra: as colunas 4 e 9 (olhos) das linhas 6 e 7 ficam livres (rosto sempre visível).
// ---------------------------------------------------------------------------
export interface Cabelo {
  id: string;
  nome: string;
  frente: Grade;
  tras?: Grade;
}

export const CABELOS: readonly Cabelo[] = [
  {
    id: "curto",
    nome: "Curtinho",
    frente: [
      "....hhhhhh....",
      "..hhhhhhhhhh..",
      ".hhhhhhhhhhhh.",
      ".hhhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hj.......hh..",
      ".h............",
    ],
  },
  {
    id: "franja",
    nome: "Franjinha",
    frente: [
      "...hhhhhhhh...",
      "..hhhhhhhhhh..",
      ".hhhhhhhhhhhh.",
      ".hhhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hj...........",
      ".hj...........",
      ".h............",
    ],
  },
  {
    id: "longo",
    nome: "Comprido",
    frente: [
      "...hhhhhhhh...",
      "..hhhhhhhhhh..",
      ".hhhhhhhhhhhh.",
      ".hhhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hj........hh.",
      ".hj........hh.",
      ".hj.........h.",
    ],
    tras: [
      "..............",
      "..............",
      "..............",
      "..............",
      "hj............",
      "hj............",
      "hj............",
      "hj............",
      "hj............",
      "hjj...........",
      "hjj...........",
      ".hjj..........",
      ".hjj..........",
      "..jj..........",
    ],
  },
  {
    id: "rabo",
    nome: "Rabo de cavalo",
    frente: [
      "...hhhhhhhh...",
      "..hhhhhhhhhh..",
      ".hhhhhhhhhhhh.",
      ".hhhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hj........h..",
      ".h............",
    ],
    tras: [
      "..............",
      "..............",
      "hh............",
      "hjh...........",
      "hjh...........",
      "hjj...........",
      ".hj...........",
      ".hj...........",
      "..j...........",
    ],
  },
  {
    id: "coque",
    nome: "Coque",
    frente: [
      ".....hhhh.....",
      "....hhjjhh....",
      "...hhhhhhhh...",
      "..hhhhhhhhhh..",
      ".hhhhhhhhhhhh.",
      ".hjhhhhhhhhhh.",
      ".hjh.......hh.",
      ".hj...........",
    ],
  },
  {
    id: "cacheado",
    nome: "Cacheado",
    frente: [
      "..hhh.hh.hhh..",
      ".hhhhhhhhhhhh.",
      "hhhhhhhhhhhhhh",
      "hhjhhhhhhhhhhh",
      "hhjhhhhhhhhhhh",
      "hjjhhhhhhhhhhh",
      "hjh.......hhhh",
      "hjh........hh.",
      "hjh.........h.",
      ".hj...........",
    ],
  },
  {
    id: "black",
    nome: "Black power",
    frente: [
      "...hhhhhhhh...",
      ".hhhhhhhhhhhh.",
      "hhhhhhhhhhhhhh",
      "hhhhhhhhhhhhhh",
      "hhjhhhhhhhhhhh",
      "hjjhhhhhhhhhhh",
      "hjh........hhh",
      "hjh.........hh",
      "hj..........h.",
    ],
    tras: [
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "..............",
      "hj............",
    ],
  },
  {
    id: "raspado",
    nome: "Raspadinho",
    frente: [
      "..............",
      "....jjjjjj....",
      "..jjjjjjjjjj..",
      ".jjjjjjjjjjjj.",
      ".jj...........",
      ".j............",
    ],
  },
];

// ---------------------------------------------------------------------------
// Corpo por POSE (o pescoço encaixa embaixo da cabeça). Cada pose tem 2+ quadros.
// Em pé: torso 10 de largura posto em x=1; sentado: braço para a frente (na mesa).
// ---------------------------------------------------------------------------
export type PoseDoAvatar = "parado" | "andando" | "sentado" | "acenando" | "lendo";

const TORSO: Grade = [
  "...cccc...",
  "..cccccc..",
  ".cccccddc.",
  ".cccccddc.",
  ".cccccddc.",
  ".cccccddc.",
  ".ccccssdc.",
];

const QUADRIL: Grade = [".tttttttt."];

const PERNAS_PARADO: Grade = ["..ttt.ttt.", "..ttt.ttt.", "..qqq.qqqq"];
const PERNAS_PASSO_A: Grade = [".ttt...ttt", "ttt.....tt", "qqq....qqq"];
const PERNAS_PASSO_B: Grade = ["...tttt...", "...tttt...", "...qqqqq.."];

/** Torso com o braço levantado (acenar): a mão aparece ao lado da cabeça. */
const TORSO_ACENANDO_A: Grade = [
  "...cccc.ss",
  "..ccccccdd",
  ".cccccccd.",
  ".cccccccc.",
  ".cccccccc.",
  ".cccccccc.",
  ".cccccccc.",
];
const TORSO_ACENANDO_B: Grade = [
  "...cccc..ss",
  "..cccccc.d.",
  ".ccccccdd..",
  ".cccccccc..",
  ".cccccccc..",
  ".cccccccc..",
  ".cccccccc..",
];

/** Sentado: braço esticado para a frente, mão na mesa (2 quadros: escrevendo). */
const TORSO_SENTADO_A: Grade = [
  "...cccc.....",
  "..cccccc....",
  ".cccccccc...",
  ".cccccdddddd",
  ".cccccddddss",
  ".cccccccc...",
  ".cccccccc...",
];
const TORSO_SENTADO_B: Grade = [
  "...cccc.....",
  "..cccccc....",
  ".cccccccc...",
  ".cccccdddddd",
  ".cccccdddd.s",
  ".cccccccc...",
  ".cccccccc...",
];
/** Lendo: os dois braços seguram um livro na frente do peito. */
const TORSO_LENDO: Grade = [
  "...cccc.....",
  "..cccccc....",
  ".ccccccddd..",
  ".cccccccdss.",
  ".cccccccc...",
  ".cccccccc...",
  ".cccccccc...",
];

/** Sentado de lado: coxas para a frente (na cadeira) e canelas para baixo. */
const PERNAS_SENTADO: Grade = [
  ".tttttttttt.",
  ".tttttttttt.",
  ".......ttt..",
  ".......ttt..",
  ".......qqqqq",
];

export interface QuadroDoAvatar {
  torso: Grade;
  pernas: Grade;
  /** Cabeça desce 1 pixel (respirar / passo). */
  cabecaDy?: number;
  olhosFechados?: boolean;
}

export interface AnimacaoDoAvatar {
  id: PoseDoAvatar;
  codigo: string;
  nome: string;
  descricao: string;
  cicloMs: number;
  quadros: readonly QuadroDoAvatar[];
}

/** Em pé: o quadril vai embaixo do torso (completado com "." até a largura do torso). */
const emPe = (torso: Grade, pernas: Grade) => ({
  torso: [...torso, ...QUADRIL.map((l) => l.padEnd(torso[0]!.length, "."))],
  pernas,
});

export const POSES: readonly AnimacaoDoAvatar[] = [
  {
    id: "parado",
    codigo: "P1",
    nome: "Parado",
    descricao: "Respira e pisca de vez em quando.",
    cicloMs: 2400,
    quadros: [
      emPe(TORSO, PERNAS_PARADO),
      { ...emPe(TORSO, PERNAS_PARADO), cabecaDy: 1 },
      emPe(TORSO, PERNAS_PARADO),
      { ...emPe(TORSO, PERNAS_PARADO), olhosFechados: true },
    ],
  },
  {
    id: "andando",
    codigo: "P2",
    nome: "Andando",
    descricao: "Para entrar na sala e ir até a mesa.",
    cicloMs: 480,
    quadros: [emPe(TORSO, PERNAS_PASSO_A), { ...emPe(TORSO, PERNAS_PASSO_B), cabecaDy: 1 }],
  },
  {
    id: "sentado",
    codigo: "P3",
    nome: "Sentado estudando",
    descricao: "Na mesa da biblioteca, escrevendo (a mão mexe).",
    cicloMs: 900,
    quadros: [
      { torso: TORSO_SENTADO_A, pernas: PERNAS_SENTADO },
      { torso: TORSO_SENTADO_B, pernas: PERNAS_SENTADO },
    ],
  },
  {
    id: "lendo",
    codigo: "P4",
    nome: "Lendo",
    descricao: "Sentado, segurando um livro; pisca de vez em quando.",
    cicloMs: 2400,
    quadros: [
      { torso: TORSO_LENDO, pernas: PERNAS_SENTADO },
      { torso: TORSO_LENDO, pernas: PERNAS_SENTADO, olhosFechados: true },
    ],
  },
  {
    id: "acenando",
    codigo: "P5",
    nome: "Acenando",
    descricao: "Oi! (ao chegar na sala, ou quando alguém entra — na camada social).",
    cicloMs: 600,
    quadros: [emPe(TORSO_ACENANDO_A, PERNAS_PARADO), emPe(TORSO_ACENANDO_B, PERNAS_PARADO)],
  },
];

// ---------------------------------------------------------------------------
// Cores: pele, cabelo; roupas são paleta + (às vezes) um detalhe por cima.
// ---------------------------------------------------------------------------
export interface TomDePele {
  id: string;
  nome: string;
  s: string;
  z: string;
  b: string;
}

export const PELES: readonly TomDePele[] = [
  { id: "p1", nome: "Pele 1", s: "#fde3cf", z: "#eebfa2", b: "#f5a3a0" },
  { id: "p2", nome: "Pele 2", s: "#f3c9a5", z: "#dda47f", b: "#ec9388" },
  { id: "p3", nome: "Pele 3", s: "#e0a97e", z: "#c48760", b: "#dc7f6c" },
  { id: "p4", nome: "Pele 4", s: "#c68a5f", z: "#a56d47", b: "#c56a55" },
  { id: "p5", nome: "Pele 5", s: "#9a6440", z: "#7d4e31", b: "#a8513f" },
  { id: "p6", nome: "Pele 6", s: "#6e442a", z: "#56331f", b: "#83402f" },
];

export interface CorDeCabelo {
  id: string;
  nome: string;
  h: string;
  j: string;
}

export const CORES_DE_CABELO: readonly CorDeCabelo[] = [
  { id: "preto", nome: "Preto", h: "#2f2a33", j: "#1e1a22" },
  { id: "castanho", nome: "Castanho", h: "#6b4228", j: "#4e2f1c" },
  { id: "loiro", nome: "Loiro", h: "#e8c46a", j: "#c9a04a" },
  { id: "ruivo", nome: "Ruivo", h: "#c45a2c", j: "#9c4220" },
  { id: "grisalho", nome: "Grisalho", h: "#c9ccd2", j: "#a2a6ae" },
  { id: "rosa", nome: "Rosa", h: "#f08ab4", j: "#cf6b95" },
  { id: "azul", nome: "Azul", h: "#5b8fe0", j: "#3f6fbf" },
  { id: "verde", nome: "Verde", h: "#57b38a", j: "#3d9170" },
];

export interface Roupa {
  id: string;
  nome: string;
  cores: { c: string; d: string; t: string; q: string; w?: string };
  /** Detalhe desenhado por cima do torso (gola, zíper…), na posição do torso em pé. */
  detalhe?: Grade;
}

export const ROUPAS: readonly Roupa[] = [
  {
    id: "moletom",
    nome: "Moletom",
    cores: { c: "#7d6be0", d: "#6150c0", t: "#3b4a6b", q: "#2b2b36", w: "#f4f1ea" },
    detalhe: ["...dddd...", "..d....d..", ".....w....", ".....w...."],
  },
  {
    id: "camiseta",
    nome: "Camiseta",
    cores: { c: "#e85d75", d: "#c94660", t: "#4a5f8a", q: "#f4f1ea" },
  },
  {
    id: "social",
    nome: "Camisa social",
    cores: { c: "#f4f1ea", d: "#d6d1c4", t: "#3a3a46", q: "#4a2e1f", w: "#4f8fd8" },
    detalhe: ["...w..w...", "....ww....", ".....w....", ".....w...."],
  },
  {
    id: "uniforme",
    nome: "Uniforme escolar",
    cores: { c: "#f4f1ea", d: "#d6d1c4", t: "#2f5fae", q: "#2b2b36", w: "#2f5fae" },
    detalhe: ["..........", "..........", ".ww.......", ".ww......."],
  },
  {
    id: "jaleco",
    nome: "Jaleco",
    cores: { c: "#fbfbf8", d: "#dcdcd6", t: "#4a7a6a", q: "#2b2b36", w: "#8aa0b8" },
    detalhe: ["....ww....", ".....w....", ".....w....", ".....w...."],
  },
  {
    id: "listrada",
    nome: "Blusa listrada",
    cores: { c: "#f2c33a", d: "#d6a416", t: "#5a4636", q: "#2b2b36", w: "#3b4a6b" },
    detalhe: ["..........", "..........", ".wwwww....", "..........", ".wwwww...."],
  },
];

// ---------------------------------------------------------------------------
// Acessórios do avatar (na cabeça), com posição relativa à cabeça.
// ---------------------------------------------------------------------------
export interface AcessorioDoAvatar {
  id: string;
  nome: string;
  grade: Grade;
  x: number;
  y: number;
}

export const ACESSORIOS_DO_AVATAR: readonly AcessorioDoAvatar[] = [
  {
    id: "oculos",
    nome: "Óculos",
    // Só a armação: cada olho aparece dentro da sua lente, com a ponte no meio.
    grade: ["k.kkkk.k", "k.k..k.k", "kkk..kkk"],
    x: 2,
    y: 5,
  },
  {
    id: "fone",
    nome: "Fone de ouvido",
    // Arco apoiado no cabelo e conchas na altura das orelhas (dos dois lados da cabeça).
    grade: [
      "...kkkkkkkk...",
      "..k........k..",
      ".k..........k.",
      ".k..........k.",
      "rr..........rr",
      "rr..........rr",
      "rr..........rr",
    ],
    x: -1,
    y: -1,
  },
  {
    id: "bone",
    nome: "Boné",
    grade: ["...aaaaaa.....", "..aaaaaaaa....", ".aaaaaaaaaaaaa"],
    x: 0,
    y: -2,
  },
  {
    id: "gorro",
    nome: "Gorro",
    grade: ["....nnnn....", "..nnnnnnnn..", ".nnnnnnnnnn.", "nwnwnwnwnwnw"],
    x: 0,
    y: -3,
  },
  {
    id: "laco",
    nome: "Laço",
    grade: ["rr.rr", "rrkrr", "rr.rr"],
    x: 8,
    y: -1,
  },
];

/** A paleta do avatar a partir das escolhas (pele, cabelo, roupa). */
export function paletaDoAvatar(pele: TomDePele, cabelo: CorDeCabelo, roupa: Roupa): Paleta {
  return {
    s: pele.s,
    z: pele.z,
    b: pele.b,
    e: "#2b1a14",
    m: "#8a2a35",
    h: cabelo.h,
    j: cabelo.j,
    ...roupa.cores,
  };
}
