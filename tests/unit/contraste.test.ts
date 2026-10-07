import { describe, expect, it } from "vitest";
import {
  TEMAS,
  carregarTokens,
  comporSobre,
  contraste,
  lerCor,
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

/**
 * VIDRO: texto sobre material translúcido. O que o olho vê é o vidro SOBRE o fundo ambiente,
 * e o fundo varia (o brilho dourado/da marca é mais claro que o resto). Medimos o PIOR caso:
 * vidro sobre o fundo liso e sobre cada brilho no seu ponto mais forte.
 */
describe.each(TEMAS)("contraste sobre o vidro do tema %s (pior caso do fundo ambiente)", (tema) => {
  const bg = cor("bg", tema);
  const fundos = [
    ["fundo liso", bg],
    ...["ambient-1", "ambient-2", "ambient-3"].map(
      (n) => [`brilho ${n}`, comporSobre(bg, cor(n, tema))] as const,
    ),
  ] as const;
  const materiais = ["glass", "glass-strong", "card"] as const;

  const combinacoes = fundos.flatMap(([nomeFundo, fundo]) =>
    materiais.map((m) => [`${m} sobre ${nomeFundo}`, comporSobre(fundo, cor(m, tema))] as const),
  );

  it.each(combinacoes)("texto legível: %s", (_nome, superficie) => {
    for (const [texto, minimo] of [
      ["ink", 4.5],
      ["ink-muted", 4.5],
      ["accent", 4.5],
      ["danger", 4.5],
      ["success", 4.5],
      ["warning", 4.5],
      ["info", 4.5],
    ] as const) {
      const razao = contraste(cor(texto, tema), superficie);
      expect(razao, `${texto} sobre ${superficie}`).toBeGreaterThanOrEqual(minimo);
    }
  });

  it.each(combinacoes)("borda de campo visível (3:1): %s", (_nome, superficie) => {
    const razao = contraste(cor("border-strong", tema), superficie);
    expect(razao, `border-strong sobre ${superficie}`).toBeGreaterThanOrEqual(3);
  });

  it("texto do botão primário continua legível (sólido, sem transparência)", () => {
    expect(contraste(cor("on-accent", tema), cor("accent", tema))).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * TEXTO DIRETO SOBRE A NEBULOSA (títulos, rótulos e estados vazios ficam sem vidro por baixo).
 * Pior caso realista: cada brilho no seu ponto mais forte; e dois brilhos se encontrando, onde um
 * está no pico e o outro a ~40% da força (eles ficam em cantos diferentes: no encontro, cada um já
 * está longe do seu centro).
 */
const escalar = (corRgba: string, fator: number) => {
  const c = lerCor(corRgba);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a * fator})`;
};

describe.each(TEMAS)("contraste do texto direto sobre a nebulosa do tema %s", (tema) => {
  const bg = cor("bg", tema);
  const a = (n: string) => cor(n, tema);
  const fundos = [
    ["fundo liso", bg],
    ["brilho 1", comporSobre(bg, a("ambient-1"))],
    ["brilho 2", comporSobre(bg, a("ambient-2"))],
    ["brilho 3", comporSobre(bg, a("ambient-3"))],
    [
      "brilho 1 + 40% do 2",
      comporSobre(comporSobre(bg, a("ambient-1")), escalar(a("ambient-2"), 0.4)),
    ],
    [
      "brilho 2 + 40% do 1",
      comporSobre(comporSobre(bg, a("ambient-2")), escalar(a("ambient-1"), 0.4)),
    ],
    [
      "brilho 2 + 40% do 3",
      comporSobre(comporSobre(bg, a("ambient-2")), escalar(a("ambient-3"), 0.4)),
    ],
    [
      "brilho 3 + 40% do 2",
      comporSobre(comporSobre(bg, a("ambient-3")), escalar(a("ambient-2"), 0.4)),
    ],
  ] as const;

  it.each(fundos)("ink e ink-muted legíveis sobre %s", (_nome, fundo) => {
    expect(contraste(cor("ink", tema), fundo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(cor("ink-muted", tema), fundo)).toBeGreaterThanOrEqual(4.5);
  });
});
