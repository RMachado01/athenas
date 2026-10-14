import { Esqueleto } from "@/components/ui/esqueleto";

/**
 * O que aparece enquanto a próxima tela carrega (o Next mostra este arquivo na hora do toque).
 * Tem o FORMATO das telas do app (rótulo, título grande, cartões), então a troca não "pula":
 * o conteúdo real entra no mesmo lugar. Sem spinner, de propósito.
 */
export default function Carregando() {
  return (
    <main
      aria-busy="true"
      className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]"
    >
      <span className="sr-only" role="status">
        Carregando…
      </span>
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-4 w-28" />
        <Esqueleto className="h-10 w-48" />
      </div>
      <Esqueleto className="h-24 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Esqueleto className="h-28 rounded-xl" />
        <Esqueleto className="h-28 rounded-xl" />
      </div>
      <Esqueleto className="h-40 rounded-xl" />
    </main>
  );
}
