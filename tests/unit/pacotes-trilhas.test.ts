import { describe, expect, it } from "vitest";
import { PACOTES_DE_TRILHAS, acharTrilhaPorNome, dobrarTexto } from "@/features/tracks/pacotes";

describe("pacotes de trilhas (dados que vão para o banco)", () => {
  it("há um pacote 'em branco' sem trilhas", () => {
    expect(PACOTES_DE_TRILHAS.find((p) => p.id === "em-branco")?.trilhas).toEqual([]);
  });

  it("ids dos pacotes são únicos", () => {
    const ids = PACOTES_DE_TRILHAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PACOTES_DE_TRILHAS.map((p) => [p.id, p] as const))(
    "pacote %s respeita os limites do banco (nome 1–60, monograma 1–3, sem repetição)",
    (_id, pacote) => {
      const nomes = pacote.trilhas.map((t) => dobrarTexto(t.nome));
      expect(new Set(nomes).size, "nomes repetidos (índice único no banco)").toBe(nomes.length);
      for (const t of pacote.trilhas) {
        expect(t.nome.trim().length).toBeGreaterThanOrEqual(1);
        expect(t.nome.length).toBeLessThanOrEqual(60);
        expect(t.monograma.length).toBeGreaterThanOrEqual(1);
        expect(t.monograma.length).toBeLessThanOrEqual(3);
      }
    },
  );
});

describe("acharTrilhaPorNome", () => {
  const trilhas = [
    { name: "SQL" },
    { name: "Power BI" },
    { name: "Python" },
    { name: "Git + dbt" },
    { name: "Inglês" },
  ];

  it("ignora caixa e acento", () => {
    expect(acharTrilhaPorNome(trilhas, "sql")?.name).toBe("SQL");
    expect(acharTrilhaPorNome(trilhas, "ingles")?.name).toBe("Inglês");
    expect(acharTrilhaPorNome(trilhas, "INGLÊS")?.name).toBe("Inglês");
  });

  it("hífen do #power-bi vira espaço", () => {
    expect(acharTrilhaPorNome(trilhas, "power bi")?.name).toBe("Power BI");
    expect(acharTrilhaPorNome(trilhas, "git dbt")?.name).toBe("Git + dbt");
  });

  it("aceita início inequívoco, mas recusa quando há ambiguidade", () => {
    expect(acharTrilhaPorNome(trilhas, "pow")?.name).toBe("Power BI");
    expect(acharTrilhaPorNome(trilhas, "p")).toBeUndefined(); // Power BI e Python
  });

  it("trilha inexistente ou consulta vazia: undefined", () => {
    expect(acharTrilhaPorNome(trilhas, "azure")).toBeUndefined();
    expect(acharTrilhaPorNome(trilhas, "")).toBeUndefined();
    expect(acharTrilhaPorNome(trilhas, "   ")).toBeUndefined();
  });
});
