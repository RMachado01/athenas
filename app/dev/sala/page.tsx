import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { SalaView } from "@/features/pixel/components/sala-view";

export const metadata = { title: "Sala (laboratório)" };

/** Laboratório: a Sala SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDaSala() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <SalaView />
      </Suspense>
    </LayoutDoApp>
  );
}
