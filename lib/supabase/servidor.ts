import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { lerEnvSupabase } from "@/lib/env";

/**
 * Cliente do Supabase para rodar NO SERVIDOR (Server Components, Server Actions, Route Handlers).
 *
 * Lê a sessão dos cookies da requisição. Importante: com Cache Components do Next 16, `cookies()`
 * só pode ser chamado dentro de um <Suspense> (a página inicial estática carrega na hora e a parte
 * da pessoa chega em seguida).
 *
 * REGRA DE OURO: para saber quem é o usuário no servidor, use `auth.getClaims()` (valida a assinatura
 * do token). Nunca confie em `auth.getSession()` no servidor: ele só lê o cookie, sem validar.
 */
export async function criarClienteServidor() {
  const env = lerEnvSupabase();
  const guardaDeCookies = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return guardaDeCookies.getAll();
        },
        setAll(lista) {
          try {
            for (const { name, value, options } of lista) guardaDeCookies.set(name, value, options);
          } catch {
            // Chamado de um Server Component: não pode gravar cookie aqui. Tudo bem, o proxy.ts
            // já renova a sessão a cada requisição.
          }
        },
      },
    },
  );
}
