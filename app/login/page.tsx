import { Suspense } from "react";
import { BotaoGoogle } from "./botao-google";
import { AvisoDeErro } from "./aviso-de-erro";
import { DestinoDoLogin } from "./destino-do-login";

export const metadata = { title: "Entrar" };

export default function PaginaDeLogin() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-5">
        <span className="vidro text-ink-muted rounded-pill w-fit px-3.5 py-1 text-[12px] leading-5 font-semibold">
          Beta fechado
        </span>
        {/* A serifa Cormorant fica só na marca: é a assinatura de "herança" dentro do visual moderno. */}
        <h1 className="font-brand text-[72px] leading-[0.95] font-semibold tracking-tight">
          Athenas
        </h1>
        <p className="text-heading-1 max-w-[16ch]">
          Foco e <span className="text-accent">disciplina</span> para os seus estudos.
        </p>
      </header>

      <section aria-label="Entrar" className="vidro-forte flex flex-col gap-4 rounded-xl p-6">
        {/* Lê ?erro= e ?next= da URL. useSearchParams exige <Suspense> com Cache Components. */}
        <Suspense fallback={<BotaoGoogle />}>
          <AvisoDeErro />
          <DestinoDoLogin />
        </Suspense>
        <p className="text-ink-muted text-[13px] leading-[18px]">
          Usamos só seu nome, e-mail e foto do Google. Nada de agenda sem você pedir.
        </p>
      </section>
    </main>
  );
}
