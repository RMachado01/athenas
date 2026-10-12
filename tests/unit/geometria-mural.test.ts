import { describe, expect, it } from "vitest";
import { CORES_DO_MURAL, ehCorDoMural, ehIconeDoMural } from "@/features/boards/cores";
import {
  centroVisivel,
  encaixar,
  envoltorio,
  grupoSobOPonto,
  limitarTamanho,
  paraAbsoluta,
  paraRelativa,
  posicaoDeNovoItem,
  TAMANHO_PADRAO,
} from "@/features/boards/geometria";

describe("grade e tamanhos", () => {
  it("encaixa na grade de 16", () => {
    expect([encaixar(7), encaixar(8), encaixar(23), encaixar(-9)]).toEqual([0, 16, 16, -16]);
  });

  it("respeita mínimo por tipo e o máximo do banco", () => {
    expect(limitarTamanho("nota", 10, 10)).toEqual({ w: 112, h: 80 });
    expect(limitarTamanho("grupo", 9000, 300.4)).toEqual({ w: 4000, h: 300 });
  });
});

describe("câmera e item novo", () => {
  const tela = { largura: 400, altura: 800 };

  it("centro visível considera deslocamento e zoom", () => {
    expect(centroVisivel({ x: 0, y: 0, zoom: 1 }, tela)).toEqual({ x: 200, y: 400 });
    expect(centroVisivel({ x: -200, y: 100, zoom: 2 }, tela)).toEqual({ x: 200, y: 150 });
  });

  it("nasce centralizado e encaixado", () => {
    const r = posicaoDeNovoItem("nota", { x: 0, y: 0, zoom: 1 }, tela, []);
    expect(r).toEqual({ x: 96, y: 320, ...TAMANHO_PADRAO.nota });
  });

  it("se já tem um item no mesmo lugar, desce em diagonal", () => {
    const primeiro = posicaoDeNovoItem("nota", { x: 0, y: 0, zoom: 1 }, tela, []);
    const segundo = posicaoDeNovoItem("nota", { x: 0, y: 0, zoom: 1 }, tela, [primeiro]);
    expect([segundo.x - primeiro.x, segundo.y - primeiro.y]).toEqual([32, 32]);
    const terceiro = posicaoDeNovoItem("nota", { x: 0, y: 0, zoom: 1 }, tela, [primeiro, segundo]);
    expect([terceiro.x - primeiro.x, terceiro.y - primeiro.y]).toEqual([64, 64]);
  });
});

describe("grupos", () => {
  it("converte posição relativa ↔ absoluta", () => {
    const g = { x: 100, y: 50 };
    expect(paraRelativa({ x: 130, y: 90 }, g)).toEqual({ x: 30, y: 40 });
    expect(paraAbsoluta({ x: 30, y: 40 }, g)).toEqual({ x: 130, y: 90 });
  });

  it("acha o grupo de cima sob o ponto (e ignora o próprio item)", () => {
    const grupos = [
      { id: "a", x: 0, y: 0, w: 500, h: 500, z: 1 },
      { id: "b", x: 100, y: 100, w: 100, h: 100, z: 2 },
    ];
    expect(grupoSobOPonto({ x: 150, y: 150 }, grupos)?.id).toBe("b");
    expect(grupoSobOPonto({ x: 150, y: 150 }, grupos, "b")?.id).toBe("a");
    expect(grupoSobOPonto({ x: 900, y: 900 }, grupos)).toBeNull();
  });

  it("envoltório de todos os itens", () => {
    expect(envoltorio([])).toBeNull();
    expect(
      envoltorio([
        { x: 0, y: 10, w: 100, h: 50 },
        { x: -20, y: 200, w: 40, h: 40 },
      ]),
    ).toEqual({ x: -20, y: 10, w: 120, h: 230 });
  });
});

describe("paleta e ícones", () => {
  it("8 cores, as mesmas do banco", () => {
    expect(CORES_DO_MURAL.map((c) => c.id)).toEqual([
      "amarelo",
      "rosa",
      "verde",
      "azul",
      "roxo",
      "laranja",
      "cinza",
      "menta",
    ]);
    expect(ehCorDoMural("rosa")).toBe(true);
    expect(ehCorDoMural("neon")).toBe(false);
    expect(ehIconeDoMural("brain")).toBe(true);
    expect(ehIconeDoMural("<script>")).toBe(false);
  });
});
