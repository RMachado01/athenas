import { NextResponse, type NextRequest } from "next/server";
import { criarClienteGoogle } from "@/features/calendar/google/api";
import { ErroOAuth, trocarCodigo } from "@/features/calendar/google/oauth";
import {
  atualizarAgendas,
  COOKIE_OAUTH,
  contextoDaRequisicao,
} from "@/features/calendar/google/servidor";

/**
 * GET /api/google/retorno — o Google devolve a pessoa aqui com `code` e `state`.
 * Conferimos o `state` (e que é a MESMA pessoa que começou), trocamos o code pelos tokens,
 * guardamos o refresh token no Vault e trazemos a lista de agendas. Depois, volta para a Agenda.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const ir = (destino: string) => {
    const resposta = NextResponse.redirect(new URL(destino, origin));
    resposta.cookies.delete({ name: COOKIE_OAUTH, path: "/api/google" });
    return resposta;
  };

  if (searchParams.get("error")) return ir("/personalizacao?google=cancelado");

  let salvo: { state?: string; verifier?: string; u?: string } = {};
  try {
    salvo = JSON.parse(request.cookies.get(COOKIE_OAUTH)?.value ?? "{}");
  } catch {
    salvo = {};
  }
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || !salvo.state || state !== salvo.state || !salvo.verifier) {
    return ir("/personalizacao?google=erro");
  }

  const r = await contextoDaRequisicao();
  if (!r.ok) return ir(r.motivo === "sem_login" ? "/login" : "/personalizacao?google=indisponivel");
  if (salvo.u !== r.ctx.userId) return ir("/personalizacao?google=erro");

  const { env, admin, userId } = r.ctx;
  try {
    const tokens = await trocarCodigo(fetch, {
      code,
      verifier: salvo.verifier,
      clientId: env.clientId,
      clientSecret: env.clientSecret,
      redirectUri: `${origin}/api/google/retorno`,
    });
    const { error } = await admin.rpc("gcal_salvar_conexao", {
      p_user: userId,
      p_refresh_token: tokens.refreshToken,
      p_scopes: tokens.escopos,
    });
    if (error) throw error;

    const agendas = await criarClienteGoogle(fetch).listarAgendas(tokens.accessToken);
    await atualizarAgendas(admin, userId, agendas);
    return ir("/agenda?google=conectado");
  } catch (erro) {
    if (erro instanceof ErroOAuth && erro.codigo === "escopos_negados") {
      return ir("/personalizacao?google=permissoes");
    }
    console.error("[google/retorno]", erro instanceof Error ? erro.message : erro);
    return ir("/personalizacao?google=erro");
  }
}
