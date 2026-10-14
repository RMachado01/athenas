import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { BaralhoView } from "@/features/flashcards/components/baralho-view";

export const metadata = { title: "Baralho (laboratório)" };

/** Laboratório: um baralho SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDoBaralho({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <BaralhoDoParametro params={params} />
      </Suspense>
    </LayoutDoApp>
  );
}

async function BaralhoDoParametro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BaralhoView id={id} caminhoBase="/dev/flashcards" caminhoDasNotas="/dev/notas" />;
}
