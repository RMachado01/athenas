"use client";

import { useSyncExternalStore } from "react";

/**
 * true enquanto a media query casa (ex.: "(min-width: 1024px)"). Reage a redimensionamento.
 * No servidor e na primeira pintura devolve `false` (layout "mobile primeiro").
 */
export function useMediaQuery(consulta: string): boolean {
  return useSyncExternalStore(
    (aoMudar) => {
      const lista = window.matchMedia(consulta);
      lista.addEventListener("change", aoMudar);
      return () => lista.removeEventListener("change", aoMudar);
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}
