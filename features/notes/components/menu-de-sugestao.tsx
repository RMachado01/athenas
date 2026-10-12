"use client";

import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";

export interface OpcaoDoMenu {
  id: string;
  rotulo: string;
  dica?: string;
  icone?: ReactNode;
}

export interface MenuDeSugestaoRef {
  /** Devolve true se a tecla foi tratada (setas, Enter). */
  aoTeclar: (evento: KeyboardEvent) => boolean;
}

/**
 * Menu flutuante das sugestões do editor ("[[" para links e "/" para blocos). Navega com as
 * setas, confirma com Enter ou toque. É uma listbox acessível (role + aria-selected).
 */
export const MenuDeSugestao = forwardRef<
  MenuDeSugestaoRef,
  { opcoes: OpcaoDoMenu[]; rotulo: string; aoEscolher: (opcao: OpcaoDoMenu) => void }
>(function MenuDeSugestao({ opcoes, rotulo, aoEscolher }, ref) {
  const [ativa, setAtiva] = useState(0);
  // Se a lista encolher enquanto a pessoa digita, o destaque não pode apontar para o vazio.
  const atual = Math.min(ativa, Math.max(0, opcoes.length - 1));

  useImperativeHandle(ref, () => ({
    aoTeclar: (e) => {
      if (opcoes.length === 0) return false;
      if (e.key === "ArrowDown") {
        setAtiva((atual + 1) % opcoes.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        setAtiva((atual - 1 + opcoes.length) % opcoes.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        const escolhida = opcoes[atual];
        if (escolhida) aoEscolher(escolhida);
        return true;
      }
      return false;
    },
  }));

  if (opcoes.length === 0) return null;
  return (
    <div
      role="listbox"
      aria-label={rotulo}
      className="vidro-forte flex max-h-72 w-72 max-w-[calc(100vw-2rem)] flex-col overflow-y-auto rounded-lg p-1.5"
    >
      {opcoes.map((o, i) => (
        <button
          key={o.id}
          type="button"
          role="option"
          aria-selected={i === atual}
          onMouseDown={(e) => e.preventDefault()} // não tira o foco do editor
          onClick={() => aoEscolher(o)}
          className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left ${
            i === atual ? "bg-[var(--card)]" : ""
          }`}
        >
          {o.icone && <span className="text-ink-muted shrink-0">{o.icone}</span>}
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{o.rotulo}</span>
            {o.dica && <span className="text-ink-muted text-body-sm truncate">{o.dica}</span>}
          </span>
        </button>
      ))}
    </div>
  );
});
