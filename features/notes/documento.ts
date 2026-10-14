/**
 * Regras puras das notas (sem editor, sem banco): links dentro do documento, títulos e busca.
 *
 * O editor (Tiptap) guarda o texto como uma árvore JSON. Um [[link]] vira um nó do tipo
 * "wikilink" com { id, label }: o id aponta para a nota citada (mesmo se ela mudar de nome).
 */

export interface NoDoDocumento {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: NoDoDocumento[];
  text?: string;
  /** Marcas do texto (negrito, código...). Só usamos o tipo. */
  marks?: { type: string }[];
}

export const TIPO_DO_LINK = "wikilink";

export const DOCUMENTO_VAZIO: NoDoDocumento = { type: "doc", content: [] };

/** Ids das notas citadas no documento (sem repetir, na ordem em que aparecem). */
export function extrairLinks(doc: NoDoDocumento | null | undefined): string[] {
  const ids: string[] = [];
  const visitar = (no: NoDoDocumento) => {
    if (no.type === TIPO_DO_LINK && typeof no.attrs?.id === "string" && no.attrs.id) {
      if (!ids.includes(no.attrs.id)) ids.push(no.attrs.id);
    }
    no.content?.forEach(visitar);
  };
  if (doc) visitar(doc);
  return ids;
}

/** Atualiza o rótulo dos links quando a nota citada muda de nome (o id continua o mesmo). */
export function renomearLinks(
  doc: NoDoDocumento,
  nomes: ReadonlyMap<string, string>,
): NoDoDocumento {
  const trocar = (no: NoDoDocumento): NoDoDocumento => {
    const novo: NoDoDocumento = { ...no };
    if (no.type === TIPO_DO_LINK && typeof no.attrs?.id === "string" && nomes.has(no.attrs.id)) {
      novo.attrs = { ...no.attrs, label: nomes.get(no.attrs.id) };
    }
    if (no.content) novo.content = no.content.map(trocar);
    return novo;
  };
  return trocar(doc);
}

/** Forma de comparar títulos: sem espaços nas pontas e sem diferenciar maiúsculas (igual ao banco). */
export function chaveDoTitulo(titulo: string): string {
  return titulo.trim().toLocaleLowerCase("pt-BR");
}

/** Remove acentos para a busca achar "funcao" em "função". */
function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

export interface NotaBuscavel {
  id: string;
  titulo: string;
  texto: string;
}

/**
 * Busca simples e previsível: título que COMEÇA com o termo > título que CONTÉM > texto que contém.
 * Sem termo, devolve a lista como veio (já ordenada por "mais recente").
 */
export function buscarNotas<T extends NotaBuscavel>(notas: readonly T[], termo: string): T[] {
  const t = semAcento(termo.trim());
  if (!t) return [...notas];
  const pontos = (n: T) => {
    const titulo = semAcento(n.titulo);
    if (titulo.startsWith(t)) return 3;
    if (titulo.includes(t)) return 2;
    if (semAcento(n.texto).includes(t)) return 1;
    return 0;
  };
  return notas
    .map((n, i) => ({ n, p: pontos(n), i }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .map((x) => x.n);
}

/** Trecho de até `tamanho` caracteres em volta do termo (ou o começo do texto). */
export function trecho(texto: string, termo = "", tamanho = 120): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= tamanho) return limpo;
  const pos = termo ? semAcento(limpo).indexOf(semAcento(termo.trim())) : -1;
  if (pos < 0) return `${limpo.slice(0, tamanho).trimEnd()}…`;
  const inicio = Math.max(0, pos - Math.floor(tamanho / 3));
  const pedaco = limpo.slice(inicio, inicio + tamanho).trim();
  return `${inicio > 0 ? "…" : ""}${pedaco}${inicio + tamanho < limpo.length ? "…" : ""}`;
}

// ---------------------------------------------------------------------------
// Cartões dentro das notas (sintaxe do Obsidian: "pergunta :: resposta")
// ---------------------------------------------------------------------------

/** Atributo invisível do parágrafo que guarda o id do cartão (identidade estável). */
export const ATRIBUTO_DO_CARTAO = "cardId";

/** Pedaço de texto de um parágrafo; `codigo` = está dentro de `código inline`. */
export interface SegmentoDeTexto {
  texto: string;
  codigo: boolean;
}

export interface CartaoDaNota {
  id: string;
  frente: string;
  verso: string;
}

const MAX_LADO = 2000;

/**
 * Decide se um parágrafo é um cartão e separa frente/verso.
 * Regras: o primeiro "::" FORA de código inline divide; ":::" (ida e volta, versão futura)
 * não vira cartão; os dois lados aparados precisam ter de 1 a 2000 caracteres.
 */
export function separarCartao(
  segmentos: SegmentoDeTexto[],
): { frente: string; verso: string } | null {
  const texto = segmentos.map((s) => s.texto).join("");
  // Máscara: o mesmo texto, mas com o código inline trocado por espaços (o "::" de
  // `std::vector` não conta), mantendo as posições iguais às do texto original.
  const mascara = segmentos.map((s) => (s.codigo ? " ".repeat(s.texto.length) : s.texto)).join("");
  if (mascara.includes(":::")) return null;
  const i = mascara.indexOf("::");
  if (i < 0) return null;
  const frente = texto.slice(0, i).trim();
  const verso = texto.slice(i + 2).trim();
  if (!frente || !verso || frente.length > MAX_LADO || verso.length > MAX_LADO) return null;
  return { frente, verso };
}

/** Texto de um parágrafo do documento em segmentos (quebra de linha vira "\n"). */
export function segmentosDoParagrafo(no: NoDoDocumento): SegmentoDeTexto[] {
  return (no.content ?? []).map((filho) => {
    if (filho.type === "hardBreak") return { texto: "\n", codigo: false };
    return {
      texto: filho.text ?? "",
      codigo: (filho.marks ?? []).some((m) => m.type === "code"),
    };
  });
}

/**
 * Todos os cartões da nota, na ordem do texto. Só entram parágrafos que já têm id (o editor
 * dá o id assim que a linha vira cartão) e cada id entra uma vez só.
 */
export function extrairCartoes(doc: NoDoDocumento | null | undefined): CartaoDaNota[] {
  const cartoes: CartaoDaNota[] = [];
  const vistos = new Set<string>();
  const visitar = (no: NoDoDocumento) => {
    if (no.type === "codeBlock") return;
    if (no.type === "paragraph") {
      const id = no.attrs?.[ATRIBUTO_DO_CARTAO];
      const lados = separarCartao(segmentosDoParagrafo(no));
      if (lados && typeof id === "string" && id && !vistos.has(id)) {
        vistos.add(id);
        cartoes.push({ id, ...lados });
      }
      return;
    }
    no.content?.forEach(visitar);
  };
  if (doc) visitar(doc);
  return cartoes;
}
