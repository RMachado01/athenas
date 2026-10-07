import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { InicioView } from "@/features/dashboard/components/inicio-view";
import { sairDeMentira } from "./acao";

export const metadata = { title: "Início (laboratório)" };

/** Laboratório: o Início SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDoInicio() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <InicioView sair={sairDeMentira} />
      </Suspense>
    </LayoutDoApp>
  );
}
