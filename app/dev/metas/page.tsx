import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { MetasView } from "@/features/goals/components/metas-view";

export const metadata = { title: "Metas (laboratório)" };

/** Laboratório: Metas SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDeMetas() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <MetasView />
      </Suspense>
    </LayoutDoApp>
  );
}
