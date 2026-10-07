import { describe, expect, it } from "vitest";
import {
  TEMAS,
  carregarTokens,
  contraste,
  valorDoToken,
  type Tema,
} from "../../scripts/tokens.mts";

/**
 * Garante acessibilidade (WCAG 2.2 AA) nos 3 temas, direto dos tokens.
 *
 *  - TEXTO normal: contraste mínimo de 4,5:1
 *  - ELEMENTOS de interface (bordas de campo, anel de foco): mínimo de 3:1
 *
 * Se alguém mexer num token e quebrar um par, o teste falha e diz qual.
 */
const tokens = carregarTokens();
const cor = (nome: string, tema: Tema) => valorDoToken(tokens, nome, tema);

const SUPERFICIES = ["bg", "surface", "surface-raised"] as const;

// [texto, fundo, mínimo, motivo]
type Par = [string, string, number, string];
const pares: Par[] = [
  ...SUPERFICIES.flatMap((s): Par[] => [
    ["ink", s, 4.5, "texto principal"],
    ["ink-muted", s, 4.5, "texto secundário"],
    ["accent", s, 4.5, "texto/link dourado"],
    ["success", s, 4.5, "estado: sucesso"],
    ["warning", s, 4.5, "estado: aviso"],
    ["danger", s, 4.5, "estado: erro"],
    ["info", s, 4.5, "estado: informação"],
    ["accent", s, 3, "anel de foco (2px) visível"],
  ]),
  ["on-accent", "accent", 4.5, "texto do botão primário"],
  ["on-accent", "accent-hover", 4.5, "texto do botão primário (hover)"],
  ["ink", "brand", 4.5, "texto de chip de trilha"],
  ["ink", "brand-soft", 4.5, "texto em tag selecionada"],
  ["accent", "brand-soft", 3, "barra de progresso sobre a trilha"],
  // Borda de input/checkbox precisa ser perceptível (WCAG 1.4.11).
  ["border-strong", "bg", 3, "borda de campo sobre o fundo"],
  ["border-strong", "surface", 3, "borda de campo dentro de card"],
  ["border-strong", "surface-raised", 3, "borda de campo dentro de modal"],
];

describe.each(TEMAS)("contraste do tema %s", (tema) => {
  it.each(pares)("%s sobre %s ≥ %s:1 (%s)", (texto, fundo, minimo) => {
    const razao = contraste(cor(texto, tema), cor(fundo, tema));
    expect(
      razao,
      `${texto} (${cor(texto, tema)}) sobre ${fundo} (${cor(fundo, tema)})`,
    ).toBeGreaterThanOrEqual(minimo);
  });
});

describe("completude dos temas", () => {
  it("todo token de cor por tema define os 3 temas", () => {
    for (const token of tokens.color.tokens) {
      if (typeof token.value === "string") continue;
      for (const tema of TEMAS) {
        expect(token.value[tema], `${token.name} sem valor para ${tema}`).toBeTruthy();
      }
    }
  });
});
