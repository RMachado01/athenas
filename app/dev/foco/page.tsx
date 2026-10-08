import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { FocoView } from "@/features/focus/components/foco-view";

export const metadata = { title: "Foco (laboratório)" };

/** Laboratório: a tela de Foco SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDoFoco() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <FocoView />
      </Suspense>
    </LayoutDoApp>
  );
}
