import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as NoProseMirror } from "@tiptap/pm/model";
import { ATRIBUTO_DO_CARTAO, separarCartao, type SegmentoDeTexto } from "../documento";

/**
 * Cartões dentro das notas:
 *  - todo parágrafo ganha o atributo invisível `cardId` (vai para o JSON salvo);
 *  - quando um parágrafo vira cartão ("pergunta :: resposta"), recebe um id novo — e quem colou
 *    um parágrafo repetido ganha outro id (dois cartões nunca dividem o mesmo id);
 *  - parágrafos-cartão ganham um leve destaque (decoração: não muda o texto).
 */

/** Regra pura: quais parágrafos precisam de id novo. */
export function garantirIdsDeCartao(
  paragrafos: { pos: number; id: string | null; ehCartao: boolean }[],
  novoId: () => string,
): { pos: number; id: string }[] {
  const vistos = new Set<string>();
  const mudancas: { pos: number; id: string }[] = [];
  for (const p of paragrafos) {
    if (!p.ehCartao) {
      if (p.id) vistos.add(p.id);
      continue;
    }
    if (!p.id || vistos.has(p.id)) {
      const id = novoId();
      vistos.add(id);
      mudancas.push({ pos: p.pos, id });
    } else {
      vistos.add(p.id);
    }
  }
  return mudancas;
}

function segmentos(no: NoProseMirror): SegmentoDeTexto[] {
  const lista: SegmentoDeTexto[] = [];
  no.forEach((filho) => {
    if (filho.type.name === "hardBreak") lista.push({ texto: "\n", codigo: false });
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

export const CartoesNaNota = Extension.create({
  name: "cartoesNaNota",

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
    return [
      new Plugin({
        key: chave,
        appendTransaction: (transacoes, _antes, estado) => {
          if (!transacoes.some((t) => t.docChanged)) return null;
          const mudancas = garantirIdsDeCartao(paragrafosDoDoc(estado.doc), () =>
            crypto.randomUUID(),
          );
          if (mudancas.length === 0) return null;
          const tr = estado.tr;
          for (const m of mudancas) tr.setNodeAttribute(m.pos, ATRIBUTO_DO_CARTAO, m.id);
          return tr.setMeta("addToHistory", false);
        },
        props: {
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
