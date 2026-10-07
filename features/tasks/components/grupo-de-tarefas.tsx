"use client";

import { AnimatePresence } from "motion/react";
import { useId, type ReactNode } from "react";

/**
 * Seção da lista ("Atrasadas · 2", "Hoje · 3"…): título em CAIXA ALTA + lista.
 * "Atrasadas" usa o tom de perigo só no TEXTO do título (nunca em bloco grande), como no design.
 */
export function GrupoDeTarefas({
  titulo,
  quantidade,
  tom = "neutro",
  children,
}: {
  titulo: string;
  quantidade: number;
  tom?: "neutro" | "perigo";
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2
        id={id}
        className={`text-label uppercase ${tom === "perigo" ? "text-danger" : "text-ink-muted"}`}
      >
        {titulo} · {quantidade}
      </h2>
      <ul role="list" className="flex flex-col gap-2">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </ul>
    </section>
  );
}
