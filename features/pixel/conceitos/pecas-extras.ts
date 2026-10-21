/**
 * CONCEITOS (para aprovação do Renan): acessórios, padrões de pelagem, emotes e objetos de cena.
 * Tudo em grade de letras, como os pets. As letras daqui não colidem com as dos pets, então as
 * paletas se somam: k preto · w branco · r vermelho · u dourado · a azul · n laranja · v verde ·
 * m boca · q "pontas" do siamês · g cinza claro.
 */
import type { Grade, Paleta } from "../motor";
import type { Especie } from "../pets/especies";

export const PALETA_EXTRA: Paleta = {
  // contorno (para emotes e objetos; nos pets, a paleta do pet manda)
  o: "#2b1a14",
  k: "#2b1a14",
  w: "#f7f3ea",
  r: "#e8506a",
  u: "#f2c33a",
  a: "#4f8fd8",
  n: "#f08a2a",
  v: "#4f9a45",
  m: "#8a2a35",
  q: "#5a3b2e",
  g: "#cfd6dd",
};

// ---------------------------------------------------------------------------
// Acessórios: cada um tem um desenho e a posição em relação à CABEÇA, por tipo de cabeça.
// ---------------------------------------------------------------------------
export type TipoDeCabeca = "frente" | "macaco" | "capivara";

export const TIPO_DE_CABECA: Record<Especie, TipoDeCabeca> = {
  gato: "frente",
  gato_banana: "frente",
  macaco: "macaco",
  capivara: "capivara",
};

interface Encaixe {
  grade: Grade;
  x: number;
  y: number;
}

export interface Acessorio {
  id: string;
  nome: string;
  porTipo: Record<TipoDeCabeca, Encaixe>;
}

const FONE: Grade = [
  "...kkkkkkkk...",
  "..k........k..",
  ".k..........k.",
  "rr..........rr",
  "rr..........rr",
  "rr..........rr",
];
const CHAPEU: Grade = ["....kkkkkk....", "kkkkkkkkkkkkkk", "...kkkkkkkk.u.", "...kkkkkkkk.u."];
const LACO: Grade = ["rr.rr", "rrkrr", "rr.rr"];
const LARANJA: Grade = ["..v..", ".nnn.", "nnnnn", ".nnn."];
const CACHECOL: Grade = ["aaaaaaaaaaaa", ".awawawawaw.", "........aa..", "........aa.."];

export const ACESSORIOS: readonly Acessorio[] = [
  {
    id: "fone",
    nome: "Fone de ouvido",
    porTipo: {
      frente: { grade: FONE, x: -1, y: -1 },
      macaco: { grade: FONE, x: -1, y: 0 },
      capivara: { grade: [".kkkk.", "k....k", "k.....", "rrr...", "rrr..."], x: 1, y: -2 },
    },
  },
  {
    id: "oculos",
    nome: "Óculos de estudo",
    porTipo: {
      frente: {
        grade: ["..kkk..kkk..", "..k.kkkk.k..", "..k.k..k.k..", "..kkk..kkk.."],
        x: 0,
        y: 3,
      },
      macaco: { grade: ["...kkkkkk...", "...k.kk.k...", "...kkkkkk..."], x: 0, y: 3 },
      capivara: { grade: ["..kkk", "kkk.k", "..kkk"], x: 2, y: 2 },
    },
  },
  {
    id: "chapeu",
    nome: "Chapéu de formatura",
    porTipo: {
      frente: { grade: CHAPEU, x: -1, y: -3 },
      macaco: { grade: CHAPEU, x: -1, y: -3 },
      capivara: {
        grade: ["...kkkk...", "kkkkkkkkkk", "..kkkkkk.u", "..kkkkkk.u"],
        x: 0,
        y: -3,
      },
    },
  },
  {
    id: "laco",
    nome: "Laço",
    porTipo: {
      frente: { grade: LACO, x: 8, y: -1 },
      macaco: { grade: LACO, x: 8, y: 0 },
      capivara: { grade: LACO, x: 2, y: -2 },
    },
  },
  {
    id: "cachecol",
    nome: "Cachecol",
    porTipo: {
      frente: { grade: CACHECOL, x: 0, y: 7 },
      macaco: { grade: CACHECOL, x: 0, y: 7 },
      capivara: { grade: ["aaa", "awa", "aaa", ".a.", ".a."], x: -1, y: 3 },
    },
  },
  {
    id: "laranja",
    nome: "Laranja na cabeça",
    porTipo: {
      frente: { grade: LARANJA, x: 4, y: -4 },
      macaco: { grade: LARANJA, x: 4, y: -4 },
      capivara: { grade: LARANJA, x: 2, y: -4 },
    },
  },
];

// ---------------------------------------------------------------------------
// Padrões de pelagem: transformam as peças (por cima da cor base), sem mudar a silhueta.
// ---------------------------------------------------------------------------
type Transformar = (g: Grade) => Grade;

/** Pinta por cima só onde já existe desenho (o padrão nunca "vaza" para fora do bicho). */
export function sobrepor(cobertura: Grade): Transformar {
  return (g) =>
    g.map((linha, j) =>
      Array.from(linha, (c, i) => {
        const novo = cobertura[j]?.[i];
        return c !== "." && novo && novo !== "." ? novo : c;
      }).join(""),
    );
}

/** Troca uma letra por outra na peça inteira (ex.: rabo todo escuro no siamês). */
export function trocar(de: string, para: string): Transformar {
  return (g) => g.map((linha) => linha.replaceAll(de, para));
}

export interface Padrao {
  corpo?: Transformar;
  cabeca?: Transformar;
  rabo?: Transformar;
}

export interface CorConceito {
  id: string;
  nome: string;
  paleta: Paleta;
  padrao?: Padrao;
}

const CONTORNO = "#2b1a14";

export const CORES_NOVAS: Partial<Record<Especie, readonly CorConceito[]>> = {
  gato: [
    {
      id: "tigrado",
      nome: "Tigrado",
      paleta: { o: CONTORNO, b: "#e8a35c", s: "#b8692c", l: "#f6d9a8", p: "#f4a3a8", e: "#2b1a14" },
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

// ---------------------------------------------------------------------------
// Emotes (balãozinho com ícone) e objetos de cena.
// ---------------------------------------------------------------------------
const BALAO: Grade = [
  ".wwwwwwwww.",
  "wwwwwwwwwww",
  "wwwwwwwwwww",
  "wwwwwwwwwww",
  "wwwwwwwwwww",
  "wwwwwwwwwww",
  "wwwwwwwwwww",
  ".wwwwwwwww.",
  "...ww......",
  "...w.......",
];

/** Põe o ícone (7x5) dentro do balão. */
function noBalao(icone: Grade): Grade {
  return BALAO.map((linha, j) => {
    const lin = icone[j - 2];
    if (!lin) return linha;
    return Array.from(linha, (c, i) =>
      i >= 2 && i < 9 && lin[i - 2] !== "." ? lin[i - 2]! : c,
    ).join("");
  });
}

export interface Emote {
  id: string;
  nome: string;
  /** Quando aparece (sugestão para aprovar). */
  quando: string;
  grade: Grade;
}

export const EMOTES: readonly Emote[] = [
  {
    id: "coracao",
    nome: "Coração",
    quando: "Carinho (toque no pet)",
    grade: noBalao([".rr.rr.", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."]),
  },
  {
    id: "exclamacao",
    nome: "Exclamação",
    quando: "Tarefa com prazo hoje / lembrete",
    grade: noBalao(["...k...", "...k...", "...k...", ".......", "...k..."]),
  },
  {
    id: "interrogacao",
    nome: "Interrogação",
    quando: "Você sumiu do app por uns dias",
    grade: noBalao(["..kkk..", ".....k.", "...kk..", ".......", "...k..."]),
  },
  {
    id: "musica",
    nome: "Nota musical",
    quando: 'Durante um Pomodoro ("estudando junto")',
    grade: noBalao(["..kkkk.", "..k..k.", "..k..k.", "kkk.kkk", "kk..kk."]),
  },
  {
    id: "estrela",
    nome: "Estrelas",
    quando: "Pomodoro concluído / meta batida",
    grade: noBalao(["...u...", "..uuu..", "uuuuuuu", ".uuuuu.", ".u...u."]),
  },
  {
    id: "gota",
    nome: "Gota de suor",
    quando: "Estudo longo sem pausa (hora de descansar)",
    grade: noBalao(["...a...", "..aaa..", ".aaaaa.", ".aaaaa.", "..aaa.."]),
  },
  {
    id: "ideia",
    nome: "Lâmpada",
    quando: "Nova nota ou flashcard criado",
    grade: noBalao(["..uuu..", ".uuuuu.", ".uuuuu.", "..uuu..", "..kkk.."]),
  },
  {
    id: "zz",
    nome: "Sono",
    quando: "Sem estudar há um tempo / à noite",
    grade: noBalao(["kkkk...", "..k....", ".k..kkk", "kkkk.k.", "....kkk"]),
  },
];

export const OBJETOS = {
  tigela: ["..nnnnn..", "aaaaaaaaa", ".aaaaaaa.", "..aaaaa.."] as Grade,
  bolinha: [".rrr.", "rrwrr", "rrrrr", "rrrrr", ".rrr."] as Grade,
  livro: [".aaaaaaa", "awwwwwwa", "awwwwwwa", "aaaaaaaa"] as Grade,
} as const;
