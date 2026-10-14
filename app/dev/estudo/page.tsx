import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { EstudoView } from "@/features/study/components/estudo-view";

export const metadata = { title: "Estudo (laboratório)" };

/** Laboratório: aba Estudo SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDeEstudo() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <EstudoView caminhoBase="/dev" />
      </Suspense>
    </LayoutDoApp>
  );
}
