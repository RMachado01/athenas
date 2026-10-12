/**
 * Conversão banco ↔ React Flow (pura). O React Flow chama itens de "nodes" e setas de "edges".
 *
 * Regras importantes da biblioteca que respeitamos aqui:
 *  - um filho guarda a posição RELATIVA ao grupo (`parentId`) — o banco guarda igual;
 *  - os grupos precisam vir ANTES dos filhos no array de nodes;
 *  - a ordem no array define quem fica por cima; usamos o `z` (grupos sempre por baixo).
 */
import type { Edge, Node } from "@xyflow/react";
import type { ItemDoMural, LigacaoDoMural } from "./queries";

export interface DadosDoNode extends Record<string, unknown> {
  item: ItemDoMural;
}

export type NodeDoMural = Node<DadosDoNode, ItemDoMural["tipo"]>;

export function paraNodes(
  itens: readonly ItemDoMural[],
  selecionados: ReadonlySet<string> = new Set(),
) {
  const ids = new Set(itens.map((i) => i.id));
  const ordenados = [...itens].sort((a, b) => {
    // grupos primeiro (pais antes dos filhos), depois por camada
    const ga = a.tipo === "grupo" ? 0 : 1;
    const gb = b.tipo === "grupo" ? 0 : 1;
    return ga - gb || a.z - b.z;
  });
  return ordenados.map((i): NodeDoMural => ({
    id: i.id,
    type: i.tipo,
    position: { x: i.x, y: i.y },
    width: i.w,
    height: i.h,
    // pai que não existe mais (apagado em outra aba) é ignorado: o item fica solto
    ...(i.grupoId && ids.has(i.grupoId) ? { parentId: i.grupoId } : {}),
    data: { item: i },
    selected: selecionados.has(i.id),
    zIndex: i.tipo === "grupo" ? -1 : 0,
  }));
}

export function paraEdges(
  ligacoes: readonly LigacaoDoMural[],
  selecionada: string | null = null,
): Edge[] {
  return ligacoes.map((l) => ({
    id: l.id,
    source: l.de,
    target: l.para,
    label: l.rotulo || undefined,
    selected: l.id === selecionada,
    type: "default",
  }));
}

/** Próxima camada (z) para um item novo: fica por cima de todos. */
export function proximaCamada(itens: readonly ItemDoMural[]): number {
  return itens.reduce((max, i) => Math.max(max, i.z), 0) + 1;
}

/** Posição absoluta de um item (somando a do grupo, se estiver dentro de um). */
export function posicaoAbsoluta(item: ItemDoMural, itens: readonly ItemDoMural[]) {
  const pai = item.grupoId ? itens.find((i) => i.id === item.grupoId) : undefined;
  return pai ? { x: item.x + pai.x, y: item.y + pai.y } : { x: item.x, y: item.y };
}
