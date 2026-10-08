"use client";

import * as m from "motion/react-m";
import { DURACAO, EASE_OUT } from "@/lib/movimento";

export interface BarraDoGrafico {
  rotulo: string;
  valor: number;
  /** A barra "do momento" (hoje) ganha cor cheia e brilho. */
  destaque?: boolean;
  /** Dia que ainda não chegou: só o trilho, sem barra. */
  futuro?: boolean;
}

/**
 * Gráfico de barras com a barra de destaque brilhando (referência "Kalo"). As barras crescem
 * de baixo para cima com `scaleY` (transform: barato e sem mexer no layout). Para leitor de
 * tela, o gráfico inteiro é uma imagem com o resumo em `descricao`.
 */
export function GraficoDeBarras({
  barras,
  descricao,
  altura = 132,
}: {
  barras: readonly BarraDoGrafico[];
  descricao: string;
  altura?: number;
}) {
  const maximo = Math.max(1, ...barras.map((b) => b.valor));

  return (
    <div role="img" aria-label={descricao} className="flex items-end justify-between gap-2">
      {barras.map((b, i) => {
        const proporcao = b.valor / maximo;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2" aria-hidden="true">
            <div
              className="bg-ink/[0.07] relative flex w-full max-w-9 items-end overflow-hidden rounded-pill"
              style={{ height: altura }}
            >
              {!b.futuro && b.valor > 0 && (
                <m.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: DURACAO.lenta, ease: EASE_OUT, delay: i * 0.04 }}
                  className="w-full origin-bottom rounded-pill"
                  style={{
                    height: `${Math.max(10, proporcao * 100)}%`,
                    background: b.destaque
                      ? "linear-gradient(to top, color-mix(in srgb, var(--accent) 70%, transparent), var(--accent))"
                      : "linear-gradient(to top, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent) 45%, transparent))",
                    boxShadow: b.destaque
                      ? "0 0 18px color-mix(in srgb, var(--accent) 60%, transparent)"
                      : undefined,
                  }}
                />
              )}
            </div>
            <span
              className={`text-body-sm font-semibold ${b.destaque ? "text-ink" : "text-ink-muted"}`}
            >
              {b.rotulo}
            </span>
          </div>
        );
      })}
    </div>
  );
}
