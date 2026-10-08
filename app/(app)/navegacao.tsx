"use client";

import { LayoutDashboard, ListChecks, Palette, Plus, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { AdicionarRapido } from "@/features/tasks/components/adicionar-rapido";

interface Item {
  id: string;
  rotulo: string;
  href: string | null; // null = ainda não existe ("em breve")
  Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const INICIO: Item = { id: "inicio", rotulo: "Início", href: "/", Icone: LayoutDashboard };
const TAREFAS: Item = { id: "tarefas", rotulo: "Tarefas", href: "/tarefas", Icone: ListChecks };
const FOCO: Item = { id: "foco", rotulo: "Foco", href: "/foco", Icone: Timer };
const AJUSTES: Item = { id: "ajustes", rotulo: "Personalização", href: null, Icone: Palette };

function ativo(item: Item, caminho: string): boolean {
  if (!item.href) return false;
  return item.href === "/" ? caminho === "/" : caminho.startsWith(item.href);
}

/**
 * Navegação do app mobile: UMA barra inferior em pílula de vidro, flutuando acima do conteúdo
 * (referências). Só ícones; o nome vai em texto para leitor de tela. O item ativo vira um círculo
 * da cor do tema. No centro, o botão "+" abre uma folha para criar tarefa de qualquer tela.
 * Respeita a área segura do aparelho (barra de gestos do iPhone/Android).
 */
export function Navegacao() {
  const caminho = usePathname();
  const [novaAberta, setNovaAberta] = useState(false);

  return (
    <>
      <nav
        aria-label="Principal"
        className="vidro rounded-pill fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto grid max-w-[456px] grid-cols-5 items-center p-1.5"
      >
        <Aba item={INICIO} ativo={ativo(INICIO, caminho)} />
        <Aba item={TAREFAS} ativo={ativo(TAREFAS, caminho)} />

        {/* Botão central: ação principal do app. */}
        <button
          type="button"
          onClick={() => setNovaAberta(true)}
          aria-label="Nova tarefa"
          className="botao-primario grid size-14 cursor-pointer place-self-center place-items-center"
        >
          <Plus className="size-7" strokeWidth={2.5} aria-hidden />
        </button>

        <Aba item={FOCO} ativo={ativo(FOCO, caminho)} />
        <Aba item={AJUSTES} ativo={false} />
      </nav>

      <FolhaInferior aberta={novaAberta} aoMudar={setNovaAberta} titulo="Nova tarefa">
        <AdicionarRapido autoFoco aoEnviar={() => setNovaAberta(false)} />
      </FolhaInferior>
    </>
  );
}

function Aba({ item, ativo }: { item: Item; ativo: boolean }) {
  const { Icone } = item;
  const circulo = "grid size-12 place-items-center place-self-center rounded-pill";

  if (!item.href) {
    return (
      <span aria-disabled="true" className={`${circulo} text-ink-muted opacity-45`}>
        <Icone className="size-[22px]" aria-hidden />
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
      <Icone className="size-[22px]" aria-hidden />
      <span className="sr-only">{item.rotulo}</span>
    </Link>
  );
}
