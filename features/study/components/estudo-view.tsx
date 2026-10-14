"use client";

import {
  CalendarDays,
  ChevronRight,
  FileText,
  Layers,
  LayoutDashboard,
  Target,
  type LucideIcon,
} from "lucide-react";
import * as m from "motion/react-m";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEntrada } from "@/lib/usar-entrada";
import { usePerfil } from "@/lib/perfil";
import { useMurais } from "@/features/boards/queries";
import { totalParaRevisar } from "@/features/flashcards/components/flashcards-view";
import { useBaralhos } from "@/features/flashcards/queries";
import { useMetas } from "@/features/goals/queries";
import { useNotas } from "@/features/notes/queries";

/** Texto de contagem com singular/plural ("1 nota", "3 notas"); vazio enquanto carrega. */
function contar(n: number | undefined, um: string, varios: string): string {
  if (n === undefined) return "";
  return `${n} ${n === 1 ? um : varios}`;
}

/**
 * Aba "Estudo": a porta de entrada para as ferramentas de aprender e planejar (antes ficavam
 * escondidas no menu do avatar). Flashcards em destaque, porque a revisão do dia é o hábito
 * que mais rende; depois Notas e Murais (aprender) e Agenda e Metas (planejar).
 * `caminhoBase` permite usar a mesma tela no laboratório (/dev/…).
 */
export function EstudoView({ caminhoBase = "" }: { caminhoBase?: string }) {
  const { data: baralhos } = useBaralhos();
  const { data: perfil } = usePerfil();
  const { data: notas } = useNotas();
  const { data: murais } = useMurais();
  const { data: metas } = useMetas();
  const entrada = useEntrada();

  const paraRevisar = baralhos ? totalParaRevisar(baralhos, perfil?.new_cards_per_day ?? 10) : 0;
  const temCartoes = baralhos?.some((b) => b.total > 0) ?? false;
  const resumoDosCartoes = !baralhos
    ? ""
    : !temCartoes
      ? "Crie seu primeiro baralho"
      : paraRevisar === 0
        ? "Tudo em dia hoje"
        : `${paraRevisar} para revisar hoje`;

  return (
    <main className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-1">
        <span className="text-ink-muted text-body-sm font-medium">Aprender e planejar</span>
        <h1 className="font-display text-display-lg">Estudo</h1>
      </header>

      <m.div {...entrada(0)}>
        <Link
          href={`${caminhoBase}/flashcards`}
          className="cartao tocavel flex items-center gap-4 rounded-xl p-5"
        >
          <span className="bg-brand-soft/60 grid size-12 shrink-0 place-items-center rounded-md">
            <Layers className="text-accent size-6" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-heading-2">Flashcards</span>
            <span className="text-ink-muted text-body-sm">{resumoDosCartoes}</span>
          </span>
          {paraRevisar > 0 && (
            <span className="bg-accent text-on-accent rounded-pill min-w-8 px-2.5 py-1 text-center font-semibold tabular-nums">
              {paraRevisar}
            </span>
          )}
          <ChevronRight className="text-ink-muted size-5 shrink-0" aria-hidden />
        </Link>
      </m.div>

      <Secao titulo="Aprender" indice={1}>
        <Bloco
          href={`${caminhoBase}/notas`}
          Icone={FileText}
          titulo="Notas"
          detalhe={contar(notas?.length, "nota", "notas")}
        />
        <Bloco
          href={`${caminhoBase}/murais`}
          Icone={LayoutDashboard}
          titulo="Murais"
          detalhe={contar(murais?.length, "mural", "murais")}
        />
      </Secao>

      <Secao titulo="Planejar" indice={2}>
        <Bloco
          href={`${caminhoBase}/agenda`}
          Icone={CalendarDays}
          titulo="Agenda"
          detalhe="Seu dia hora a hora"
        />
        <Bloco
          href={`${caminhoBase}/metas`}
          Icone={Target}
          titulo="Metas"
          detalhe={contar(metas?.length, "meta ativa", "metas ativas")}
        />
      </Secao>
    </main>
  );
}

function Secao({
  titulo,
  indice,
  children,
}: {
  titulo: string;
  indice: number;
  children: ReactNode;
}) {
  const entrada = useEntrada();
  return (
    <m.section {...entrada(indice)} aria-label={titulo} className="flex flex-col gap-3">
      <h2 className="text-label text-ink-muted uppercase">{titulo}</h2>
      <ul role="list" className="grid grid-cols-2 gap-3">
        {children}
      </ul>
    </m.section>
  );
}

function Bloco({
  href,
  Icone,
  titulo,
  detalhe,
}: {
  href: string;
  Icone: LucideIcon;
  titulo: string;
  detalhe: string;
}) {
  return (
    <li>
      <Link href={href} className="cartao tocavel flex h-full flex-col gap-4 rounded-xl p-4">
        <span className="bg-brand-soft/60 grid size-10 place-items-center rounded-md">
          <Icone className="text-accent size-5" aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="font-semibold">{titulo}</span>
          <span className="text-ink-muted text-body-sm min-h-5">{detalhe}</span>
        </span>
      </Link>
    </li>
  );
}
