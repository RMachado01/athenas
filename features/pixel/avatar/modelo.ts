/**
 * O avatar SALVO (o que vai para `pixel_profiles.avatar`), as CONQUISTAS que liberam itens
 * especiais e os CONJUNTOS prontos. Funções puras: a tela e o banco só usam o que sai daqui.
 *
 * Por que validar ao ler? O jsonb aceita qualquer coisa: um id antigo ou estranho não pode
 * quebrar o desenho, e um item de conquista não pode aparecer equipado antes de ser ganho.
 */
import { OLHOS_CORES, PELES } from "./corpo";
import { CABELOS, CORES_DE_CABELO, ITENS, type Parte } from "./itens";
import type { EscolhasDoAvatar } from "./montar";

export interface AvatarSalvo {
  v: 1;
  pele: string;
  olhos: string;
  cabelo: string;
  corDoCabelo: string;
  equipados: Partial<Record<Parte, string>>;
  /** Itens de conquista já ganhos (ficam liberados para sempre). */
  desbloqueados: string[];
}

export const AVATAR_PADRAO: AvatarSalvo = {
  v: 1,
  pele: "p2",
  olhos: "castanho",
  cabelo: "curto",
  corDoCabelo: "castanho",
  equipados: {},
  desbloqueados: [],
};

// ---------------------------------------------------------------------------
// Conquistas (G1): itens especiais liberados estudando
// ---------------------------------------------------------------------------
export interface EstatisticasDeEstudo {
  minutosDeFoco: number;
  melhorSequencia: number;
  tarefasConcluidas: number;
  cartoesRevisados: number;
}

export interface Conquista {
  item: string;
  /** Como ganhar, em uma frase (aparece no item trancado). */
  regra: string;
  meta: number;
  valor: (e: EstatisticasDeEstudo) => number;
  /** "faltam 3 h de foco" etc. */
  falta: (quanto: number) => string;
}

const plural = (n: number, um: string, varios: string) =>
  `${n === 1 ? "falta" : "faltam"} ${n} ${n === 1 ? um : varios}`;

export const CONQUISTAS: readonly Conquista[] = [
  {
    item: "mago",
    regra: "10 horas de foco",
    meta: 600,
    valor: (e) => e.minutosDeFoco,
    // Mostra em horas cheias (arredondando para cima: "falta 1 h" até o último minuto).
    falta: (min) => plural(Math.ceil(min / 60), "h de foco", "h de foco"),
  },
  {
    item: "louros",
    regra: "7 dias seguidos de estudo",
    meta: 7,
    valor: (e) => e.melhorSequencia,
    falta: (d) => plural(d, "dia de sequência", "dias de sequência"),
  },
  {
    item: "capa",
    regra: "30 tarefas concluídas",
    meta: 30,
    valor: (e) => e.tarefasConcluidas,
    falta: (t) => plural(t, "tarefa concluída", "tarefas concluídas"),
  },
  {
    item: "varinha",
    regra: "100 flashcards revisados",
    meta: 100,
    valor: (e) => e.cartoesRevisados,
    falta: (c) => plural(c, "flashcard revisado", "flashcards revisados"),
  },
];

const conquistaDoItem = (id: string) => CONQUISTAS.find((c) => c.item === id);

export function itemLiberado(avatar: AvatarSalvo, itemId: string): boolean {
  return !conquistaDoItem(itemId) || avatar.desbloqueados.includes(itemId);
}

/** Itens de conquista cuja meta já foi batida e que ainda não estão na lista. */
export function novasConquistas(avatar: AvatarSalvo, e: EstatisticasDeEstudo): string[] {
  return CONQUISTAS.filter(
    (c) => !avatar.desbloqueados.includes(c.item) && c.valor(e) >= c.meta,
  ).map((c) => c.item);
}

export function progressoDaConquista(
  itemId: string,
  e: EstatisticasDeEstudo,
): { pronta: boolean; regra: string; texto: string } {
  const c = conquistaDoItem(itemId);
  if (!c) return { pronta: true, regra: "", texto: "" };
  const falta = c.meta - c.valor(e);
  return { pronta: falta <= 0, regra: c.regra, texto: falta <= 0 ? "pronta!" : c.falta(falta) };
}

// ---------------------------------------------------------------------------
// Ler o que veio do banco (com cuidado)
// ---------------------------------------------------------------------------
const ehTexto = (v: unknown): v is string => typeof v === "string";
const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function escolha(valor: unknown, validos: readonly { id: string }[], padrao: string): string {
  return ehTexto(valor) && validos.some((x) => x.id === valor) ? valor : padrao;
}

export function lerAvatar(bruto: unknown): AvatarSalvo {
  if (!ehObjeto(bruto)) return AVATAR_PADRAO;
  const desbloqueados = Array.isArray(bruto.desbloqueados)
    ? [
        ...new Set(
          bruto.desbloqueados.filter((x): x is string => ehTexto(x) && !!conquistaDoItem(x)),
        ),
      ]
    : [];
  const base: AvatarSalvo = {
    v: 1,
    pele: escolha(bruto.pele, PELES, AVATAR_PADRAO.pele),
    olhos: escolha(bruto.olhos, OLHOS_CORES, AVATAR_PADRAO.olhos),
    cabelo: escolha(bruto.cabelo, CABELOS, AVATAR_PADRAO.cabelo),
    corDoCabelo: escolha(bruto.corDoCabelo, CORES_DE_CABELO, AVATAR_PADRAO.corDoCabelo),
    equipados: {},
    desbloqueados,
  };
  if (ehObjeto(bruto.equipados)) {
    for (const [parte, id] of Object.entries(bruto.equipados)) {
      const item = ITENS.find((i) => i.id === id && i.parte === parte);
      if (item && itemLiberado(base, item.id)) base.equipados[item.parte] = item.id;
    }
  }
  return base;
}

export function paraEscolhas(a: AvatarSalvo): EscolhasDoAvatar {
  return {
    pele: a.pele,
    olhos: a.olhos,
    cabelo: a.cabelo,
    corDoCabelo: a.corDoCabelo,
    equipados: { ...a.equipados },
  };
}

// ---------------------------------------------------------------------------
// Conjuntos prontos (J1–J6): trocam o equipamento todo de uma vez
// ---------------------------------------------------------------------------
export interface Conjunto {
  id: string;
  nome: string;
  itens: Partial<Record<Parte, string>>;
}

export const CONJUNTOS: readonly Conjunto[] = [
  {
    id: "mago",
    nome: "Mago estudioso",
    itens: { cabeca: "mago", blusa: "tunica", costas: "capa", mao: "varinha", pes: "botas" },
  },
  {
    id: "cientista",
    nome: "Cientista",
    itens: { blusa: "jaleco", rosto: "oculos", mao: "caneca", pernas: "calca", pes: "sapatilha" },
  },
  {
    id: "aventureiro",
    nome: "Aventureiro",
    itens: { cabeca: "bone", costas: "mochila", pernas: "aventureiro", pes: "botas", mao: "lapis" },
  },
  {
    id: "cavaleiro",
    nome: "Cavaleiro dos livros",
    itens: { blusa: "armadura", cabeca: "louros", costas: "capa", mao: "livro", pes: "botas" },
  },
  {
    id: "confortavel",
    nome: "Modo confortável",
    itens: { blusa: "moletom", cabeca: "gorro", pernas: "bermuda", mao: "caneca" },
  },
  {
    id: "fada",
    nome: "Fada das provas",
    itens: { costas: "asas", pernas: "saia", mao: "varinha", blusa: "camiseta", pes: "sapatilha" },
  },
];

/** Veste o conjunto inteiro (o que não estiver no conjunto sai), pulando o que está trancado. */
export function aplicarConjunto(avatar: AvatarSalvo, conjunto: Conjunto): AvatarSalvo {
  const equipados: Partial<Record<Parte, string>> = {};
  for (const [parte, id] of Object.entries(conjunto.itens) as [Parte, string][]) {
    if (itemLiberado(avatar, id)) equipados[parte] = id;
  }
  return { ...avatar, equipados };
}
