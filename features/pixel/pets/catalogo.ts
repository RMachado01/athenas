/**
 * Catálogo dos pets: nome de cada espécie, as variações de cor (paletas) e funções para
 * achar uma variação. A paleta troca a cor do mesmo desenho, sem redesenhar.
 */
import type { Paleta } from "../motor";
import type { Especie } from "./especies";

export interface Variacao {
  id: string;
  nome: string;
  paleta: Paleta;
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
