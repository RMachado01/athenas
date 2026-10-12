import { describe, expect, it } from "vitest";
import { paraEdges, paraNodes, posicaoAbsoluta, proximaCamada } from "@/features/boards/conversao";
import type { ItemDoMural } from "@/features/boards/queries";

const item = (id: string, extra: Partial<ItemDoMural> = {}): ItemDoMural => ({
  id,
  tipo: "nota",
  x: 0,
  y: 0,
  w: 200,
  h: 160,
  z: 1,
  cor: "amarelo",
  texto: "",
  tarefaId: null,
  grupoId: null,
  ...extra,
});

describe("paraNodes", () => {
  it("grupos vêm antes dos filhos e ficam por baixo; filhos levam parentId", () => {
    const nodes = paraNodes([
      item("filho", { grupoId: "g", z: 5, x: 10, y: 20 }),
      item("g", { tipo: "grupo", z: 9 }),
      item("solto", { z: 2 }),
    ]);
    expect(nodes.map((n) => n.id)).toEqual(["g", "solto", "filho"]);
    expect(nodes[0]).toMatchObject({ type: "grupo", zIndex: -1 });
    expect(nodes[2]).toMatchObject({ parentId: "g", position: { x: 10, y: 20 }, width: 200 });
  });

  it("pai que não existe é ignorado (item fica solto)", () => {
    const [n] = paraNodes([item("a", { grupoId: "sumiu" })]);
    expect(n).not.toHaveProperty("parentId");
  });

  it("mantém a seleção", () => {
    const nodes = paraNodes([item("a"), item("b")], new Set(["b"]));
    expect(nodes.map((n) => n.selected)).toEqual([false, true]);
  });
});

describe("paraEdges / camadas / posição", () => {
  it("setas viram edges, rótulo vazio some", () => {
    expect(paraEdges([{ id: "l", de: "a", para: "b", rotulo: "" }], "l")).toEqual([
      { id: "l", source: "a", target: "b", label: undefined, selected: true, type: "default" },
    ]);
  });

  it("próxima camada fica por cima", () => {
    expect(proximaCamada([])).toBe(1);
    expect(proximaCamada([item("a", { z: 3 }), item("b", { z: 7 })])).toBe(8);
  });

  it("posição absoluta soma a do grupo", () => {
    const g = item("g", { tipo: "grupo", x: 100, y: 50 });
    const f = item("f", { grupoId: "g", x: 10, y: 5 });
    expect(posicaoAbsoluta(f, [g, f])).toEqual({ x: 110, y: 55 });
    expect(posicaoAbsoluta(g, [g, f])).toEqual({ x: 100, y: 50 });
  });
});
