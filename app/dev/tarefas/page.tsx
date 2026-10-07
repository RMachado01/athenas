import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { TarefasEsqueleto } from "@/features/tasks/components/tarefas-esqueleto";
import { TarefasView } from "@/features/tasks/components/tarefas-view";

export const metadata = { title: "Tarefas (laboratório)" };

/**
 * Laboratório: a tela de Tarefas SEM login, só em desenvolvimento (em produção responde 404).
 * Os testes de navegador (Playwright) abrem esta rota e respondem às chamadas ao banco com um
 * Supabase falso em memória, para exercitar a interface inteira sem depender de rede nem de conta.
 */
export default function LaboratorioDeTarefas() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <LayoutDoApp>
      <Suspense fallback={<TarefasEsqueleto />}>
        <TarefasView />
      </Suspense>
    </LayoutDoApp>
  );
}
