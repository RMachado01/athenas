import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Slice, type Node as NoProseMirror } from "@tiptap/pm/model";
import {
  ATRIBUTO_DO_CARTAO,
  separarCartao,
  TIPO_DO_LINK,
  type NoDoDocumento,
  type SegmentoDeTexto,
} from "../documento";

/**
 * Cartões dentro das notas:
 *  - todo parágrafo ganha o atributo invisível `cardId` (vai para o JSON salvo);
 *  - quando um parágrafo vira cartão ("pergunta :: resposta"), recebe um id novo — e quem colou
 *    um parágrafo repetido ganha outro id (dois cartões nunca dividem o mesmo id);
 *  - colar uma linha-cartão vinda de OUTRA nota tira o id dela (vira um cartão novo aqui; o id
 *    pertence à outra nota e o banco não deixaria uma nota usar o cartão da outra);
 *  - parágrafos-cartão ganham um leve destaque (decoração: não muda o texto).
 */

/** Todos os ids de cartão presentes no documento (para saber quais "são desta nota"). */
export function idsDeCartaoNoDocumento(doc: NoDoDocumento | null | undefined): Set<string> {
  const ids = new Set<string>();
  const visitar = (no: NoDoDocumento) => {
    const id = no.attrs?.[ATRIBUTO_DO_CARTAO];
    if (no.type === "paragraph" && typeof id === "string" && id) ids.add(id);
    no.content?.forEach(visitar);
  };
  if (doc) visitar(doc);
  return ids;
}

/** Regra pura do colar: parágrafos com id que esta nota não conhece perdem o id. */
export function limparIdsColados(
  conteudo: NoDoDocumento[],
  conhecidos: ReadonlySet<string>,
): NoDoDocumento[] {
  const limpar = (no: NoDoDocumento): NoDoDocumento => {
    const novo: NoDoDocumento = { ...no };
    const id = no.attrs?.[ATRIBUTO_DO_CARTAO];
    if (no.type === "paragraph" && typeof id === "string" && !conhecidos.has(id)) {
      const { [ATRIBUTO_DO_CARTAO]: _fora, ...resto } = no.attrs ?? {};
      void _fora;
      novo.attrs = resto;
    }
    if (no.content) novo.content = no.content.map(limpar);
    return novo;
  };
  return conteudo.map(limpar);
}

/**
 * Regra pura: quais parágrafos mudam de id (id novo, ou `null` = perde o id).
 *
 * Os CARTÕES têm prioridade: o primeiro cartão com um id fica com ele. Isso importa porque o
 * Enter no começo (ou no meio) de uma linha copia o id para as duas metades — a linha vazia de
 * cima não pode "roubar" o id (e o histórico) do cartão de baixo. Um parágrafo comum com o id
 * de um cartão perde o id; um parágrafo comum com id próprio o mantém (se voltar a ser cartão,
 * recupera o histórico). Cartão sem id, ou com id repetido (parágrafo colado), ganha id novo.
 */
export function garantirIdsDeCartao(
  paragrafos: { pos: number; id: string | null; ehCartao: boolean }[],
  novoId: () => string,
): { pos: number; id: string | null }[] {
  const dosCartoes = new Set<string>();
  const mudancas: { pos: number; id: string | null }[] = [];
  for (const p of paragrafos) {
    if (!p.ehCartao) continue;
    if (p.id && !dosCartoes.has(p.id)) {
      dosCartoes.add(p.id);
    } else {
      const id = novoId();
      dosCartoes.add(id);
      mudancas.push({ pos: p.pos, id });
    }
  }
  for (const p of paragrafos) {
    if (!p.ehCartao && p.id && dosCartoes.has(p.id)) mudancas.push({ pos: p.pos, id: null });
  }
  return mudancas.sort((a, b) => a.pos - b.pos);
}

function segmentos(no: NoProseMirror): SegmentoDeTexto[] {
  const lista: SegmentoDeTexto[] = [];
  no.forEach((filho) => {
    if (filho.type.name === "hardBreak") lista.push({ texto: "\n", codigo: false });
    else if (filho.type.name === TIPO_DO_LINK)
      lista.push({ texto: String(filho.attrs.label ?? ""), codigo: false });
    else if (filho.isText)
      lista.push({
        texto: filho.text ?? "",
        codigo: filho.marks.some((m) => m.type.name === "code"),
      });
  });
  return lista;
}

function paragrafosDoDoc(doc: NoProseMirror) {
  const lista: { pos: number; id: string | null; ehCartao: boolean; tamanho: number }[] = [];
  doc.descendants((no, pos) => {
    if (no.type.name === "codeBlock") return false;
    if (no.type.name !== "paragraph") return true;
    const id = no.attrs[ATRIBUTO_DO_CARTAO] as string | null;
    lista.push({ pos, id, ehCartao: separarCartao(segmentos(no)) !== null, tamanho: no.nodeSize });
    return false;
  });
  return lista;
}

const chave = new PluginKey("cartoesNaNota");

export const CartoesNaNota = Extension.create<{ idsConhecidos: Set<string> }>({
  name: "cartoesNaNota",

  // Ids de cartão que pertencem a ESTA nota (os do documento ao abrir + os criados aqui).
  // Cada editor recebe o seu: CartoesNaNota.configure({ idsConhecidos: ... }).
  addOptions() {
    return { idsConhecidos: new Set<string>() };
  },

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          [ATRIBUTO_DO_CARTAO]: {
            default: null,
            keepOnSplit: false, // Enter no meio do cartão: a linha nova NÃO herda o id
            parseHTML: (el) => el.getAttribute("data-card-id"),
            renderHTML: (attrs) =>
              attrs[ATRIBUTO_DO_CARTAO] ? { "data-card-id": attrs[ATRIBUTO_DO_CARTAO] } : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    const conhecidos = this.options.idsConhecidos;
    return [
      new Plugin({
        key: chave,
        appendTransaction: (transacoes, _antes, estado) => {
          if (!transacoes.some((t) => t.docChanged)) return null;
          const mudancas = garantirIdsDeCartao(paragrafosDoDoc(estado.doc), () => {
            const id = crypto.randomUUID();
            conhecidos.add(id); // nasceu nesta nota: recortar e colar aqui mesmo mantém o id
            return id;
          });
          if (mudancas.length === 0) return null;
          const tr = estado.tr;
          for (const m of mudancas) tr.setNodeAttribute(m.pos, ATRIBUTO_DO_CARTAO, m.id);
          return tr.setMeta("addToHistory", false);
        },
        props: {
          // Colar: linha-cartão de outra nota perde o id (aqui ela vira um cartão novo).
          transformPasted: (slice, view) => {
            const json = slice.toJSON() as { content?: NoDoDocumento[] } | null;
            if (!json?.content) return slice;
            return Slice.fromJSON(view.state.schema, {
              ...json,
              content: limparIdsColados(json.content, conhecidos),
            });
          },
          decorations: (estado) =>
            DecorationSet.create(
              estado.doc,
              paragrafosDoDoc(estado.doc)
                .filter((p) => p.ehCartao)
                .map((p) => Decoration.node(p.pos, p.pos + p.tamanho, { class: "cartao-na-nota" })),
            ),
        },
      }),
    ];
  },
});
