import { describe, expect, it } from "vitest";
import {
  ALTURA_DA_SALA,
  CHAO_Y,
  LARGURA_DA_SALA,
  desenharSala,
} from "@/features/pixel/sala/desenho";

describe("desenho da sala", () => {
  const sala = desenharSala();

  it("é sempre igual (nada de sorteio de verdade): duas chamadas dão o mesmo desenho", () => {
    expect(desenharSala()).toEqual(sala);
  });

  it("todo retângulo cabe na tela de 160 x 100, em pixels inteiros", () => {
    for (const r of sala) {
      expect(Number.isInteger(r.x) && Number.isInteger(r.y), JSON.stringify(r)).toBe(true);
      expect(Number.isInteger(r.w) && Number.isInteger(r.h), JSON.stringify(r)).toBe(true);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, JSON.stringify(r)).toBeLessThanOrEqual(LARGURA_DA_SALA);
      expect(r.y + r.h, JSON.stringify(r)).toBeLessThanOrEqual(ALTURA_DA_SALA);
    }
  });

  it("usa só cores em hexadecimal e transparência entre 0 e 1", () => {
    for (const r of sala) {
      expect(r.cor).toMatch(/^#[0-9a-f]{6}$/i);
      if (r.opacidade !== undefined) {
        expect(r.opacidade).toBeGreaterThan(0);
        expect(r.opacidade).toBeLessThanOrEqual(1);
      }
    }
  });

  it("tem as peças da biblioteca: muitas lombadas, janela com lua, abajur e piso", () => {
    const cores = new Set(sala.map((r) => r.cor));
    expect(sala.length).toBeGreaterThan(200); // estantes cheias de livros
    expect(cores.has("#f4eac0")).toBe(true); // lua
    expect(cores.has("#f2b84b")).toBe(true); // abajur
    expect(sala.some((r) => r.y >= CHAO_Y && r.w === LARGURA_DA_SALA)).toBe(true); // piso
  });

  it("o brilho do abajur é em degraus de transparência (pixel, não degradê)", () => {
    const brilho = sala.filter((r) => r.cor === "#ffcf6b" && r.opacidade !== undefined);
    expect(brilho.length).toBeGreaterThanOrEqual(3);
  });
});
