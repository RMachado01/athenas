"use client";

import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

/**
 * Folha que sobe de baixo (padrão de app mobile): vidro forte, "alça" no topo, título e Fechar.
 * Radix Dialog cuida de foco preso, Esc, retorno do foco e leitor de tela.
 * Respeita a área segura do aparelho (barra de gestos) com env(safe-area-inset-bottom).
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
  return (
    <Dialog.Root open={aberta} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="folha-fundo bg-scrim fixed inset-0 z-40 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="folha vidro-forte fixed inset-x-2 bottom-2 z-50 mx-auto flex max-h-[90dvh] max-w-[480px] flex-col rounded-xl pb-[env(safe-area-inset-bottom)]"
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
          <div className="overflow-y-auto px-5 pt-1 pb-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
