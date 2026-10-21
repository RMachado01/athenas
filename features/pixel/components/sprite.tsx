import { useMemo, type CSSProperties } from "react";
import { faixaSvg, type Grade, type Paleta } from "../motor";

/**
 * Mostra um desenho pixel animado: os quadros viram uma faixa (SVG) e o CSS `steps()` troca de
 * quadro sem suavizar (pixel de verdade, `image-rendering: pixelated`). Com "reduzir movimento"
 * as regras globais do app param a animação no 1º quadro.
 *
 * `escala` = quantos pixels da tela vale cada pixel do desenho (3 = 3x).
 * `rotulo` = texto para leitor de tela (a imagem em si é decorativa).
 */
export function Sprite({
  quadros,
  paleta,
  escala = 3,
  duracaoMs = 800,
  parado = false,
  rotulo,
  className = "",
  style,
}: {
  quadros: readonly Grade[];
  paleta: Paleta;
  escala?: number;
  duracaoMs?: number;
  /** true = fica no 1º quadro, sem animar. */
  parado?: boolean;
  rotulo?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const faixa = useMemo(() => faixaSvg(quadros, paleta), [quadros, paleta]);
  const largura = faixa.largura * escala;
  const altura = faixa.altura * escala;

  return (
    <span
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
      data-parado={parado ? "true" : undefined}
      className={`sprite inline-block shrink-0 ${className}`}
      style={
        {
          width: largura,
          height: altura,
          backgroundImage: `url("${faixa.url}")`,
          backgroundSize: `${largura * faixa.quadros}px ${altura}px`,
          "--larg": `${largura}px`,
          "--n": faixa.quadros,
          "--dur": `${duracaoMs}ms`,
          ...style,
        } as CSSProperties
      }
    />
  );
}
