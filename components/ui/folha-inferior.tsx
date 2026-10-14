"use client";

import { Dialog } from "radix-ui";
import { useRef, type PointerEvent, type ReactNode } from "react";

// Quanto (px) a folha precisa descer para fechar ao soltar o dedo; ou um "peteleco" rápido.
const DISTANCIA_PARA_FECHAR = 96;
const VELOCIDADE_PARA_FECHAR = 0.6; // px por ms

/**
 * Folha que sobe de baixo (padrão de app mobile): vidro forte, "alça" no topo, título e Fechar.
 * Radix Dialog cuida de foco preso, Esc, retorno do foco e leitor de tela.
 * Respeita a área segura do aparelho (barra de gestos) com env(safe-area-inset-bottom).
 *
 * Gesto de fechar: arrastar a alça (ou o título) para baixo. A folha acompanha o dedo; ao soltar,
 * fecha se desceu o bastante (ou foi um gesto rápido) e volta ao lugar se não. O botão "Fechar"
 * e o Esc continuam valendo (o gesto nunca é o único jeito: WCAG 2.5.1).
 */
export function FolhaInferior({
  aberta,
  aoMudar,
  titulo,
  children,
}: {
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
  titulo: string;
  children: ReactNode;
}) {
  const conteudo = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ y: number; t: number; dy: number } | null>(null);

  function comecar(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return; // o "Fechar" é só um clique
    gesto.current = { y: e.clientY, t: e.timeStamp, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (conteudo.current) conteudo.current.style.transition = "none";
  }
  function mover(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    const el = conteudo.current;
    if (!g || !el) return;
    g.dy = Math.max(0, e.clientY - g.y); // só para baixo
    el.style.transform = `translateY(${g.dy}px)`;
  }
  function soltar(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current;
    const el = conteudo.current;
    gesto.current = null;
    if (!g || !el) return;
    const velocidade = g.dy / Math.max(1, e.timeStamp - g.t);
    el.style.transition = "transform var(--duration-fast) var(--ease-out)";
    if (g.dy > DISTANCIA_PARA_FECHAR || (g.dy > 24 && velocidade > VELOCIDADE_PARA_FECHAR)) {
      el.dataset.arrastada = "";
      el.style.transform = "translateY(110%)";
      setTimeout(() => aoMudar(false), 160);
    } else {
      el.style.transform = "";
    }
  }

  return (
    <Dialog.Root open={aberta} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="folha-fundo bg-scrim fixed inset-0 z-40 backdrop-blur-sm" />
        <Dialog.Content
          ref={conteudo}
          aria-describedby={undefined}
          className="folha vidro-forte fixed inset-x-2 bottom-2 z-50 mx-auto flex max-h-[90dvh] max-w-[480px] flex-col rounded-xl pb-[env(safe-area-inset-bottom)]"
        >
          {/* Zona de arrastar: alça + título. touch-none: o navegador não rola a página junto. */}
          <div
            onPointerDown={comecar}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            className="cursor-grab touch-none select-none active:cursor-grabbing"
          >
            <div
              aria-hidden="true"
              className="bg-glass-border mx-auto mt-2.5 h-1 w-10 rounded-pill"
            />
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <Dialog.Title className="text-label text-ink-muted uppercase">{titulo}</Dialog.Title>
              <Dialog.Close className="hover:text-accent min-h-11 min-w-11 cursor-pointer rounded-pill px-3 font-semibold">
                Fechar
              </Dialog.Close>
            </div>
          </div>
          <div className="overflow-y-auto px-5 pt-1 pb-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
