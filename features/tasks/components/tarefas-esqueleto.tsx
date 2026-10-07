import { Esqueleto } from "@/components/ui/esqueleto";

/**
 * Casco estático da tela de Tarefas: aparece NA HORA enquanto a parte que depende da data e do
 * fuso da pessoa (TarefasView) chega. Mantém título e filete no mesmo lugar para a tela não "pular".
 */
export function TarefasEsqueleto() {
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-8 sm:px-8 lg:px-14 lg:py-12">
      <header className="flex flex-col gap-2">
        <span className="text-label text-ink-muted uppercase">Carregando…</span>
        <h1 className="font-display text-display-lg">Tarefas</h1>
      </header>
      <div aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Carregando tarefas</span>
        <Esqueleto className="h-12" />
        <Esqueleto className="h-16" />
        <Esqueleto className="h-16" />
      </div>
    </main>
  );
}
