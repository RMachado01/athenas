/**
 * Utilidades dos design tokens do Athenas.
 *
 * A fonte única de verdade é `docs/design-system/tokens.json`. Este arquivo:
 *  1. lê e valida o JSON;
 *  2. calcula contraste WCAG 2.2 entre dois tokens;
 *  3. é usado tanto pelo gerador de CSS (scripts/build-tokens.ts) quanto pelos testes.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const TEMAS = ["ponderosa", "burgundy", "camel"] as const;
export type Tema = (typeof TEMAS)[number];

/** Um token de cor vale para todos os temas (string) ou muda por tema (objeto). */
export type ValorToken = string | Record<Tema, string>;

export interface TokenCor {
  name: string;
  value: ValorToken;
  usage: string;
}

export interface TokenSimples {
  name: string;
  value: ValorToken;
  usage?: string;
}

export interface EstiloTipografico {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
}

export interface Tokens {
  color: { tokens: TokenCor[] };
  type: {
    families: { display: string; sans: string; mono: string };
    groups: { name: string; family: string; styles: EstiloTipografico[] }[];
  };
  spacing: { tokens: TokenSimples[] };
  radius: { tokens: TokenSimples[] };
  shadow: { tokens: TokenSimples[] };
  duration: { tokens: TokenSimples[] };
  easing: { tokens: TokenSimples[] };
}

const CAMINHO_TOKENS = fileURLToPath(new URL("../docs/design-system/tokens.json", import.meta.url));

export function carregarTokens(caminho: string = CAMINHO_TOKENS): Tokens {
  return JSON.parse(readFileSync(caminho, "utf-8")) as Tokens;
}

/** Valor de um token de cor para um tema específico (resolve aliases como "{accent}"). */
export function valorDoToken(tokens: Tokens, nome: string, tema: Tema): string {
  const token = tokens.color.tokens.find((t) => t.name === nome);
  if (!token) throw new Error(`Token de cor inexistente: ${nome}`);
  const bruto = typeof token.value === "string" ? token.value : token.value[tema];
  const alias = /^\{(.+)\}$/.exec(bruto);
  return alias?.[1] ? valorDoToken(tokens, alias[1], tema) : bruto;
}

// ---------------------------------------------------------------------------
// Contraste (fórmulas da WCAG 2.2)
// ---------------------------------------------------------------------------

/** Converte "#rrggbb" em [r, g, b] de 0 a 255. Só aceita cores opacas. */
function hexParaRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) throw new Error(`Cor inválida para contraste (use #rrggbb): ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminância relativa: quão "clara" a cor parece ao olho humano (0 = preto, 1 = branco). */
function luminancia(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map((canal) => {
    const c = canal / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste entre duas cores, de 1:1 (igual) a 21:1 (preto no branco). */
export function contraste(corA: string, corB: string): number {
  const [maior, menor] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (maior + 0.05) / (menor + 0.05);
}
