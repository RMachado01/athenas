import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { lerEnvGoogle, type EnvGoogle } from "@/lib/env-servidor";
import { criarClienteAdmin, type ClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { AgendaGoogle } from "./api";
import type { RepositorioDeAgenda } from "./sincronizar";

/**
 * Peças compartilhadas pelas rotas /api/google/*: quem é a pessoa (sessão validada), o cliente
 * admin e o "repositório" que liga o motor de sincronização às funções `gcal_*` do banco.
 */

export const COOKIE_OAUTH = "athenas-gcal-oauth";

export interface Contexto {
  userId: string;
  email: string | null;
  env: EnvGoogle;
  admin: ClienteAdmin;
}

/** Sessão validada + configuração. `null` em `env` = integração não configurada no servidor. */
export async function contextoDaRequisicao(): Promise<
  { ok: true; ctx: Contexto } | { ok: false; motivo: "sem_login" | "nao_configurado" }
> {
  const env = lerEnvGoogle();
  if (!env) return { ok: false, motivo: "nao_configurado" };
  const supabase = await criarClienteServidor();
  // getClaims valida a assinatura do token (nunca confiar em getSession no servidor).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, motivo: "sem_login" };
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { ok: true, ctx: { userId, email, env, admin: criarClienteAdmin(env.supabaseSecretKey) } };
}

/**
 * Proteção extra contra CSRF nos POSTs: além dos cookies SameSite=Lax, exigimos que a
 * requisição venha do próprio site (cabeçalho Origin igual ao do app).
 */
export function origemConfiavel(request: NextRequest): boolean {
  const origem = request.headers.get("origin");
  return origem !== null && origem === request.nextUrl.origin;
}

export function respostaJson(corpo: unknown, status = 200) {
  return NextResponse.json(corpo, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Atualiza a lista de agendas da pessoa: novas entram (a principal e as já marcadas no Google
 * vêm ligadas), as existentes mantêm a escolha de importar e as que sumiram do Google saem
 * (levando os eventos junto, em cascata).
 */
export async function atualizarAgendas(
  admin: ClienteAdmin,
  userId: string,
  agendas: AgendaGoogle[],
) {
  const { data: existentes, error } = await admin
    .from("google_calendars")
    .select("google_calendar_id")
    .eq("user_id", userId);
  if (error) throw error;
  const jaTem = new Set(existentes.map((e) => e.google_calendar_id));
  const noGoogle = new Set(agendas.map((a) => a.id));

  const cor = (c?: string) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : null);
  const novas = agendas
    .filter((a) => !jaTem.has(a.id))
    .map((a) => ({
      user_id: userId,
      google_calendar_id: a.id,
      summary: (a.summary ?? "").slice(0, 300),
      color: cor(a.backgroundColor),
      is_primary: Boolean(a.primary),
      enabled: Boolean(a.primary || a.selected),
    }));
  if (novas.length > 0) {
    const { error: e } = await admin.from("google_calendars").insert(novas);
    if (e) throw e;
  }
  for (const a of agendas.filter((x) => jaTem.has(x.id))) {
    const { error: e } = await admin
      .from("google_calendars")
      .update({ summary: (a.summary ?? "").slice(0, 300), color: cor(a.backgroundColor) })
      .eq("user_id", userId)
      .eq("google_calendar_id", a.id);
    if (e) throw e;
  }
  const sumiram = [...jaTem].filter((id) => !noGoogle.has(id));
  if (sumiram.length > 0) {
    const { error: e } = await admin
      .from("google_calendars")
      .delete()
      .eq("user_id", userId)
      .in("google_calendar_id", sumiram);
    if (e) throw e;
  }
}

/** Liga o motor de sincronização às funções do banco (sempre com o user_id da sessão). */
export function repositorio(admin: ClienteAdmin, userId: string): RepositorioDeAgenda {
  return {
    async travar(agendaId) {
      const { data, error } = await admin.rpc("gcal_travar_agenda", {
        p_user: userId,
        p_calendar: agendaId,
        p_segundos: 120,
      });
      if (error) throw error;
      return data === true;
    },
    async aplicarLote(agendaId, eventos, remover, syncToken, completo) {
      const { error } = await admin.rpc("gcal_aplicar_lote", {
        p_user: userId,
        p_calendar: agendaId,
        p_eventos: eventos as unknown as never,
        p_remover: remover,
        p_sync_token: syncToken,
        p_completo: completo,
      });
      if (error) throw error;
    },
  };
}
