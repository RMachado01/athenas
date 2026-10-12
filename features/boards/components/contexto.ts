"use client";

import { createContext, useContext } from "react";
import type { ItemDoMural } from "../queries";

/**
 * O que os itens do quadro precisam pedir ao quadro (sem passar props por dentro do React Flow):
 * salvar mudanças, abrir a folha de edição e saber se estamos no modo "Ligar".
 */
export interface ContextoDoQuadro {
  atualizarItem: (id: string, mudanca: Partial<ItemDoMural>) => void;
  abrirEdicao: (id: string) => void;
  modoLigar: boolean;
  origemDaLigacao: string | null;
}

export const QuadroContexto = createContext<ContextoDoQuadro | null>(null);

export function useQuadro(): ContextoDoQuadro {
  const ctx = useContext(QuadroContexto);
  if (!ctx) throw new Error("useQuadro fora do QuadroContexto");
  return ctx;
}
