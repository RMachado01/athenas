// Página inicial provisória (Fase 0). O Dashboard de verdade chega na Fase 1.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <span className="text-ink-muted text-[11px] leading-4 font-semibold tracking-[0.14em] uppercase">
        Fundação
      </span>
      <h1 className="font-display text-display-xl">Athenas</h1>
      <div className="border-accent h-[5px] w-24 border-y" aria-hidden="true" />
      <p className="text-ink-muted max-w-prose">
        Herança, foco e disciplina para os seus estudos. Em construção.
      </p>
    </main>
  );
}
