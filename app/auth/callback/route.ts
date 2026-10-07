import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/rotas";
import { criarClienteServidor } from "@/lib/supabase/servidor";

/**
 * Para onde o Google devolve a pessoa depois do login.
 * Chega aqui com um ?code=… de uso único; trocamos por uma sessão (gravada nos cookies)
 * e mandamos a pessoa ao destino, depois de validar que o destino é interno (anti open redirect).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const destino = destinoSeguro(searchParams.get("next"));

  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, origin));
  }

  return NextResponse.redirect(new URL("/login?erro=auth", origin));
}
