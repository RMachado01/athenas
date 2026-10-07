import { Suspense } from "react";
import { InicioView } from "@/features/dashboard/components/inicio-view";
import { Esqueleto } from "@/components/ui/esqueleto";
import { sair } from "./acoes";

export const metadata = { title: "Início" };

/**
 * Início. O casco é estático e chega na hora; o conteúdo depende da data de hoje no fuso da
 * pessoa e dos dados do banco, então vem em seguida, dentro do Suspense (exigência do Cache
 * Components do Next 16). A ação de sair (Server Action) é passada à tela como propriedade.
 */
export default function Inicio() {
  return (
    <Suspense fallback={<EsqueletoDoInicio />}>
      <InicioView sair={sair} />
    </Suspense>
  );
}

function EsqueletoDoInicio() {
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
