import { Suspense } from "react";
import { EstudoView } from "@/features/study/components/estudo-view";

export const metadata = { title: "Estudo" };

/** Rota /estudo: Flashcards, Notas, Murais, Agenda e Metas num lugar só. */
export default function PaginaDeEstudo() {
  return (
    <Suspense fallback={null}>
      <EstudoView />
    </Suspense>
  );
}
