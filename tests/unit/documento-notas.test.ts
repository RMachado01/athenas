import { describe, expect, it } from "vitest";
import {
  buscarNotas,
  chaveDoTitulo,
  extrairLinks,
  renomearLinks,
  trecho,
  type NoDoDocumento,
} from "@/features/notes/documento";

const link = (id: string, label: string): NoDoDocumento => ({
  type: "wikilink",
  attrs: { id, label },
});
const paragrafo = (...content: NoDoDocumento[]): NoDoDocumento => ({ type: "paragraph", content });

const doc: NoDoDocumento = {
  type: "doc",
  content: [
    paragrafo(
      { type: "text", text: "Ver " },
      link("a", "JOINs"),
      { type: "text", text: " e " },
      link("b", "CTEs"),
    ),
    {
      type: "bulletList",
      content: [{ type: "listItem", content: [paragrafo(link("a", "JOINs"))] }],
    },
    paragrafo({ type: "wikilink", attrs: { id: "", label: "quebrado" } }),
  ],
};

describe("extrairLinks", () => {
  it("acha links em qualquer profundidade, sem repetir e ignorando ids vazios", () => {
    expect(extrairLinks(doc)).toEqual(["a", "b"]);
  });
  it("documento vazio ou nulo", () => {
    expect(extrairLinks({ type: "doc", content: [] })).toEqual([]);
    expect(extrairLinks(null)).toEqual([]);
  });
});

describe("renomearLinks", () => {
  it("troca o rótulo pelo nome atual, mantendo o id", () => {
    const novo = renomearLinks(doc, new Map([["a", "Junções"]]));
    expect(JSON.stringify(novo)).toContain('"label":"Junções"');
    expect(JSON.stringify(novo)).not.toContain('"label":"JOINs"');
    expect(extrairLinks(novo)).toEqual(["a", "b"]);
    expect(JSON.stringify(doc)).toContain('"label":"JOINs"'); // não altera o original
  });
});

describe("títulos e busca", () => {
  it("chave do título ignora maiúsculas e espaços nas pontas", () => {
    expect(chaveDoTitulo("  Window FUNCTIONS ")).toBe("window functions");
  });

  const notas = [
    { id: "1", titulo: "Revisão geral", texto: "inclui funções de janela" },
    { id: "2", titulo: "Funções de janela", texto: "" },
    { id: "3", titulo: "SQL: funções", texto: "" },
    { id: "4", titulo: "Outra", texto: "nada a ver" },
  ];

  it("começa com > contém no título > contém no texto; sem acento também acha", () => {
    expect(buscarNotas(notas, "funcoes").map((n) => n.id)).toEqual(["2", "3", "1"]);
  });

  it("sem termo devolve tudo na ordem original", () => {
    expect(buscarNotas(notas, "  ").map((n) => n.id)).toEqual(["1", "2", "3", "4"]);
  });
});

describe("trecho", () => {
  const longo = `${"a ".repeat(100)}PALAVRA-CHAVE ${"b ".repeat(100)}`;

  it("texto curto volta inteiro (espaços normalizados)", () => {
    expect(trecho("  um   texto \n curto ")).toBe("um texto curto");
  });

  it("sem termo: começo + reticências", () => {
    expect(trecho(longo, "", 20)).toBe("a a a a a a a a a a…");
  });

  it("com termo: recorte em volta, com reticências dos dois lados", () => {
    const t = trecho(longo, "palavra-chave", 40);
    expect(t.startsWith("…")).toBe(true);
    expect(t.endsWith("…")).toBe(true);
    expect(t).toContain("PALAVRA-CHAVE");
  });
});
