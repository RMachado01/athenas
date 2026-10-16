import { varDaCor, type CorDoMural } from "@/features/boards/cores";

/**
 * Fundo suave de uma cor de trilha: mistura a cor com o "surface" do tema (como os post-its dos
 * murais), então sempre combina com o tema e o texto (--ink) mantém contraste.
 * `forca` é a porcentagem da cor (0 a 100). Sem cor (sem trilha) usa o fundo neutro dos cartões.
 */
export function tomDaCor(cor: CorDoMural | null, forca: number): string {
  return cor ? `color-mix(in srgb, ${varDaCor(cor)} ${forca}%, var(--surface))` : "var(--card)";
}
