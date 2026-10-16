"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";

/**
 * Pergunta "Excluir isto?" antes de apagar de verdade (não dá para desfazer).
 * O foco inicial fica no "Cancelar": a ação segura é a padrão, e Esc também cancela.
 * `descricao` diz o que será apagado junto e o que continua existindo.
 */
export function ConfirmarExclusao({
  aberto,
  aoMudar,
  titulo,
  descricao,
  rotuloDoBotao = "Excluir",
  aoConfirmar,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  rotuloDoBotao?: string;
  aoConfirmar: () => void;
}) {
  return (
    <AlertDialog.Root open={aberto} onOpenChange={aoMudar}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="folha-fundo bg-scrim fixed inset-0 z-[60] backdrop-blur-sm" />
        <AlertDialog.Content className="vidro-forte fixed top-1/2 left-1/2 z-[70] flex w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl p-6">
          <AlertDialog.Title className="font-display text-heading-1">{titulo}</AlertDialog.Title>
          <AlertDialog.Description className="text-ink-muted">
            {descricao} Isso não dá para desfazer.
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="botao-vidro min-h-11 cursor-pointer px-5 font-semibold"
              >
                Cancelar
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={aoConfirmar}
                className="border-danger text-danger hover:bg-card min-h-11 cursor-pointer rounded-pill border px-5 font-semibold"
              >
                {rotuloDoBotao}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
