"use client";

import { BookOpen, LayoutDashboard, ListChecks, Plus, Timer } from "lucide-react";
import { useReducedMotionConfig } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { MOLA } from "@/lib/movimento";
import { AdicionarRapido } from "@/features/tasks/components/adicionar-rapido";

interface Item {
  id: string;
  rotulo: string;
  href: string;
  /** Outras rotas que "moram" nesta aba (a aba fica acesa nelas também). */
  tambem?: readonly string[];
  Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const INICIO: Item = { id: "inicio", rotulo: "Início", href: "/", Icone: LayoutDashboard };
const TAREFAS: Item = { id: "tarefas", rotulo: "Tarefas", href: "/tarefas", Icone: ListChecks };
const FOCO: Item = { id: "foco", rotulo: "Foco", href: "/foco", Icone: Timer };
// "Estudo" junta o que antes ficava escondido no menu do avatar (auditoria de design).
const ESTUDO: Item = {
  id: "estudo",
  rotulo: "Estudo",
  href: "/estudo",
  tambem: ["/flashcards", "/notas", "/murais", "/agenda", "/metas"],
  Icone: BookOpen,
};

/**
 * Qual aba acende para um caminho. As páginas de laboratório (/dev/…) imitam as reais, então
 * "/dev/notas" acende "Estudo" como "/notas" (e "/dev/inicio" acende "Início").
 */
export function abaAtiva(caminho: string): string | null {
  const c = caminho.startsWith("/dev/") ? caminho.slice(4) : caminho;
  if (c === "/" || c === "/inicio") return INICIO.id;
  const dentro = (base: string) => c === base || c.startsWith(`${base}/`);
  for (const item of [TAREFAS, FOCO, ESTUDO]) {
    if (dentro(item.href) || item.tambem?.some(dentro)) return item.id;
  }
  return null;
}

/**
 * Navegação do app mobile: UMA barra inferior em pílula de vidro, flutuando acima do conteúdo.
 * Cada aba mostra ícone E nome (só ícone obrigava a adivinhar). A aba ativa ganha uma pílula da
 * cor do tema que DESLIZA de uma aba para a outra (mola; sem deslize com "menos movimento").
 * No centro, o "+" flutua um pouco acima da barra e abre a folha de nova tarefa.
 * Respeita a área segura do aparelho (barra de gestos do iPhone/Android).
 */
export function Navegacao() {
  const caminho = usePathname();
  const [novaAberta, setNovaAberta] = useState(false);
  const ativa = abaAtiva(caminho);

  // A revisão de flashcards é tela cheia (os 4 botões ficam onde estaria a barra).
  if (caminho.endsWith("/flashcards/revisar")) return null;

  return (
    <>
      <nav
        aria-label="Principal"
        // Fundo mais firme que o vidro comum: sob a barra pode passar um post-it ou uma barra de
        // cor, e o rótulo da aba precisa manter contraste (WCAG 1.4.3) sobre qualquer coisa.
        className="vidro rounded-pill bg-[color-mix(in_srgb,var(--surface)_74%,transparent)] fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto grid max-w-[456px] grid-cols-5 items-center p-1.5"
      >
        <Aba item={INICIO} ativo={ativa === INICIO.id} />
        <Aba item={TAREFAS} ativo={ativa === TAREFAS.id} />

        {/* Botão central: ação principal do app. Sobe 8 px e brilha na cor do tema. */}
        <button
          type="button"
          onClick={() => setNovaAberta(true)}
          aria-label="Nova tarefa"
          className="botao-primario grid size-14 -translate-y-2 cursor-pointer place-self-center place-items-center shadow-[0_10px_28px_-8px_var(--accent)]"
        >
          <Plus className="size-7" strokeWidth={2.5} aria-hidden />
        </button>

        <Aba item={FOCO} ativo={ativa === FOCO.id} />
        <Aba item={ESTUDO} ativo={ativa === ESTUDO.id} />
      </nav>

      <FolhaInferior aberta={novaAberta} aoMudar={setNovaAberta} titulo="Nova tarefa">
        <AdicionarRapido autoFoco aoEnviar={() => setNovaAberta(false)} />
      </FolhaInferior>
    </>
  );
}

function Aba({ item, ativo }: { item: Item; ativo: boolean }) {
  const { Icone } = item;
  const reduzido = useReducedMotionConfig();
  const pilula = "bg-accent rounded-pill absolute inset-0";

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`tocavel rounded-pill relative flex min-h-14 flex-col items-center justify-center gap-0.5 transition-colors duration-(--duration-fast) ${
        ativo ? "text-on-accent" : "text-ink-muted hover:text-ink"
      }`}
    >
      {ativo &&
        (reduzido ? (
          <span className={pilula} aria-hidden="true" />
        ) : (
          <m.span layoutId="aba-ativa" transition={MOLA} className={pilula} aria-hidden="true" />
        ))}
      <Icone className="relative size-5" aria-hidden />
      <span className="relative text-[12px] leading-4 font-semibold">{item.rotulo}</span>
    </Link>
  );
}
