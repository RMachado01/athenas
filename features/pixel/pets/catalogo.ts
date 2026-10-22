/**
 * Catálogo dos pets: nome de cada espécie, as variações de cor (paletas) e funções para
 * achar uma variação. A paleta troca a cor do mesmo desenho, sem redesenhar.
 */
import type { Paleta } from "../motor";
import type { Especie } from "./especies";
import { PALETA_EXTRA, sobrepor, trocar, type Padrao } from "./pecas-extras";

export interface Variacao {
  id: string;
  nome: string;
  paleta: Paleta;
  /** Desenho por cima da cor (listras do tigrado, máscara do siamês…). Sem padrão = cor lisa. */
  padrao?: Padrao;
}

export interface InfoDaEspecie {
  id: Especie;
  nome: string;
  /** Frase curta para a tela de adoção. */
  descricao: string;
  variacoes: readonly Variacao[];
}

const CONTORNO = "#2b1a14";
const OLHO = "#2b1a14";

function gato(id: string, nome: string, b: string, s: string, l: string, olho = OLHO): Variacao {
  return { id, nome, paleta: { o: CONTORNO, b, s, l, p: "#f4a3a8", e: olho } };
}

function capivara(id: string, nome: string, b: string, s: string, d: string): Variacao {
  return { id, nome, paleta: { o: CONTORNO, b, s, d, e: OLHO } };
}

function macaco(id: string, nome: string, b: string, l: string, d: string): Variacao {
  return { id, nome, paleta: { o: CONTORNO, b, l, d, e: OLHO } };
}

function banana(id: string, nome: string, x: string, y: string, pelo: [string, string, string]) {
  const [b, s, l] = pelo;
  return {
    id,
    nome,
    paleta: { o: CONTORNO, x, y, t: "#5b3a1c", b, s, l, p: "#f4a3a8", e: OLHO },
  } satisfies Variacao;
}

/** As pelagens com PADRÃO (listras, máscara…), aprovadas na rodada 1 do quadro de conceitos. */
const PELAGENS: Record<Especie, readonly Variacao[]> = {
  gato: [
    {
      id: "tigrado",
      nome: "Tigrado",
      paleta: { o: CONTORNO, b: "#e0984f", s: "#b8692c", l: "#f6d9a8", p: "#f4a3a8", e: "#2b1a14" },
      padrao: {
        corpo: sobrepor(["..............", "...s..s..s....", "..s..s..s.....", ".............."]),
        cabeca: sobrepor(["............", "............", "....s..s....", ".....ss....."]),
        rabo: sobrepor(["s....", ".....", "s....", ".....", "..s..", "....s"]),
      },
    },
    {
      id: "frajola",
      nome: "Frajola",
      paleta: { o: CONTORNO, b: "#2f2f3a", s: "#22222b", l: "#f4f1ea", p: "#e9a0a8", e: "#8fe36f" },
      padrao: {
        cabeca: sobrepor([
          "............",
          "............",
          "............",
          "............",
          "............",
          "............",
          "...ww..ww...",
          ".wwwwwwwwww.",
        ]),
        corpo: sobrepor([
          "..............",
          "..............",
          "..........ww..",
          "..........www.",
          "..........www.",
          "..........ww..",
        ]),
      },
    },
    {
      id: "siames",
      nome: "Siamês",
      paleta: { o: CONTORNO, b: "#efe3cc", s: "#d6c3a2", l: "#fff8ea", p: "#f4a3a8", e: "#4f8fd8" },
      padrao: {
        cabeca: sobrepor([
          ".q........q.",
          "qpq......qpq",
          "............",
          "............",
          "............",
          "....qqqq....",
          "...qq..qq...",
          "....qqqq....",
        ]),
        rabo: trocar("b", "q"),
      },
    },
  ],
  macaco: [
    {
      id: "mico",
      nome: "Mico-leão-dourado",
      paleta: { o: CONTORNO, b: "#e8892e", l: "#f6c27a", d: "#9a4a1a", e: "#2b1a14" },
    },
  ],
  capivara: [
    {
      id: "ruiva",
      nome: "Ruiva",
      paleta: { o: CONTORNO, b: "#c47a45", s: "#a35f30", d: "#5a2f18", e: "#1c120d" },
    },
  ],
  gato_banana: [
    {
      id: "madura",
      nome: "Banana madura",
      paleta: {
        o: CONTORNO,
        x: "#f2c230",
        y: "#c9941a",
        t: "#5b3a1c",
        b: "#a3acb8",
        s: "#7e8896",
        l: "#d9dee5",
        p: "#f4a3a8",
        e: "#2b1a14",
      },
      padrao: {
        corpo: sobrepor([
          "..............",
          "..............",
          "..............",
          "..............",
          "..............",
          "....t.........",
          "..........t...",
          "...t..........",
          ".........t....",
          "..............",
          "......t.......",
          "..t......t....",
          ".......t......",
          "..............",
          "..............",
        ]),
      },
    },
  ],
};

export const CATALOGO: Record<Especie, InfoDaEspecie> = {
  gato: {
    id: "gato",
    nome: "Gato",
    descricao: "Curioso e dorminhoco. Balança o rabo enquanto você estuda.",
    variacoes: [
      gato("laranja", "Laranja", "#e8a35c", "#c77f3d", "#f6d9a8"),
      gato("cinza", "Cinza", "#a3acb8", "#7e8896", "#d9dee5"),
      gato("preto", "Preto", "#3d3d4a", "#2b2b36", "#5d5d6d", "#8fe36f"),
      gato("creme", "Creme", "#f0e2c8", "#d8c4a0", "#fff8ea"),
      ...PELAGENS.gato,
    ],
  },
  capivara: {
    id: "capivara",
    nome: "Capivara",
    descricao: "Calma de verdade. Anda devagar e não se estressa com prazo.",
    variacoes: [
      capivara("marrom", "Marrom", "#b98652", "#9a6c3c", "#5c3a22"),
      capivara("caramelo", "Caramelo", "#d7a766", "#bc8a4b", "#6b4425"),
      capivara("cafe", "Café", "#8f6238", "#744c29", "#3f2716"),
      capivara("cinza", "Cinza", "#a39a92", "#857c74", "#4a423c"),
      ...PELAGENS.capivara,
    ],
  },
  macaco: {
    id: "macaco",
    nome: "Macaco",
    descricao: "Elétrico e esperto, com o rabinho enrolado.",
    variacoes: [
      macaco("marrom", "Marrom", "#8a5a3b", "#e7c6a0", "#5a3722"),
      macaco("dourado", "Dourado", "#d49a43", "#f4deb0", "#8a5a22"),
      macaco("preto", "Preto", "#4a4143", "#d9b99b", "#2a2224"),
      macaco("cinza", "Cinza", "#8a8c91", "#e5ddd0", "#4f5054"),
      ...PELAGENS.macaco,
    ],
  },
  gato_banana: {
    id: "gato_banana",
    nome: "Gato-banana",
    descricao: "Um gatinho de fantasia de banana. Ninguém sabe por quê.",
    variacoes: [
      banana("amarela", "Amarela", "#f4cf3a", "#d6a416", ["#a3acb8", "#7e8896", "#d9dee5"]),
      banana("laranja", "Gato laranja", "#f4cf3a", "#d6a416", ["#e8a35c", "#c77f3d", "#f6d9a8"]),
      banana("verde", "Verde", "#a9d45a", "#82b13a", ["#f0e2c8", "#d8c4a0", "#fff8ea"]),
      banana("preta", "Gato preto", "#f4cf3a", "#d6a416", ["#3d3d4a", "#2b2b36", "#5d5d6d"]),
      ...PELAGENS.gato_banana,
    ],
  },
};

export function infoDaEspecie(especie: Especie): InfoDaEspecie {
  return CATALOGO[especie];
}

/** A variação pedida, ou a primeira da espécie se o id não existir (dado antigo ou estranho). */
export function acharVariacao(especie: Especie, variacaoId: string): Variacao {
  const info = CATALOGO[especie];
  return info.variacoes.find((v) => v.id === variacaoId) ?? info.variacoes[0]!;
}

export function ehEspecie(valor: unknown): valor is Especie {
  return typeof valor === "string" && valor in CATALOGO;
}

export type { Paleta };

/**
 * A paleta completa para desenhar o pet: as cores da variação por cima das cores extras
 * (acessórios e padrões usam letras próprias: k, w, r, u, a, n, v, m, q, g).
 */
export function paletaDoPet(variacao: Variacao): Paleta {
  return { ...PALETA_EXTRA, ...variacao.paleta };
}
