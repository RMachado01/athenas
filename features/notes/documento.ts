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
