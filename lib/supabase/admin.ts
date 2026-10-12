import "server-only";
import { createClient } from "@supabase/supabase-js";
import { lerEnvSupabase } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Cliente do Supabase com a chave SECRETA (papel service_role: ignora a RLS).
 *
 * Cuidado redobrado: use só em Route Handlers do servidor, sempre com o `user_id` vindo da sessão
 * validada (getClaims), NUNCA de um parâmetro enviado pelo navegador. Aqui ele serve apenas para as
 * funções `gcal_*` do Google Agenda (token no Vault e eventos importados).
 */
export function criarClienteAdmin(chaveSecreta: string) {
  const env = lerEnvSupabase();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, chaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ClienteAdmin = ReturnType<typeof criarClienteAdmin>;
