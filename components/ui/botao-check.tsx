"use client";

import { useReducedMotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";
import { DURACAO, EASE_OUT, MOLA_CELEBRACAO } from "@/lib/movimento";
import { vibrar } from "@/lib/vibrar";

// Seis faíscas em círculo (ângulos em graus) que saem do centro do check ao concluir.
const FAISCAS = [0, 60, 120, 180, 240, 300];

/**
 * Checkbox animado do design (TaskItem): o traço do "✓" é DESENHADO (pathLength 0 → 1).
 * Visual de 22px dentro de uma área de toque de 44px (WCAG 2.5.8 pede ≥ 24px; usamos 44).
 * É um <button aria-pressed>, operável por teclado (Espaço/Enter).
 *
 * Ao CONCLUIR (não ao reabrir): pequeno "pop" com mola de celebração, faíscas douradas e uma
 * vibração curta no Android. Com "menos movimento", fica só o check e a vibração.
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
  const reduzido = useReducedMotionConfig();
  // Muda a cada conclusão: vira a `key` das faíscas, para a animação recomeçar do zero.
  const [celebracao, setCelebracao] = useState(0);

  function alternar() {
    if (!marcado) {
      vibrar("toque");
      if (!reduzido) setCelebracao((n) => n + 1);
    }
    onAlternar();
  }

  return (
    <button
      type="button"
      aria-pressed={marcado}
      aria-label={rotulo}
      onClick={alternar}
      className="relative grid size-11 shrink-0 cursor-pointer place-items-center"
    >
      <m.span
        key={celebracao}
        initial={celebracao > 0 ? { scale: 0.7 } : false}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.92 }}
        transition={
          celebracao > 0 ? MOLA_CELEBRACAO : { duration: DURACAO.instante, ease: EASE_OUT }
        }
        className={`grid size-[22px] place-items-center rounded-pill border-[1.75px] transition-colors duration-(--duration-instant) ${
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

      {celebracao > 0 && marcado && (
        <span key={celebracao} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {FAISCAS.map((angulo) => {
            const rad = (angulo * Math.PI) / 180;
            return (
              <m.span
                key={angulo}
                className="absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 rounded-pill"
                style={{ background: "var(--warning)" }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(rad) * 18, y: Math.sin(rad) * 18, opacity: 0, scale: 0.4 }}
                transition={{ duration: DURACAO.lenta, ease: EASE_OUT }}
              />
            );
          })}
        </span>
      )}
    </button>
  );
}
