/**
 * Arte dos pets do Athenas, feita à mão em código (licença limpa, estilo próprio): contorno
 * grosso, poucas cores, 4 espécies. Cada pet é montado por PEÇAS (cabeça, corpo, pernas, rabo)
 * em grades de letras; poucos desenhos geram parado, andando, dormindo e feliz.
 *
 * Só se desenha o PREENCHIMENTO: o contorno escuro (o) é posto sozinho pelo motor.
 * Letras: b base · s sombra · l luz · p rosa · e olho · d escuro (focinho) · x/y/t banana.
 * Todos os pets olham para a DIREITA; para andar à esquerda a tela espelha com CSS.
 */
import { componer, contornar, type Camada, type Grade, type Paleta } from "../motor";

export type Especie = "gato" | "capivara" | "macaco" | "gato_banana";
export type EstadoDoPet = "parado" | "andando" | "dormindo" | "feliz";

export const ESTADOS_DO_PET: readonly EstadoDoPet[] = ["parado", "andando", "dormindo", "feliz"];
export const ESPECIES: readonly Especie[] = ["gato", "capivara", "macaco", "gato_banana"];

interface Ponto {
  x: number;
  y: number;
}

interface Molde {
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
const CABECA_DE_GATO: Grade = [
  ".b........b.",
  "bpb......bpb",
  "bbbbbbbbbbbb",
  "bbbbbbbbbbbb",
  "bbbebbbbebbb",
  "bbbebbbbebbb",
  "bbbblpplbbbb",
  ".bbbbbbbbbb.",
];

const CABECA_DE_GATO_FECHADA: Grade = [
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
const sombrearPescoco = (g: Grade): Grade =>
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
  pernasA: Array(3).fill(".bb..bb..bb.bb"),
  pernasB: Array(3).fill("bb..bb..bb..bb"),
  rabo1: ["b....", "b....", "b....", "bb...", ".bb..", "..bbb"],
  rabo2: [".b...", ".b...", "bb...", "b....", "bbb..", "..bbb"],
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 10, y: -3 },
    pernas: { x: 0, y: 7 },
    rabo: { x: -4, y: -1 },
  },
  dormindo: {
    corpo: { x: 0, y: 3 },
    cabeca: { x: 10, y: 0 },
    rabo: { x: -4, y: 2 },
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
  pernasA: Array(2).fill(".bb..bb..bb..bb"),
  pernasB: Array(2).fill("bb..bb..bb..bb."),
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 11, y: 0 },
    pernas: { x: 0, y: 8 },
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
    ".bbbbbbbbbb.",
    "..bbbbbbbb..",
  ],
  pernasA: Array(3).fill(".bb.bb.bb.bb"),
  pernasB: Array(3).fill("bb.bb.bb.bb."),
  rabo1: [".bb..", "b..b.", "b..b.", "...b.", "..b..", ".b...", "bb...", "bb..."],
  rabo2: ["..bb.", ".b..b", ".b..b", "....b", "...b.", "..b..", "bb...", "bb..."],
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 0, y: -7 },
    pernas: { x: 0, y: 7 },
    rabo: { x: 11, y: -1 },
  },
  dormindo: {
    corpo: { x: 0, y: 3 },
    cabeca: { x: 0, y: -1 },
    rabo: { x: 11, y: 2 },
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
  pernasA: Array(2).fill("..bb......bb.."),
  pernasB: Array(2).fill("...bb....bb..."),
  em_pe: {
    corpo: { x: 0, y: 0 },
    cabeca: { x: 1, y: 2 },
    pernas: { x: 0, y: 15 },
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

// ---------------------------------------------------------------------------
// Montagem dos quadros
// ---------------------------------------------------------------------------
interface Pose {
  estado: EstadoDoPet;
  /** Qual dos quadros do ciclo (0 ou 1). */
  fase: 0 | 1;
}

/** Peças de um quadro, com posições relativas à origem do molde (podem ser negativas). */
function camadasDaPose(m: Molde, { estado, fase }: Pose): Camada[] {
  const camadas: Camada[] = [];
  const deitado = estado === "dormindo";
  const base = deitado ? m.dormindo : m.em_pe;
  // Andando: no 2º quadro o corpo sobe 1 pixel (o "trote"). Dormindo: a cabeça "respira".
  const sobe = estado === "andando" && fase === 1 ? -1 : 0;
  const respira = deitado && fase === 1 ? -1 : 0;
  // Quem não tem rabo para balançar "respira": a cabeça desce 1 pixel no 2º quadro (parado/feliz).
  const inspira = !deitado && estado !== "andando" && fase === 1 && !m.rabo1 ? 1 : 0;
  const olhosFechados = deitado || estado === "feliz";
  const rabo = fase === 0 ? m.rabo1 : m.rabo2;

  if (rabo) camadas.push({ grade: rabo, x: base.rabo.x, y: base.rabo.y + sobe });
  camadas.push({ grade: m.corpo, x: base.corpo.x, y: base.corpo.y + sobe });
  if (!deitado && m.pernasA) {
    const pernas = estado === "andando" && fase === 1 ? (m.pernasB ?? m.pernasA) : m.pernasA;
    camadas.push({ grade: pernas, x: m.em_pe.pernas.x, y: m.em_pe.pernas.y });
  }
  camadas.push({
    grade: olhosFechados ? m.cabecaFechada : m.cabeca,
    x: base.cabeca.x,
    y: base.cabeca.y + sobe + respira + inspira,
  });
  return camadas;
}

const POSES: readonly Pose[] = ESTADOS_DO_PET.flatMap((estado) =>
  ([0, 1] as const).map((fase) => ({ estado, fase })),
);

/** Caixa que cobre todas as poses (+1 pixel de margem para o contorno). */
function caixaDaEspecie(m: Molde) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const pose of POSES) {
    for (const c of camadasDaPose(m, pose)) {
      x0 = Math.min(x0, c.x);
      y0 = Math.min(y0, c.y);
      x1 = Math.max(x1, c.x + (c.grade[0]?.length ?? 0));
      y1 = Math.max(y1, c.y + c.grade.length);
    }
  }
  return { x0: x0 - 1, y0: y0 - 1, largura: x1 - x0 + 2, altura: y1 - y0 + 2 };
}

const cache = new Map<string, string[][]>();

/** Os quadros (já com contorno) de um estado do pet. Todos têm o mesmo tamanho na espécie. */
export function quadrosDoPet(especie: Especie, estado: EstadoDoPet): string[][] {
  const chave = `${especie}:${estado}`;
  const guardado = cache.get(chave);
  if (guardado) return guardado;
  const m = MOLDES[especie];
  const caixa = caixaDaEspecie(m);
  const quadros = ([0, 1] as const).map((fase) => {
    const camadas = camadasDaPose(m, { estado, fase }).map((c) => ({
      ...c,
      x: c.x - caixa.x0,
      y: c.y - caixa.y0,
    }));
    return contornar(componer(camadas, caixa.largura, caixa.altura));
  });
  cache.set(chave, quadros);
  return quadros;
}

/** Tamanho (em pixels do desenho) da tela da espécie. */
export function tamanhoDaEspecie(especie: Especie): { largura: number; altura: number } {
  const { largura, altura } = caixaDaEspecie(MOLDES[especie]);
  return { largura, altura };
}

export type { Paleta };
