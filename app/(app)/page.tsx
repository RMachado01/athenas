import { Suspense } from "react";
import { redirect } from "next/navigation";
import { primeiroNome, saudacao } from "@/lib/saudacao";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { sair } from "./acoes";

export const metadata = { title: "Início" };

/**
 * Página inicial PROVISÓRIA (Fase 0): prova que a cadeia inteira funciona —
 * login → proxy → cookie de sessão → servidor → banco com RLS → nome da pessoa.
 * O Dashboard de verdade chega na Fase 1.
 *
 * O casco da página é estático (carrega na hora); a parte que depende de QUEM é a pessoa
 * chega logo depois, dentro do Suspense (exigência do Cache Components do Next 16).
 */
export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <Suspense fallback={<Esqueleto />}>
        <Saudacao />
      </Suspense>
    </main>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Carregando</span>
      <div className="bg-hairline h-16 w-3/4 animate-pulse rounded-md" />
      <div className="bg-hairline h-5 w-1/2 animate-pulse rounded-md" />
    </div>
  );
}

async function Saudacao() {
  const supabase = await criarClienteServidor();

  // Quem é a pessoa? getClaims valida a assinatura do token.
  const { data: token } = await supabase.auth.getClaims();
  const usuarioId = token?.claims?.sub;
  if (!usuarioId) redirect("/login");

  // Lê o perfil PRIVADO. Se a RLS estiver errada, isto voltaria vazio ou de outra pessoa.
  const { data: perfil } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", usuarioId)
    .single();

  const nome = primeiroNome(perfil?.display_name);
  const frase = saudacao(new Date(), perfil?.timezone);

  return (
    <>
      <span className="text-label text-ink-muted uppercase">Fundação</span>
      <h1 className="font-display text-display-xl">
        {frase}, {nome}
      </h1>
      <p className="text-ink-muted max-w-prose">
        Tudo conectado: login, sessão e banco com isolamento por pessoa. Em breve, suas tarefas e
        sessões de foco.
      </p>
      <form action={sair}>
        <button
          type="submit"
          className="botao-vidro min-h-11 w-fit cursor-pointer px-6 font-semibold"
        >
          Sair
        </button>
      </form>
    </>
  );
}
