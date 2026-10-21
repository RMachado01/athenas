/**
 * Desenhos pequenos que acompanham o pet: o coração do carinho e o "Zzz" do sono.
 * Mesma técnica dos pets (grade de letras + contorno automático), com 1 pixel de margem.
 */
import { componer, contornar, type Paleta } from "./motor";

function comContorno(preenchimento: readonly string[]): string[] {
  const largura = (preenchimento[0]?.length ?? 0) + 2;
  const altura = preenchimento.length + 2;
  return contornar(componer([{ grade: preenchimento, x: 1, y: 1 }], largura, altura));
}

export const CORACAO: readonly string[] = comContorno([
  ".rr.rr.",
  "rlrrrrr",
  "rrrrrrr",
  ".rrrrr.",
  "..rrr..",
  "...r...",
]);

export const PALETA_DO_CORACAO: Paleta = {
  o: "#7a1f2b",
  r: "#e8506a",
  l: "#ffa3b5",
};

export const ZZ: readonly string[] = comContorno(["zzzzz", "...z.", "..z..", ".z...", "zzzzz"]);

export const PALETA_DO_ZZ: Paleta = {
  o: "#2b3350",
  z: "#cfe0ff",
};
