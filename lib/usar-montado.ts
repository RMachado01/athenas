"use client";

import { useSyncExternalStore } from "react";

const nada = () => () => {};

/**
 * `false` no servidor e durante a hidratação; `true` depois, já no aparelho.
 *
 * Para telas que dependem do relógio/fuso do APARELHO (ex.: Agenda: "hoje", linha do agora):
 * desenhar só no cliente evita que o HTML do servidor (com a data do servidor) e o do aparelho
 * discordem. Quando discordam, o React não corrige atributos (aria-pressed, disabled…) e a tela
 * pode ficar marcando o dia errado.
 */
export function useMontado(): boolean {
  return useSyncExternalStore(
    nada,
    () => true,
    () => false,
  );
}
