import { Suspense } from "react";
import { RevisaoView } from "@/features/flashcards/components/revisao-view";

export const metadata = { title: "Revisar flashcards" };

type Busca = Promise<{ baralho?: string | string[] }>;

/** Rota /flashcards/revisar?baralho=…: sessão de revisão (sem baralho = tudo de hoje). */
export default function PaginaDaRevisao({ searchParams }: { searchParams: Busca }) {
  return (
    <Suspense fallback={null}>
      <RevisaoDaBusca searchParams={searchParams} />
    </Suspense>
  );
}

async function RevisaoDaBusca({ searchParams }: { searchParams: Busca }) {
  const { baralho } = await searchParams;
  return <RevisaoView baralhoId={typeof baralho === "string" ? baralho : null} />;
}
