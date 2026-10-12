"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { usePerfil } from "@/lib/perfil";
import { aplicarTema, ehOpcaoDeTema, temaDoCookie } from "@/lib/tema";
import { Toaster } from "sonner";

/**
 * Um QueryClient só por NAVEGADOR (padrão recomendado pelo TanStack para o Next): mesmo que a
 * árvore de provedores seja remontada (ex.: páginas de laboratório), o cache continua o mesmo, e
 * ações que terminam depois de uma navegação ("Desfazer" de um aviso) atualizam a tela certa.
 * No servidor, cada requisição ganha um cliente novo (nunca compartilhar dados entre pessoas).
 */
function criarQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    },
  });
}
let clienteDoNavegador: QueryClient | undefined;
function obterQueryClient() {
  if (typeof window === "undefined") return criarQueryClient();
  clienteDoNavegador ??= criarQueryClient();
  return clienteDoNavegador;
}

/**
 * Provedores do app logado:
 *  - TanStack Query: cache dos dados do banco (e atualização otimista).
 *  - Motion: LazyMotion carrega o pacote de animação sob demanda; `strict` obriga a usar o
 *    componente leve `m.*`; `reducedMotion="user"` respeita "reduzir movimento" do aparelho.
 *  - Sonner: avisos ("Tarefa concluída. Desfazer") estilizados com os tokens do tema.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [cliente] = useState(obterQueryClient);

  return (
    <QueryClientProvider client={cliente}>
      <PreferenciasDoPerfil>{children}</PreferenciasDoPerfil>
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

/**
 * Aplica no app as preferências salvas no perfil:
 *  - movimento: "Automático" segue o aparelho; "Completo" e "Reduzido" forçam (CSS + Motion);
 *  - tema: num aparelho NOVO (sem cookie) adota o tema do perfil. Se já há cookie, a escolha
 *    feita neste aparelho vence (evita o tema "pular" na cara da pessoa).
 */
function PreferenciasDoPerfil({ children }: { children: ReactNode }) {
  const { data: perfil } = usePerfil();
  const motion = perfil?.motion ?? "system";
  const temaSalvo = perfil?.theme;

  useEffect(() => {
    const html = document.documentElement;
    if (motion === "system") html.removeAttribute("data-motion");
    else html.setAttribute("data-motion", motion);
  }, [motion]);

  useEffect(() => {
    if (ehOpcaoDeTema(temaSalvo) && temaSalvo !== "auto" && temaDoCookie() === null) {
      aplicarTema(temaSalvo);
    }
  }, [temaSalvo]);

  const reducedMotion = motion === "full" ? "never" : motion === "reduced" ? "always" : "user";
  return (
    <MotionConfig reducedMotion={reducedMotion}>
      <LazyMotion features={() => import("@/lib/motion-features").then((m) => m.default)} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
