"use client";

import { MoreHorizontal } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ComponentType } from "react";

export interface ItemDoMenu {
  rotulo: string;
  Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  aoEscolher: () => void;
  /** Ação destrutiva (Excluir): aparece em vermelho. */
  perigo?: boolean;
}

/**
 * Botão "⋯" que abre um menu de ações (Arquivar, Excluir…). Radix cuida do teclado (setas, Esc)
 * e do leitor de tela. O botão tem 44 px de área de toque; `className` posiciona (ex.: absolute).
 */
export function MenuDeOpcoes({
  rotulo,
  itens,
  className = "",
}: {
  /** Ex.: "Opções do mural Plano de SQL". */
  rotulo: string;
  itens: readonly ItemDoMenu[];
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={rotulo}
        className={`text-ink-muted hover:text-ink grid size-11 shrink-0 cursor-pointer place-items-center rounded-full ${className}`}
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="menu-flutuante vidro-forte z-50 min-w-[190px] rounded-lg p-1.5"
        >
          {itens.map(({ rotulo: nome, Icone, aoEscolher, perigo }) => (
            <DropdownMenu.Item
              key={nome}
              onSelect={aoEscolher}
              className={`data-[highlighted]:bg-card flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-semibold outline-none ${
                perigo ? "text-danger" : ""
              }`}
            >
              <Icone className="size-[18px]" aria-hidden />
              {nome}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
