import { Suspense } from "react";
import { PersonalizacaoView } from "@/features/settings/components/personalizacao-view";

export const metadata = { title: "Personalização" };

/** Rota /personalizacao: tema, movimento e preferências de estudo (salvas no perfil). */
export default function PaginaDePersonalizacao() {
  return (
    <Suspense fallback={null}>
      <PersonalizacaoView />
    </Suspense>
  );
}
