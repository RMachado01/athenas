import { createBrowserClient } from "@supabase/ssr";
import { lerEnvSupabase } from "@/lib/env";

/**
 * Cliente do Supabase para rodar NO NAVEGADOR (componentes "use client").
 * A sessão fica em cookies, que o proxy.ts renova a cada navegação.
 * Segurança: usa só a chave pública; o que a pessoa pode ver/fazer é decidido pela RLS do banco.
 */
export function criarClienteNavegador() {
  const env = lerEnvSupabase();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
