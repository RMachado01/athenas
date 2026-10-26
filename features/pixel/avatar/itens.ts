/**
 * CABELOS e ITENS do avatar RPG (rodada 2 de conceitos). Cada item ocupa uma PARTE (slot) e
 * usa letras maiúsculas só suas, para não colidir com as de outra parte na mesma paleta:
 *   cabeça A–F · rosto G–I · blusa J–L · pernas M–N · pés O · costas P–T · mão U–Z
 * Blusa, pernas e pés também RECOLOREM as letras do corpo (c/f/d, t/n/p, q/g/r).
 * Posições são relativas à cabeça (origem do avatar).
 */
import type { Grade, Paleta } from "../motor";
import type { Ponto } from "./corpo";

// ---------------------------------------------------------------------------
// Cabelos (20 de largura, postos em x=-1). Os olhos ficam livres (ver teste).
// ---------------------------------------------------------------------------
export interface Cabelo {
  id: string;
  nome: string;
  frente: Grade;
  frenteEm: Ponto;
  tras?: Grade;
}

const TOPO_CURTO: Grade = [
  "......hhhhhhh.......",
  "....hhhhhllhhhh.....",
  "...hhhhhlllhhhhhh...",
  "..hhhhhhhhhhhhhhhh..",
  ".hhhhhhhhhhhhhhhhhh.",
  ".hjhhhhhhhhhhhhhhhh.",
  "hhjhhhhhhhhhhhhhhhhh",
];

export const CABELOS: readonly Cabelo[] = [
  {
    id: "curto",
    nome: "Curtinho",
    frenteEm: { x: -1, y: -2 },
    frente: [
      ...TOPO_CURTO,
      "hjjhhhhhhjhhhhjhhhh.",
      "hjjhhhh..hhh...hhh..",
      "hjjj................",
      "hjj.................",
      ".jj.................",
    ],
  },
  {
    id: "franja",
    nome: "Franjinha reta",
    frenteEm: { x: -1, y: -2 },
    frente: [
      ...TOPO_CURTO,
      "hjjhhhhhhhhhhhhhhhh.",
      "hjjhhhhhhhhhhhhhhhh.",
      "hjjj............hhh.",
      "hjjj............hhh.",
      "hjj.............hh..",
      ".jj.................",
    ],
  },
  {
    id: "longo",
    nome: "Comprido",
    frenteEm: { x: -1, y: -2 },
    frente: [
      ...TOPO_CURTO,
      "hjjhhhhhhjhhhhjhhhh.",
      "hjjhhhh..hhh...hhhh.",
      "hjjj............hhh.",
      "hjjj............hhj.",
      "hjjj.............hj.",
      "hjj..............hj.",
    ],
    tras: [
      ...Array<string>(8).fill("...................."),
      "hhjj................",
      "hhjj................",
      "hhjj................",
      "hhjj................",
      "hhjjj...............",
      "hhjjj...............",
      ".hhjj...............",
      ".hhjj...............",
      ".hhjj...............",
      "..hjj...............",
      "..hjj...............",
      "...jj...............",
    ],
  },
  {
    id: "rabo",
    nome: "Rabo de cavalo",
    frenteEm: { x: -1, y: -2 },
    frente: [
      ...TOPO_CURTO,
      "hjjhhhhhhhhhhhjhhhh.",
      "hjjhhhh..hhh...hhh..",
      "hjjj................",
      "hjj.................",
    ],
    tras: [
      "....................",
      "....................",
      "....................",
      "hh..................",
      "hhj.................",
      "hhjj................",
      "lhjj................",
      "hhjj................",
      ".hjj................",
      ".hjj................",
      ".hhj................",
      "..hj................",
      "..jj................",
    ],
  },
  {
    id: "coque",
    nome: "Coque",
    frenteEm: { x: -1, y: -5 },
    frente: [
      "......hhhh..........",
      ".....hhllhh.........",
      ".....hhhhhh.........",
      ...TOPO_CURTO,
      "hjjhhhhhhhhhhhjhhhh.",
      "hjjhhhh.........hh..",
      "hjjj................",
      "hjj.................",
    ],
  },
  {
    id: "cacheado",
    nome: "Cacheado volumoso",
    frenteEm: { x: -1, y: -2 },
    frente: [
      "..hh.hhh.hhh.hh.....",
      ".hhhhhhhhhhhhhhhh...",
      "hhhhhlhhhhlhhhhhhh..",
      "hhhhhhhhhhhhhhhhhhh.",
      "hhjhhhhhhhhhhhhhhhhh",
      "hjjhhhhhhhhhhhhhhhhh",
      "hjjhhhhhhhhhhhhhhhhh",
      "hjjhhhhhhhhhhhhhhhhh",
      "hjjhhhh.hhh.hhhhhhhh",
      "hjjj............hhhh",
      "hjjj............hhhj",
      "hjjj.............hhj",
      ".jjj.............hj.",
    ],
  },
];

export interface CorDeCabelo {
  id: string;
  nome: string;
  l: string;
  h: string;
  j: string;
}

export const CORES_DE_CABELO: readonly CorDeCabelo[] = [
  { id: "preto", nome: "Preto", l: "#4a4452", h: "#2f2a33", j: "#1c1820" },
  { id: "castanho", nome: "Castanho", l: "#8a5a38", h: "#6b4228", j: "#4a2c19" },
  { id: "loiro", nome: "Loiro", l: "#f5dc8c", h: "#e3bd5c", j: "#bf963b" },
  { id: "ruivo", nome: "Ruivo", l: "#e07a45", h: "#c45a2c", j: "#963e1b" },
  { id: "grisalho", nome: "Grisalho", l: "#e6e8ec", h: "#c3c7ce", j: "#9a9ea7" },
  { id: "rosa", nome: "Rosa", l: "#ffb3d1", h: "#f08ab4", j: "#c9628e" },
  { id: "azul", nome: "Azul", l: "#8db4f2", h: "#5b8fe0", j: "#3d6cbd" },
  { id: "verde", nome: "Verde", l: "#8fd6b2", h: "#57b38a", j: "#3a8c69" },
];

// ---------------------------------------------------------------------------
// Itens por parte
// ---------------------------------------------------------------------------
export type Parte = "cabeca" | "rosto" | "blusa" | "pernas" | "pes" | "costas" | "mao";

export interface Item {
  id: string;
  nome: string;
  parte: Parte;
  /** Cores das letras deste item (maiúsculas e/ou as letras do corpo que ele recolore). */
  cores: Paleta;
  /** Desenho do item e onde ele fica (relativo à cabeça). Pés e algumas blusas não têm. */
  grade?: Grade;
  em?: Ponto;
  /** Item da mão: qual célula do desenho fica em cima da mão. */
  ancora?: Ponto;
  /** Blusa: detalhe pintado por cima do torso (só onde já há roupa). */
  detalheDoTorso?: Grade;
  /** Blusa de manga curta: o braço vira pele do cotovelo para baixo. */
  mangaCurta?: boolean;
  /** Pernas: a partir de qual linha a perna vira pele (bermuda, saia). */
  peleDesdeALinha?: number;
  /** Pés: botas cobrem também a última linha da canela. */
  cano?: boolean;
}

export const ITENS: readonly Item[] = [
  // ----- cabeça (A–F) -----
  {
    id: "mago",
    nome: "Chapéu de mago",
    parte: "cabeca",
    cores: { A: "#6d4fc7", B: "#5a3fb0", C: "#3f2b85", D: "#f2c33a" },
    em: { x: -2, y: -9 },
    grade: [
      "...AA.................",
      "...AAA................",
      "....AAAA..............",
      ".....AAAAA............",
      ".....AAAAAA...........",
      "....AAAAAAAAA.........",
      "....AAAAAAAAAAA.......",
      "...AAAAAAADAAAAA......",
      "..AAAAAAADDDAAAAAA....",
      "..AAAAAAAADAAAAAAAA...",
      "BBBBBBBBBBBBBBBBBBBBBB",
      ".CCCCCCCCCCCCCCCCCCCC.",
    ],
  },
  {
    id: "bone",
    nome: "Boné",
    parte: "cabeca",
    cores: { A: "#3f7fd8", B: "#2c5fae", C: "#f4f1ea" },
    em: { x: -1, y: -2 },
    grade: [
      "....AAAAAAAA........",
      "..AAAAAAAAAAAA......",
      ".AAAAAACCAAAAAA.....",
      ".AAAAAAAAAAAAAABBBBB",
    ],
  },
  {
    id: "louros",
    nome: "Coroa de louros",
    parte: "cabeca",
    cores: { E: "#5aa84f", F: "#3d7f37" },
    em: { x: -1, y: 2 },
    grade: [".EF.EF.EF.EF.EF.EF..", "EFFEFFEFFEFFEFFEFFE."],
  },
  {
    id: "gorro",
    nome: "Gorro de lã",
    parte: "cabeca",
    cores: { A: "#e8643c", B: "#c94e2a", C: "#f4d8c8", F: "#f7f3ea" },
    em: { x: -1, y: -4 },
    grade: [
      ".........FF.........",
      "........FFFF........",
      "......AAAAAAAA......",
      "...AAAAAAAAAAAAAA...",
      "..AAAAAAAAAAAAAAAA..",
      ".AAAAAAAAAAAAAAAAAA.",
      ".BBBBBBBBBBBBBBBBBB.",
      ".BCBCBCBCBCBCBCBCBB.",
    ],
  },
  // ----- rosto (G–I) -----
  {
    id: "oculos",
    nome: "Óculos redondos",
    parte: "rosto",
    cores: { G: "#2b2230" },
    em: { x: 1, y: 6 },
    grade: [
      "......GGGG.GGGG",
      "GGGGGGG..GGG..G",
      "......G..G.G..G",
      "......G..G.G..G",
      "......GGGG.GGGG",
    ],
  },
  {
    id: "oculos_sol",
    nome: "Óculos escuros",
    parte: "rosto",
    cores: { G: "#2b2230", H: "#273042", I: "#9fb4d6" },
    em: { x: 1, y: 6 },
    grade: [
      "......GGGG.GGGG",
      "GGGGGGGIHGGGIHG",
      "......GHHG.GHHG",
      "......GHHG.GHHG",
      "......GGGG.GGGG",
    ],
  },
  // ----- blusa (recolore c/f/d; detalhes J–L) -----
  {
    id: "moletom",
    nome: "Moletom com capuz",
    parte: "blusa",
    cores: { f: "#9a8af0", c: "#7d6be0", d: "#5b49bf", J: "#6a58cf", K: "#f4f1ea" },
    em: { x: 1, y: 12 },
    grade: [".JJJ.", "JJJJJ", "JJJ.."],
    detalheDoTorso: [
      "............",
      "......K.....",
      "......K.....",
      "......K.....",
      "......K.....",
    ],
  },
  {
    id: "tunica",
    nome: "Túnica de aprendiz",
    parte: "blusa",
    cores: { f: "#7cc48a", c: "#4f9a5d", d: "#367a44", J: "#7a4a2a", K: "#f2c33a" },
    detalheDoTorso: [
      "............",
      "............",
      "............",
      "............",
      "............",
      "............",
      "JJJJJJKJJJJJ",
      "KKKKKKKKKKKK",
    ],
  },
  {
    id: "jaleco",
    nome: "Jaleco",
    parte: "blusa",
    cores: { f: "#ffffff", c: "#eef0f2", d: "#c9ced6", J: "#9aa5b4", K: "#4f8fd8" },
    detalheDoTorso: [
      "............",
      "....J.J.....",
      ".....J......",
      ".....J..KK..",
      ".....J......",
    ],
  },
  {
    id: "camiseta",
    nome: "Camiseta",
    parte: "blusa",
    cores: { f: "#ff8a9e", c: "#e85d75", d: "#c2435a" },
    mangaCurta: true,
  },
  {
    id: "armadura",
    nome: "Armadura de cavaleiro",
    parte: "blusa",
    cores: { f: "#e6eaf0", c: "#b8c0cc", d: "#848e9c", J: "#f7f9fc", K: "#c9a23a" },
    detalheDoTorso: [
      "............",
      "............",
      "..J...J.....",
      "............",
      ".KKKKKKKKK..",
      "............",
      "..J...J.....",
      "............",
    ],
  },
  // ----- pernas (recolore t/n/p; detalhes M–N) -----
  {
    id: "calca",
    nome: "Calça jeans",
    parte: "pernas",
    cores: { n: "#6f8fc8", t: "#4a68a3", p: "#344c7d" },
  },
  {
    id: "bermuda",
    nome: "Bermuda",
    parte: "pernas",
    cores: { n: "#c9b28a", t: "#a8916a", p: "#86714f" },
    peleDesdeALinha: 3,
  },
  {
    id: "saia",
    nome: "Saia",
    parte: "pernas",
    cores: { n: "#f2a0c0", t: "#d97aa0", p: "#b85a80" },
    peleDesdeALinha: 2,
  },
  {
    id: "aventureiro",
    nome: "Calça de aventureiro",
    parte: "pernas",
    cores: { n: "#a0805c", t: "#7f6243", p: "#5e4630" },
  },
  // ----- pés (recolore q/g/r) -----
  {
    id: "tenis",
    nome: "Tênis",
    parte: "pes",
    cores: { g: "#ffffff", q: "#e9ecf0", r: "#e85d75" },
  },
  {
    id: "botas",
    nome: "Botas",
    parte: "pes",
    cores: { g: "#a8744a", q: "#7a4f2e", r: "#56351c" },
    cano: true,
  },
  {
    id: "sapatilha",
    nome: "Sapatilha",
    parte: "pes",
    cores: { g: "#ffc1d6", q: "#f08ab4", r: "#c9628e" },
  },
  // ----- costas (P–T) -----
  {
    id: "mochila",
    nome: "Mochila",
    parte: "costas",
    cores: { P: "#e8a33c", Q: "#c9842a", R: "#f6d08a" },
    em: { x: 0, y: 15 },
    grade: [".PPPP", "PPRRP", "PPRRP", "PPPPP", "PQQPP", "PQQPP", "PPPPP", ".QQQ."],
  },
  {
    id: "capa",
    nome: "Capa de herói",
    parte: "costas",
    cores: { P: "#e85d5d", Q: "#c43e3e", R: "#962828" },
    em: { x: 0, y: 14 },
    grade: [
      "..PPP",
      ".PPPQ",
      ".PPQQ",
      "PPPQQ",
      "PPQQQ",
      "PPQQR",
      "PQQQR",
      "PQQRR",
      "QQQRR",
      "QQRRR",
      "QRRR.",
      "RRR..",
    ],
  },
  {
    id: "asas",
    nome: "Asas de borboleta",
    parte: "costas",
    cores: { P: "#a8e0f0", Q: "#6fc0dd", S: "#f7f3ea" },
    em: { x: -4, y: 12 },
    grade: [
      "PPP......",
      "PSPP.....",
      "PPPPP....",
      ".PQPPP...",
      "..PPPP...",
      ".PPQP....",
      "PPSP.....",
      "PPP......",
    ],
  },
  // ----- mão (U–Z) -----
  {
    id: "livro",
    nome: "Livro",
    parte: "mao",
    cores: { U: "#3f6fbf", V: "#f7f3ea", W: "#2c5096" },
    ancora: { x: 1, y: 3 },
    grade: ["UUUUU.", "UVVVVU", "UVVVVU", "WUUUUU"],
  },
  {
    id: "lapis",
    nome: "Lápis gigante",
    parte: "mao",
    cores: { U: "#f2c33a", V: "#f6a0b0", W: "#e8c9a0", X: "#2b2230" },
    ancora: { x: 1, y: 3 },
    grade: ["....V", "...UV", "..UU.", ".UU..", "WU...", "X...."],
  },
  {
    id: "varinha",
    nome: "Varinha mágica",
    parte: "mao",
    cores: { U: "#7a4a2a", Y: "#f2c33a", Z: "#fff3b0" },
    ancora: { x: 1, y: 4 },
    grade: ["..YZY", "...Y.", "..U..", ".U...", "U...."],
  },
  {
    id: "caneca",
    nome: "Caneca de café",
    parte: "mao",
    cores: { U: "#e85d75", V: "#f7f3ea", X: "#5a3a22" },
    ancora: { x: 0, y: 2 },
    grade: [".V.V.", "UXXXU.", "UUUUUU", "UUUUU.", ".UUU.."].map((l) => l.padEnd(6, ".")),
  },
];

export const ROTULO_DA_PARTE: Record<Parte, string> = {
  cabeca: "Cabeça",
  rosto: "Rosto",
  blusa: "Blusa",
  pernas: "Pernas",
  pes: "Pés",
  costas: "Costas",
  mao: "Mão",
};
