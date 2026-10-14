import { notFound } from "next/navigation";
import { SeletorDeTema } from "./seletor-de-tema";

export const metadata = { title: "Temas (desenvolvimento)" };

// Cores semânticas para a amostra. Mostrar cada uma ajuda a conferir os 3 temas a olho.
const CORES = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-raised", "bg-surface-raised"],
  ["brand", "bg-brand"],
  ["brand-soft", "bg-brand-soft"],
  ["accent", "bg-accent"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["info", "bg-info"],
] as const;

/** Página de laboratório: só existe em desenvolvimento (em produção responde 404). */
export default function PaginaDeTemas() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 sm:px-8">
      <header className="flex flex-col gap-2">
        <span className="label text-ink-muted text-[12px] leading-4 font-semibold tracking-[0.14em] uppercase">
          Laboratório · só em desenvolvimento
        </span>
        <h1 className="font-display text-display-lg">Temas</h1>
        <div className="border-accent h-[5px] w-24 border-y" aria-hidden="true" />
      </header>

      <section aria-labelledby="h-escolha" className="flex flex-col gap-4">
        <h2 id="h-escolha" className="text-lg font-semibold">
          Escolha
        </h2>
        <SeletorDeTema />
      </section>

      <section aria-labelledby="h-cores" className="flex flex-col gap-4">
        <h2 id="h-cores" className="text-lg font-semibold">
          Cores semânticas
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {CORES.map(([nome, classe]) => (
            <li key={nome} className="flex flex-col gap-2">
              <div
                className={`${classe} border-hairline h-14 rounded-md border`}
                aria-hidden="true"
              />
              <span className="text-ink-muted text-[13px] leading-[18px]">{nome}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="h-tipo"
        className="bg-surface border-hairline flex flex-col gap-4 rounded-lg border p-6"
      >
        <h2 id="h-tipo" className="text-lg font-semibold">
          Tipografia
        </h2>
        <p className="font-display text-display-xl">Bom dia, Renan</p>
        <p>
          <span className="font-mono text-numeric-lg text-accent">3h20</span>{" "}
          <span className="text-ink-muted">estudadas hoje · 83% da meta diária</span>
        </p>
        <p className="text-ink-muted">
          Texto secundário em Instrument Sans. Acentuação: ação, coração, órgão, às, é.
        </p>
        <button
          type="button"
          className="bg-accent text-on-accent hover:bg-accent-hover min-h-11 w-fit rounded-md px-4 font-semibold transition-colors"
        >
          Começar foco
        </button>
      </section>
    </main>
  );
}
