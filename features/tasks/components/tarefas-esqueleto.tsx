import { Esqueleto } from "@/components/ui/esqueleto";

/**
 * Casco estático da tela de Tarefas: aparece NA HORA enquanto a parte que depende da data e do
 * fuso da pessoa (TarefasView) chega. Mantém o título no mesmo lugar para a tela não "pular".
 */
export function TarefasEsqueleto() {
  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-1">
        <span className="text-ink-muted text-body-sm font-medium">Carregando…</span>
        <h1 className="font-display text-display-lg">Tarefas</h1>
      </header>
      <div aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Carregando tarefas</span>
        <Esqueleto className="h-14" />
        <Esqueleto className="h-12" />
        <Esqueleto className="h-[72px]" />
        <Esqueleto className="h-[72px]" />
      </div>
    </main>
  );
}
