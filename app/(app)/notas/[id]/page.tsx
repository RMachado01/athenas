import { Suspense } from "react";
import { NotaView } from "@/features/notes/components/nota-view";

export const metadata = { title: "Nota" };

/** Rota /notas/[id]: editor da nota (o params é lido dentro do Suspense, exigência do Next 16). */
export default function PaginaDaNota({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <NotaDoParametro params={params} />
    </Suspense>
  );
}

async function NotaDoParametro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotaView id={id} />;
}
