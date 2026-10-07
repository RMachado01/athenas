"use client";

import * as m from "motion/react-m";
import { DURACAO, EASE_OUT } from "@/lib/movimento";

/**
 * Checkbox animado do design (TaskItem): o traço do "✓" é DESENHADO (pathLength 0 → 1).
 * Visual de 22px dentro de uma área de toque de 44px (WCAG 2.5.8 pede ≥ 24px; usamos 44).
 * É um <button aria-pressed>, operável por teclado (Espaço/Enter).
 */
export function BotaoCheck({
  marcado,
  rotulo,
  onAlternar,
}: {
  marcado: boolean;
  /** Ex.: "Concluir tarefa: Window functions". Descreve a AÇÃO. */
  rotulo: string;
  onAlternar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcado}
      aria-label={rotulo}
      onClick={onAlternar}
      className="grid size-11 shrink-0 cursor-pointer place-items-center"
    >
      <m.span
        whileTap={{ scale: 0.92 }}
        transition={{ duration: DURACAO.instante, ease: EASE_OUT }}
        className={`grid size-[22px] place-items-center rounded-sm border-[1.5px] transition-colors duration-(--duration-instant) ${
          marcado ? "border-accent bg-accent" : "border-border-strong bg-transparent"
        }`}
      >
        <svg viewBox="0 0 16 16" className="text-on-accent size-3.5" aria-hidden="true">
          <m.path
            d="M3 8.5l3 3 7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: marcado ? 1 : 0 }}
            transition={{ duration: DURACAO.base, ease: EASE_OUT }}
          />
        </svg>
      </m.span>
    </button>
  );
}
