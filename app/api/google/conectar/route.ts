import { NextResponse, type NextRequest } from "next/server";
import {
  aleatorioBase64Url,
  gerarPkce,
  montarUrlDeAutorizacao,
} from "@/features/calendar/google/oauth";
import { COOKIE_OAUTH, contextoDaRequisicao } from "@/features/calendar/google/servidor";

/**
 * GET /api/google/conectar — começa a conexão com o Google Agenda (botão em Personalização).
 * Gera `state` + PKCE, guarda os dois num cookie httpOnly de 10 min (só esta pasta da API o lê)
 * e manda a pessoa para a tela de permissão do Google.
 */
export async function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const r = await contextoDaRequisicao();
  if (!r.ok) {
    const destino = r.motivo === "sem_login" ? "/login" : "/personalizacao?google=indisponivel";
    return NextResponse.redirect(new URL(destino, origem));
  }

  const state = aleatorioBase64Url();
  const { verifier, challenge } = await gerarPkce();
  const url = montarUrlDeAutorizacao({
    clientId: r.ctx.env.clientId,
    redirectUri: `${origem}/api/google/retorno`,
    state,
    challenge,
    email: r.ctx.email,
  });

  const resposta = NextResponse.redirect(url);
  resposta.cookies.set(COOKIE_OAUTH, JSON.stringify({ state, verifier, u: r.ctx.userId }), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax", // precisa voltar no redirecionamento vindo do Google
    path: "/api/google",
    maxAge: 600,
  });
  return resposta;
}
