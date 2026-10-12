import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { MuraisView } from "@/features/boards/components/murais-view";

export const metadata = { title: "Murais (laboratório)" };

/** Laboratório: lista de murais SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDeMurais() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <MuraisView caminhoBase="/dev/murais" />
      </Suspense>
    </LayoutDoApp>
  );
}
