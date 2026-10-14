import { Suspense } from "react";
import { BaralhoView } from "@/features/flashcards/components/baralho-view";

export const metadata = { title: "Baralho" };

/** Rota /flashcards/[id]: cartões de um baralho. `params` é dinâmico: lido dentro do Suspense. */
export default function PaginaDoBaralho({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <BaralhoDoParametro params={params} />
    </Suspense>
  );
}

async function BaralhoDoParametro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BaralhoView id={id} />;
}
