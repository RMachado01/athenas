import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { lerEnvSupabase } from "@/lib/env";
import { rotaExigeLogin } from "@/lib/rotas";

/**
 * Proxy (antigo "middleware" do Next): roda ANTES de cada página.
 * Faz duas coisas:
 *  1. Renova a sessão do Supabase (o token expira; aqui ele é atualizado e regravado nos cookies).
 *  2. Protege as rotas: sem login, vai para /login (guardando para onde voltar); já logado,
 *     /login redireciona para a página inicial.
 *
 * Atenção: esta é a PRIMEIRA barreira, mas não a única. A segurança de verdade dos dados é a RLS
 * do banco (ADR-002). Mesmo que alguém burlasse o proxy, o banco não entregaria dados alheios.
 */
export async function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;

  // Páginas de laboratório (/dev) não usam sessão.
  if (caminho === "/dev" || caminho.startsWith("/dev/")) return NextResponse.next();

  const env = lerEnvSupabase();
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          // Grava na requisição (para o resto do app já enxergar) e na resposta (para o navegador).
          for (const { name, value } of lista) request.cookies.set(name, value);
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of lista) resposta.cookies.set(name, value, options);
        },
      },
    },
  );

  // getClaims valida a assinatura do token (getSession só leria o cookie, sem validar).
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);

  if (!logado && rotaExigeLogin(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    if (caminho !== "/") destino.searchParams.set("next", caminho);
    return redirecionarMantendoCookies(destino, resposta);
  }

  if (logado && caminho === "/login") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return redirecionarMantendoCookies(destino, resposta);
  }

  return resposta;
}

/** Redireciona sem perder os cookies de sessão renovados (senão o token novo se perde). */
function redirecionarMantendoCookies(destino: URL, origem: NextResponse) {
  const redirecionamento = NextResponse.redirect(destino);
  for (const cookie of origem.cookies.getAll()) redirecionamento.cookies.set(cookie);
  return redirecionamento;
}

export const config = {
  // Tudo, menos arquivos estáticos, imagens e o manifesto do PWA (o navegador busca o manifesto
  // sem login, ao oferecer "instalar app").
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
