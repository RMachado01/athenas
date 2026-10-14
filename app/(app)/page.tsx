import { Suspense } from "react";
import { InicioEsqueleto } from "@/features/dashboard/components/inicio-esqueleto";
import { InicioView } from "@/features/dashboard/components/inicio-view";
import { sair } from "./acoes";

export const metadata = { title: "Início" };

/**
 * Início. O casco é estático e chega na hora; o conteúdo depende da data de hoje no fuso da
 * pessoa e dos dados do banco, então vem em seguida, dentro do Suspense (exigência do Cache
 * Components do Next 16). A ação de sair (Server Action) é passada à tela como propriedade.
 */
export default function Inicio() {
  return (
    <Suspense fallback={<InicioEsqueleto />}>
      <InicioView sair={sair} />
    </Suspense>
  );
}
