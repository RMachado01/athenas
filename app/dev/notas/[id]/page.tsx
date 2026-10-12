import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { NotaView } from "@/features/notes/components/nota-view";

export const metadata = { title: "Nota (laboratório)" };

/** Laboratório: uma nota SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDaNota({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <NotaDoParametro params={params} />
      </Suspense>
    </LayoutDoApp>
  );
}

async function NotaDoParametro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotaView id={id} caminhoBase="/dev/notas" />;
}
