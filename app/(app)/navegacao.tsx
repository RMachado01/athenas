"use client";

import { CalendarDays, ListChecks, LayoutDashboard, Palette, Target, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface Item {
  id: string;
  rotulo: string;
  href: string | null; // null = ainda não existe ("em breve")
  Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const ITENS: Item[] = [
  { id: "inicio", rotulo: "Início", href: "/", Icone: LayoutDashboard },
  { id: "tarefas", rotulo: "Tarefas", href: "/tarefas", Icone: ListChecks },
  { id: "calendario", rotulo: "Calendário", href: null, Icone: CalendarDays },
  { id: "metas", rotulo: "Metas", href: null, Icone: Target },
  { id: "foco", rotulo: "Foco", href: null, Icone: Timer },
  { id: "personalizacao", rotulo: "Personalização", href: null, Icone: Palette },
];

function ativo(item: Item, caminho: string): boolean {
  if (!item.href) return false;
  return item.href === "/" ? caminho === "/" : caminho.startsWith(item.href);
}

/**
 * Navegação principal (design: Nav.dc.html e Mobile.dc.html).
 *  - Desktop (≥1024px): barra lateral de 248px.
 *  - Celular: barra inferior com 4 abas e o botão central de Foco (FAB dourado).
 * O que ainda não existe aparece apagado, com "em breve", e não é clicável.
 */
export function Navegacao() {
  const caminho = usePathname();

  return (
    <>
      {/* Barra lateral */}
      <nav
        aria-label="Principal"
        className="bg-surface border-hairline sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-8 border-r px-4 py-7 lg:flex"
      >
        <Link href="/" className="flex items-center gap-3 px-2">
          <span
            aria-hidden="true"
            className="bg-brand font-display text-heading-2 grid size-10 place-items-center rounded-full"
          >
            A
          </span>
          <span className="font-display text-heading-1">Athenas</span>
        </Link>

        <ul role="list" className="flex flex-col gap-1">
          {ITENS.map((item) => (
            <li key={item.id}>
              <ItemDaBarra item={item} ativo={ativo(item, caminho)} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Barra inferior (celular) */}
      <nav
        aria-label="Principal"
        className="bg-surface border-hairline fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t px-3 pt-2 pb-5 lg:hidden"
      >
        <AbaInferior item={ITENS[0]!} ativo={ativo(ITENS[0]!, caminho)} />
        <AbaInferior item={ITENS[1]!} ativo={ativo(ITENS[1]!, caminho)} />
        <span
          aria-disabled="true"
          aria-label="Começar foco (em breve)"
          className="bg-accent text-on-accent -mt-7 grid size-14 place-self-center rounded-full opacity-45"
        >
          <Timer className="m-auto size-6" aria-hidden />
        </span>
        <AbaInferior item={ITENS[2]!} ativo={false} />
        <AbaInferior item={ITENS[3]!} ativo={false} />
      </nav>
    </>
  );
}

function ItemDaBarra({ item, ativo }: { item: Item; ativo: boolean }) {
  const base = "flex min-h-11 items-center gap-3 rounded-[10px] px-3 font-semibold";
  const { Icone } = item;

  if (!item.href) {
    return (
      <span aria-disabled="true" className={`${base} text-ink-muted opacity-60`}>
        <Icone className="size-5" aria-hidden />
        {item.rotulo}
        <span className="text-label ml-auto uppercase">em breve</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`${base} transition-colors duration-(--duration-instant) ${
        ativo
          ? "bg-surface-raised text-accent"
          : "text-ink-muted hover:bg-surface-raised hover:text-ink"
      }`}
    >
      <Icone className="size-5" aria-hidden />
      {item.rotulo}
    </Link>
  );
}

function AbaInferior({ item, ativo }: { item: Item; ativo: boolean }) {
  const base = "text-label flex min-h-11 flex-col items-center justify-center gap-0.5 normal-case";
  const { Icone } = item;

  if (!item.href) {
    return (
      <span aria-disabled="true" className={`${base} text-ink-muted opacity-60`}>
        <Icone className="size-5" aria-hidden />
        {item.rotulo}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`${base} ${ativo ? "text-accent" : "text-ink-muted"}`}
    >
      <Icone className="size-5" aria-hidden />
      {item.rotulo}
    </Link>
  );
}
