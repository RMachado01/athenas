import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gerarCss } from "../../scripts/build-tokens.mts";

/**
 * Testa o gerador de CSS dos temas e garante que `styles/tokens.css`
 * (arquivo commitado) nunca fique para trás de `tokens.json`.
 */
const css = gerarCss();

describe("styles/tokens.css gerado", () => {
  it("está em dia com tokens.json (rode `pnpm tokens:build` se este teste falhar)", () => {
    const commitado = readFileSync(new URL("../../styles/tokens.css", import.meta.url), "utf-8");
    expect(commitado).toBe(css);
  });

  it("define os 3 temas, com color-scheme correto", () => {
    expect(css).toContain('[data-theme="ponderosa"]');
    expect(css).toContain('[data-theme="burgundy"]');
    expect(css).toContain('[data-theme="camel"]');
    // escuro: ponderosa, burgundy e o automático à noite; claro: camel e o automático de dia
    expect(css.match(/color-scheme: dark;/g)?.length).toBe(3);
    expect(css.match(/color-scheme: light;/g)?.length).toBe(2);
  });

  it('o modo "auto" usa o claro/escuro do aparelho, sem JavaScript', () => {
    expect(css).toContain('html[data-theme="auto"]');
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });

  it("expõe as cores semânticas ao Tailwind e remove a paleta padrão", () => {
    expect(css).toContain("--color-*: initial;");
    expect(css).toContain("--color-surface: var(--surface);");
    expect(css).toContain("--color-accent: var(--accent);");
  });

  it("não deixa nenhum alias {token} sem resolver", () => {
    expect(css).not.toMatch(/\{[a-z-]+\}/);
  });
});
