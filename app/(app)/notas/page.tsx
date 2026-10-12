import { Suspense } from "react";
import { NotasView } from "@/features/notes/components/notas-view";

export const metadata = { title: "Notas" };

/** Rota /notas: lista e busca das notas. */
export default function PaginaDeNotas() {
  return (
    <Suspense fallback={null}>
      <NotasView />
    </Suspense>
  );
}
