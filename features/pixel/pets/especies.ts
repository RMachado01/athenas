/**
 * Arte dos pets do Athenas, feita à mão em código (licença limpa, estilo próprio): contorno
 * grosso, poucas cores, 4 espécies. Cada pet é montado por PEÇAS (cabeça, corpo, pernas, rabo)
 * em grades de letras; poucos desenhos geram todos os movimentos (ver animacoes.ts).
 *
 * Só se desenha o PREENCHIMENTO: o contorno escuro (o) é posto sozinho pelo motor.
 * Letras: b base · s sombra · l luz · p rosa · e olho · d escuro (focinho) · x/y/t banana.
 * Todos os pets olham para a DIREITA; para andar à esquerda a tela espelha com CSS.
 */
import type { Grade, Paleta } from "../motor";

export type Especie = "gato" | "capivara" | "macaco" | "gato_banana";
export const ESPECIES: readonly Especie[] = ["gato", "capivara", "macaco", "gato_banana"];

export interface Ponto {
  x: number;
  y: number;
}

export interface Molde {
  cabeca: Grade;
  cabecaFechada: Grade;
  corpo: Grade;
  pernasA?: Grade;
  pernasB?: Grade;
  rabo1?: Grade;
  rabo2?: Grade;
  /** Posições das peças em pé (origem arbitrária; o motor acha o tamanho da tela sozinho). */
  em_pe: { corpo: Ponto; cabeca: Ponto; pernas: Ponto; rabo: Ponto };
  /** Posições das peças dormindo (sem pernas, mais baixo, com a cabeça descansando). */
  dormindo: { corpo: Ponto; cabeca: Ponto; rabo: Ponto };
}

// ---------------------------------------------------------------------------
// GATO — cabeça de frente, corpo de lado, rabo que balança
// ---------------------------------------------------------------------------
/** Cabeça de gato "neutra" (sem sombra de pescoço): usada no gato-banana. */
export const CABECA_DE_GATO: Grade = [
  ".b........b.",
  "bpb......bpb",
  "bbbbbbbbbbbb",
  "bbbbbbbbbbbb",
  "bbbebbbbebbb",
  "bbbebbbbebbb",
  "bbbblpplbbbb",
  ".bbbbbbbbbb.",
];

export const CABECA_DE_GATO_FECHADA: Grade = [
  ".b........b.",
  "bpb......bpb",
  "bbbbbbbbbbbb",
  "bbbbbbbbbbbb",
  "bbbbbbbbbbbb",
  "bbeeebbeeebb",
  "bbbblpplbbbb",
  ".bbbbbbbbbb.",
];

/** Sombra no queixo e no lado de trás da cabeça: separa a cabeça do corpo (mesma cor). */
export const sombrearPescoco = (g: Grade): Grade =>
  g.map((linha, j) =>
    j === 7 ? linha.replaceAll("b", "s") : j >= 3 ? `s${linha.slice(1)}` : linha,
  );

const GATO: Molde = {
  cabeca: sombrearPescoco(CABECA_DE_GATO),
  cabecaFechada: sombrearPescoco(CABECA_DE_GATO_FECHADA),
  corpo: [
    "..bbbbbbbbbb..",
    ".bbbbbbbbbbbb.",
    "bbbbbbbbbbbbbb",
    "bbbbbbbbbbbbbb",
    "bbllllllllllbb",
    ".bbbbbbbbbbbb.",
    "..bbssssssbb..",
  ],
  // Patas grossas e curtas, sempre EMBAIXO da barriga. A 1ª linha delas fica por cima da última
  // linha do corpo (sobreposta), então nunca abre uma faixa de contorno entre corpo e pata.
  // A = patas apoiadas e separadas; B = pares se cruzando (o passo).
  pernasA: Array(3).fill(".bb.bb..bb.bb."),
  pernasB: Array(3).fill("..bbbb..bbbb.."),
  rabo1: ["b....", "b....", "b....", "bb...", ".bb..", "..bbb"],
  rabo2: [".b...", ".b...", "bb...", "b....", "bbb..", "..bbb"],
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 10, y: -3 },
    pernas: { x: 0, y: 6 },
    rabo: { x: -4, y: -1 },
  },
  dormindo: {
    corpo: { x: 0, y: 2 },
    cabeca: { x: 10, y: -1 },
    rabo: { x: -4, y: 1 },
  },
};

// ---------------------------------------------------------------------------
// CAPIVARA — corpo largo e baixo, focinho comprido, calma
// ---------------------------------------------------------------------------
const CAPIVARA: Molde = {
  cabeca: [
    "...bb.....",
    "..bbbbbb..",
    ".sbbbbbbbb",
    "sbbbbebbbd",
    "sbbbbbbbdd",
    "sbbbbbbbbd",
    ".sbbbbbbb.",
  ],
  cabecaFechada: [
    "...bb.....",
    "..bbbbbb..",
    ".sbbbbbbbb",
    "sbbbeeebbd",
    "sbbbbbbbdd",
    "sbbbbbbbbd",
    ".sbbbbbbb.",
  ],
  corpo: [
    "..bbbbbbbbbbb..",
    ".bbbbbbbbbbbbb.",
    "bbbbbbbbbbbbbbb",
    "bbbbbbbbbbbbbbb",
    "bbbbbbbbbbbbbbb",
    "bbsssssssssbbbb",
    ".bbbbbbbbbbbbb.",
    "..bbbbbbbbbbb..",
  ],
  pernasA: Array(3).fill(".bb.bb...bb.bb."),
  pernasB: Array(3).fill("..bbbb...bbbb.."),
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 11, y: 0 },
    pernas: { x: 0, y: 7 },
    rabo: { x: 0, y: 0 },
  },
  dormindo: {
    corpo: { x: 0, y: 2 },
    cabeca: { x: 11, y: 3 },
    rabo: { x: 0, y: 0 },
  },
};

// ---------------------------------------------------------------------------
// MACACO — cabeça redonda com máscara clara, rabo enrolado
// ---------------------------------------------------------------------------
const MACACO: Molde = {
  cabeca: [
    "..bbbbbbbb..",
    ".bbbbbbbbbb.",
    "bbbbbbbbbbbb",
    "lbbllllllbbl",
    "lbllellellbl",
    "lblllddlllbl",
    ".bllllllllb.",
    "..bbllllbb..",
    "....bbbb....",
  ],
  cabecaFechada: [
    "..bbbbbbbb..",
    ".bbbbbbbbbb.",
    "bbbbbbbbbbbb",
    "lbbllllllbbl",
    "lbleelleelbl",
    "lblllddlllbl",
    ".bllllllllb.",
    "..bbllllbb..",
    "....bbbb....",
  ],
  corpo: [
    "..bbbbbbbb..",
    ".bbbbbbbbbb.",
    "bbbbbbbbbbbb",
    "bbbbbbbbbbbb",
    "bbllllllllbb",
    "bbbbbbbbbbbb",
    ".bbbbbbbbbb.",
  ],
  pernasA: Array(3).fill(".bb.bb.bb.bb"),
  pernasB: Array(3).fill("..bbbb.bbbb."),
  rabo1: [".bb..", "b..b.", "b..b.", "...b.", "..b..", ".b...", "bb...", "bb..."],
  rabo2: ["..bb.", ".b..b", ".b..b", "....b", "...b.", "..b..", "bb...", "bb..."],
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 0, y: -7 },
    pernas: { x: 0, y: 6 },
    rabo: { x: 11, y: -1 },
  },
  dormindo: {
    corpo: { x: 0, y: 2 },
    cabeca: { x: 0, y: -2 },
    rabo: { x: 11, y: 1 },
  },
};

// ---------------------------------------------------------------------------
// GATO-BANANA — um gatinho dentro de uma fantasia de banana
// ---------------------------------------------------------------------------
const BANANA: Molde = {
  // A "cabeça" é a mesma cabeça de gato; a "banana" é o corpo.
  cabeca: CABECA_DE_GATO,
  cabecaFechada: CABECA_DE_GATO_FECHADA,
  corpo: [
    "......tt......",
    "....xxxxxx....",
    "...xxxxxxxx...",
    "..xxxxxxxxxx..",
    ".xxxxxxxxxxxx.",
    ".xxxxxxxxxxxx.",
    "xxxxxxxxxxxxxx",
    "xxyxxxxxxxxyxx",
    "xxyxxxxxxxxyxx",
    "xxyxxxxxxxxyxx",
    ".xxyxxxxxxyxx.",
    ".xxyxxxxxxyxx.",
    "..xxyxxxxyxx..",
    "...xxyyyyxx...",
    "....xxxxxx....",
  ],
  pernasA: Array(3).fill("...bb....bb..."),
  pernasB: Array(3).fill("....bb.bb....."),
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 1, y: 2 },
    pernas: { x: 0, y: 14 },
    rabo: { x: 0, y: 0 },
  },
  dormindo: {
    corpo: { x: 0, y: 2 },
    cabeca: { x: 1, y: 4 },
    rabo: { x: 0, y: 0 },
  },
};

const MOLDES: Record<Especie, Molde> = {
  gato: GATO,
  capivara: CAPIVARA,
  macaco: MACACO,
  gato_banana: BANANA,
};

/** O molde (peças e posições) de uma espécie: base para animações e acessórios novos. */
export function moldeDe(especie: Especie): Molde {
  return MOLDES[especie];
}

/** Todas as grades de uma espécie (para os testes conferirem tamanho e letras). */
export function gradesDaEspecie(especie: Especie): Record<string, Grade> {
  const m = MOLDES[especie];
  const grades: Record<string, Grade | undefined> = {
    cabeca: m.cabeca,
    cabecaFechada: m.cabecaFechada,
    corpo: m.corpo,
    pernasA: m.pernasA,
    pernasB: m.pernasB,
    rabo1: m.rabo1,
    rabo2: m.rabo2,
  };
  return Object.fromEntries(Object.entries(grades).filter(([, g]) => g !== undefined)) as Record<
    string,
    Grade
  >;
}

export type { Paleta };
