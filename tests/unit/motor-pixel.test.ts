import { describe, expect, it } from "vitest";
import {
  componer,
  contornar,
  espelhar,
  faixaSvg,
  gradeParaSvg,
  runsDaGrade,
  validarGrade,
} from "@/features/pixel/motor";

const PALETA = { o: "#111111", b: "#ee8888", e: "#000000" };

describe("componer: junta peças numa tela só", () => {
  it("cria a tela transparente do tamanho pedido", () => {
    expect(componer([], 3, 2)).toEqual(["...", "..."]);
  });

  it("posiciona as peças; a de cima vence a de baixo (ponto = transparente)", () => {
    const base = { grade: ["bbb", "bbb"], x: 0, y: 0 };
    const cima = { grade: ["e.", ".e"], x: 1, y: 0 };
    expect(componer([base, cima], 4, 2)).toEqual(["beb.", "bbe."]);
  });

  it("peça que passa da borda é cortada, sem erro", () => {
    expect(componer([{ grade: ["bb", "bb"], x: 2, y: 1 }], 3, 2)).toEqual(["...", "..b"]);
  });
});

describe("contornar: contorno automático em volta do desenho", () => {
  it("põe o símbolo de contorno em toda célula vazia que encosta (cima, baixo, esquerda, direita)", () => {
    const g = ["...", ".b.", "..."];
    expect(contornar(g, "o")).toEqual([".o.", "obo", ".o."]);
  });

  it("não contorna diagonais e não mexe no que já está preenchido", () => {
    const g = ["b.", ".b"];
    expect(contornar(g, "o")).toEqual(["bo", "ob"]);
  });
});

describe("espelhar: vira o desenho para o outro lado", () => {
  it("inverte cada linha", () => {
    expect(espelhar(["be.", "..o"])).toEqual([".eb", "o.."]);
  });
});

describe("runsDaGrade: junta pixels vizinhos de mesma cor em retângulos", () => {
  it("uma linha com a mesma cor vira UM retângulo", () => {
    expect(runsDaGrade(["bbb"], PALETA)).toEqual([{ x: 0, y: 0, w: 3, cor: "#ee8888" }]);
  });

  it("transparente separa os retângulos e símbolos sem cor são ignorados", () => {
    expect(runsDaGrade(["b.bz"], PALETA)).toEqual([
      { x: 0, y: 0, w: 1, cor: "#ee8888" },
      { x: 2, y: 0, w: 1, cor: "#ee8888" },
    ]);
  });
});

describe("SVG", () => {
  it("gradeParaSvg usa viewBox em pixels do desenho e bordas nítidas", () => {
    const svg = gradeParaSvg(["bo", "eb"], PALETA);
    expect(svg).toContain('viewBox="0 0 2 2"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('fill="#ee8888"');
  });

  it("faixaSvg põe os quadros lado a lado", () => {
    const f = faixaSvg(
      [
        ["bb", "bb"],
        ["ee", "ee"],
      ],
      PALETA,
    );
    expect(f.largura).toBe(2);
    expect(f.altura).toBe(2);
    expect(f.quadros).toBe(2);
    expect(f.svg).toContain('viewBox="0 0 4 2"');
    // o 2º quadro começa no x = 2
    expect(f.svg).toContain('x="2"');
    expect(f.url.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("faixaSvg recusa quadros de tamanhos diferentes", () => {
    expect(() => faixaSvg([["bb"], ["bbb"]], PALETA)).toThrow(/mesmo tamanho/);
  });
});

describe("validarGrade", () => {
  it("aceita grade retangular só com símbolos conhecidos", () => {
    expect(validarGrade(["b.o", "ebe"], new Set(["b", "o", "e"]))).toEqual([]);
  });

  it("aponta linha de largura diferente e símbolo desconhecido", () => {
    const erros = validarGrade(["bb", "bbb", "bz"], new Set(["b"]));
    expect(erros.some((e) => e.includes("linha 1") && e.includes("largura"))).toBe(true);
    expect(erros.some((e) => e.includes("z"))).toBe(true);
  });
});
