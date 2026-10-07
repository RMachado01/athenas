import { Suspense } from "react";
import { TarefasEsqueleto } from "@/features/tasks/components/tarefas-esqueleto";
import { TarefasView } from "@/features/tasks/components/tarefas-view";

export const metadata = { title: "Tarefas" };

/**
 * Rota /tarefas. O casco (título + esqueleto) é estático e chega na hora; a lista depende da
 * data de hoje no fuso da pessoa e dos dados do banco, então vem em seguida, dentro do Suspense
 * (exigência do Cache Components do Next 16).
 */
export default function PaginaDeTarefas() {
  return (
    <Suspense fallback={<TarefasEsqueleto />}>
      <TarefasView />
    </Suspense>
  );
}
