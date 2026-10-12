import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { MuralView } from "@/features/boards/components/mural-view";

export const metadata = { title: "Mural (laboratório)" };

/** Laboratório: um mural SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDoMural({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <MuralDoParametro params={params} />
      </Suspense>
    </LayoutDoApp>
  );
}

async function MuralDoParametro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MuralView id={id} voltarPara="/dev/murais" />;
}
