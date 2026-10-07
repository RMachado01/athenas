"use client";

import * as m from "motion/react-m";
import { Tabs } from "radix-ui";
import { useId, type ReactNode } from "react";
import { MOLA } from "@/lib/movimento";

export interface OpcaoSegmentada<T extends string> {
  id: T;
  rotulo: string;
}

/**
 * Controle segmentado em pílula (referência "Week | Month | 3 Months | Year"): trilho de vidro e
 * uma pílula colorida que DESLIZA até a opção escolhida (mola do design system).
 * Usa Radix Tabs: setas do teclado, Home/End e papéis ARIA já corretos.
 * O conteúdo de cada aba é renderizado por quem usa, em `children` (uma só região ativa).
 */
export function Segmentado<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  children,
}: {
  rotulo: string;
  opcoes: readonly OpcaoSegmentada<T>[];
  valor: T;
  aoMudar: (novo: T) => void;
  children?: ReactNode;
}) {
  const idDoIndicador = useId();
  return (
    <Tabs.Root value={valor} onValueChange={(v) => aoMudar(v as T)}>
      <Tabs.List
        aria-label={rotulo}
        className="vidro rounded-pill flex w-full gap-1 overflow-x-auto p-1"
      >
        {opcoes.map((o) => (
          <Tabs.Trigger
            key={o.id}
            value={o.id}
            className={`rounded-pill relative min-h-11 flex-1 cursor-pointer px-3 font-semibold whitespace-nowrap transition-colors duration-(--duration-fast) ${
              valor === o.id ? "text-on-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {valor === o.id && (
              <m.span
                layoutId={`indicador-${idDoIndicador}`}
                transition={MOLA}
                className="bg-accent rounded-pill absolute inset-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_8px_20px_-10px_var(--accent)]"
                aria-hidden="true"
              />
            )}
            <span className="relative">{o.rotulo}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {children && (
        <Tabs.Content value={valor} className="mt-5 outline-none">
          {children}
        </Tabs.Content>
      )}
    </Tabs.Root>
  );
}
