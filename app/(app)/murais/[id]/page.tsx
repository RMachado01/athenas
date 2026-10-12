import { Suspense } from "react";
import { MuralView } from "@/features/boards/components/mural-view";

export const metadata = { title: "Mural" };

/**
 * Rota /murais/[id]: o quadro de um mural. O `params` é lido DENTRO do <Suspense>
 * (exigência do Cache Components do Next 16: dado da requisição não pode travar o pré-render).
 */
export default function PaginaDoMural({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <MuralDoParametro params={params} />
    </Suspense>
  );
}

async function MuralDoParametro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MuralView id={id} />;
}
