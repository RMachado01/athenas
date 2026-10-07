import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BrowserContext } from "@playwright/test";

/** Nome do cookie de tema (o mesmo de lib/tema.ts). */
export const COOKIE_TEMA = "athenas-theme";

export type Tema = "ponderosa" | "burgundy" | "camel" | "amethyst" | "volt" | "mono" | "amber";

/**
 * Lê o token "bg" direto do tokens.json (a fonte única de verdade).
 * Não reutilizamos scripts/tokens.mts porque o Playwright carrega TypeScript como CommonJS,
 * e aquele arquivo usa import.meta (módulo ES).
 */
const tokens = JSON.parse(
  readFileSync(resolve(process.cwd(), "docs/design-system/tokens.json"), "utf-8"),
) as { color: { tokens: { name: string; value: string | Record<Tema, string> }[] } };

/** "#0b1f19" -> "rgb(11, 31, 25)": o formato que o navegador devolve em getComputedStyle. */
function hexParaRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** Cor de fundo (token "bg") esperada para um tema, no formato do navegador. */
export function fundoEsperado(tema: Tema): string {
  const bg = tokens.color.tokens.find((t) => t.name === "bg");
  if (!bg || typeof bg.value === "string") throw new Error("Token bg ausente ou sem temas.");
  return hexParaRgb(bg.value[tema]);
}

/** Simula um usuário que já escolheu um tema antes (cookie salvo). */
export async function definirCookieDeTema(context: BrowserContext, valor: string) {
  await context.addCookies([{ name: COOKIE_TEMA, value: valor, url: "http://localhost:3112" }]);
}
