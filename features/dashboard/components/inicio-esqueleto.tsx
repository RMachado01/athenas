import { Esqueleto } from "@/components/ui/esqueleto";

/**
 * Esqueleto do Início. É usado em DOIS momentos, com o mesmo desenho para a tela não "pular":
 *  - fallback do <Suspense> da rota, enquanto o conteúdo chega;
 *  - 1ª renderização da InicioView (servidor e hidratação), antes de ela ler o relógio e o cache.
 */
export function InicioEsqueleto() {
  return (
    <main
      aria-busy="true"
      className="flex flex-col gap-6 px-5 pt-[calc(1.25rem+env(safe-area-inset-top))]"
    >
      <span className="sr-only">Carregando</span>
      <Esqueleto className="h-12 w-44" />
      <Esqueleto className="h-24" />
      <Esqueleto className="h-14" />
      <div className="grid grid-cols-2 gap-3">
        <Esqueleto className="h-[132px]" />
        <Esqueleto className="h-[132px]" />
      </div>
    </main>
  );
}
