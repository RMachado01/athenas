"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

/**
 * Provedores do app logado:
 *  - TanStack Query: cache dos dados do banco (e atualização otimista).
 *  - Motion: LazyMotion carrega o pacote de animação sob demanda; `strict` obriga a usar o
 *    componente leve `m.*`; `reducedMotion="user"` respeita "reduzir movimento" do aparelho.
 *  - Sonner: avisos ("Tarefa concluída. Desfazer") estilizados com os tokens do tema.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [cliente] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
        },
      }),
  );

  return (
    <QueryClientProvider client={cliente}>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={() => import("@/lib/motion-features").then((m) => m.default)} strict>
          {children}
        </LazyMotion>
      </MotionConfig>
      <Toaster
        position="bottom-right"
        duration={4000}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "vidro-forte text-ink rounded-xl p-4 flex items-center gap-3 w-[min(92vw,360px)]",
            title: "font-semibold",
            description: "text-ink-muted text-body-sm",
            actionButton:
              "ml-auto text-accent font-semibold min-h-11 px-4 cursor-pointer rounded-pill hover:bg-card",
          },
        }}
      />
    </QueryClientProvider>
  );
}
