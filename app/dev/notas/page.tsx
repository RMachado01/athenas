import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { NotasView } from "@/features/notes/components/notas-view";

export const metadata = { title: "Notas (laboratório)" };

/** Laboratório: lista de notas SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDeNotas() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <NotasView caminhoBase="/dev/notas" />
      </Suspense>
    </LayoutDoApp>
  );
}
