"use client";

import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { DURACAO, EASE_OUT } from "@/lib/movimento";

/**
 * Anel de progresso (referência "streak ring" e "Daily goal"): trilho em vidro e arco na cor do
 * tema que CRESCE do valor anterior até o novo (stroke-dashoffset, só transform/atributo SVG).
 * O conteúdo do meio (número, ícone) vem como `children`.
 */
export function AnelDeProgresso({
  valor,
  rotulo,
  tamanho = 112,
  espessura = 10,
  children,
}: {
  /** 0 a 100. */
  valor: number;
  rotulo: string;
  tamanho?: number;
  espessura?: number;
  children?: ReactNode;
}) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;

  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative grid shrink-0 place-items-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden="true">
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={espessura}
        />
        <m.circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          initial={false}
          animate={{ strokeDashoffset: circunferencia * (1 - v / 100) }}
          transition={{ duration: DURACAO.lenta, ease: EASE_OUT }}
          style={{
            filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 55%, transparent))",
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
