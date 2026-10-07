import { Suspense } from "react";
import { BotaoGoogle } from "./botao-google";
import { AvisoDeErro } from "./aviso-de-erro";
import { DestinoDoLogin } from "./destino-do-login";

export const metadata = { title: "Entrar" };

export default function PaginaDeLogin() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-4">
        <span className="text-ink-muted text-[11px] leading-4 font-semibold tracking-[0.14em] uppercase">
          Beta fechado
        </span>
        <h1 className="font-display text-display-xl">Athenas</h1>
        <div className="border-accent h-[5px] w-24 border-y" aria-hidden="true" />
        <p className="text-ink-muted">Herança, foco e disciplina para os seus estudos.</p>
      </header>

      <section
        aria-label="Entrar"
        className="bg-surface border-hairline flex flex-col gap-4 rounded-lg border p-6"
      >
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
