import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { RevisaoView } from "@/features/flashcards/components/revisao-view";

export const metadata = { title: "Revisar flashcards (laboratório)" };

type Busca = Promise<{ baralho?: string | string[] }>;

/** Laboratório: revisão SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDaRevisao({ searchParams }: { searchParams: Busca }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <RevisaoDaBusca searchParams={searchParams} />
      </Suspense>
    </LayoutDoApp>
  );
}

async function RevisaoDaBusca({ searchParams }: { searchParams: Busca }) {
  const { baralho } = await searchParams;
  return (
    <RevisaoView
      baralhoId={typeof baralho === "string" ? baralho : null}
      caminhoBase="/dev/flashcards"
    />
  );
}
