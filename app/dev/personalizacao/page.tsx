import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { PersonalizacaoView } from "@/features/settings/components/personalizacao-view";

export const metadata = { title: "Personalização (laboratório)" };

/** Laboratório: Personalização SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDePersonalizacao() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <PersonalizacaoView />
      </Suspense>
    </LayoutDoApp>
  );
}
