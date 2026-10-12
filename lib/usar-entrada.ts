"use client";

import { useReducedMotionConfig } from "motion/react";
import { ENTRADA, atrasoDeCascata } from "./movimento";

/**
 * Devolve uma função `entrada(indice)` com as props de entrada (fade + 8px, em cascata de 40 ms)
 * para um `m.*`, já respeitando "reduzir movimento".
 *
 * Por que não basta o <MotionConfig reducedMotion>? Ele só desliga animações de TRANSFORM;
 * o fade de opacidade continuaria. Para quem pediu menos movimento (no aparelho ou em
 * Personalização), o conteúdo aparece direto, sem fade.
 */
export function useEntrada() {
  const reduzido = useReducedMotionConfig();
  return (indice = 0) =>
    reduzido
      ? { initial: false as const }
      : {
          initial: ENTRADA.initial,
          animate: ENTRADA.animate,
          transition: { ...ENTRADA.transition, delay: atrasoDeCascata(indice) },
        };
}
