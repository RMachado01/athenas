"use client";

import { CalendarDays, ListChecks, LayoutDashboard, Palette, Target, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { usePerfil } from "@/lib/perfil";
import { primeiroNome } from "@/lib/saudacao";

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
 * Navegação principal, em vidro FLUTUANTE (camada de "chrome" acima do conteúdo).
 *  - Desktop (≥1024px): barra lateral arredondada, afastada das bordas.
 *  - Celular: barra inferior em pílula, com o item ativo num círculo colorido e o botão de Foco ao centro.
 * O que ainda não existe aparece apagado e não é clicável.
 */
export function Navegacao() {
  const caminho = usePathname();

  return (
    <>
      {/* Barra lateral */}
      <nav
        aria-label="Principal"
        className="vidro sticky top-3 m-3 hidden h-[calc(100vh-1.5rem)] w-[248px] shrink-0 flex-col gap-8 rounded-xl px-3 py-6 lg:flex"
      >
        <Link
          href="/"
          className="flex items-center gap-3 px-3"
          aria-label="Athenas, ir para o início"
        >
          <span
            aria-hidden="true"
            className="font-brand grid size-10 place-items-center rounded-pill bg-brand-soft text-[22px] leading-none font-semibold"
          >
            A
          </span>
          <span className="font-brand text-[28px] leading-none font-semibold tracking-tight">
            Athenas
          </span>
        </Link>

        <ul role="list" className="flex flex-col gap-1">
          {ITENS.map((item) => (
            <li key={item.id}>
              <ItemDaBarra item={item} ativo={ativo(item, caminho)} />
            </li>
          ))}
        </ul>

        <CartaoDoUsuario />
      </nav>

      {/* Barra inferior (celular): pílula de vidro flutuante */}
      <nav
        aria-label="Principal"
        className="vidro rounded-pill fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 items-center p-1.5 lg:hidden"
      >
        <AbaInferior item={ITENS[0]!} ativo={ativo(ITENS[0]!, caminho)} />
        <AbaInferior item={ITENS[1]!} ativo={ativo(ITENS[1]!, caminho)} />
        {/* Botão de verdade (desabilitado): é o que leitores de tela entendem como "indisponível". */}
        <button
          type="button"
          disabled
          aria-label="Começar foco (em breve)"
          className="botao-primario grid size-12 place-self-center opacity-45"
        >
          <Timer className="m-auto size-6" aria-hidden />
        </button>
        <AbaInferior item={ITENS[2]!} ativo={false} />
        <AbaInferior item={ITENS[3]!} ativo={false} />
      </nav>
    </>
  );
}

function ItemDaBarra({ item, ativo }: { item: Item; ativo: boolean }) {
  const base = "flex min-h-11 items-center gap-3 rounded-pill px-4 font-semibold";
  const { Icone } = item;

  if (!item.href) {
    return (
      <span aria-disabled="true" className={`${base} text-ink-muted opacity-60`}>
        <Icone className="size-5 shrink-0" aria-hidden />
        {item.rotulo}
        <span className="ml-auto text-[10px] leading-4 font-semibold tracking-[0.06em] whitespace-nowrap uppercase">
          breve
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`${base} transition-colors duration-(--duration-instant) ${
        ativo ? "cartao text-accent" : "text-ink-muted hover:bg-card hover:text-ink"
      }`}
    >
      <Icone className="size-5 shrink-0" aria-hidden />
      {item.rotulo}
    </Link>
  );
}

/** Aba da barra inferior: só o ícone (como nas referências); o nome fica para leitor de tela. */
function AbaInferior({ item, ativo }: { item: Item; ativo: boolean }) {
  const { Icone } = item;
  const circulo = "grid size-12 place-items-center place-self-center rounded-pill";

  if (!item.href) {
    return (
      <span aria-disabled="true" className={`${circulo} text-ink-muted opacity-50`}>
        <Icone className="size-5" aria-hidden />
        <span className="sr-only">{item.rotulo} (em breve)</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`${circulo} transition-colors duration-(--duration-fast) ${
        ativo ? "bg-accent text-on-accent" : "text-ink-muted hover:text-ink"
      }`}
    >
      <Icone className="size-5" aria-hidden />
      <span className="sr-only">{item.rotulo}</span>
    </Link>
  );
}

/** Cartão da pessoa no rodapé do menu (como nas referências): inicial, nome e @handle em breve. */
function CartaoDoUsuario() {
  const { data: perfil } = usePerfil();
  const nome = perfil ? primeiroNome(perfil.display_name) : "…";
  return (
    <div className="cartao rounded-pill mt-auto flex items-center gap-3 p-2 pr-4">
      <span
        aria-hidden="true"
        className="bg-brand-soft grid size-10 shrink-0 place-items-center rounded-pill font-semibold"
      >
        {nome.slice(0, 1).toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold">{nome}</span>
        <span className="text-ink-muted text-body-sm">Beta fechado</span>
      </span>
    </div>
  );
}
