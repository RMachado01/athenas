import { Suspense } from "react";
import { MuraisView } from "@/features/boards/components/murais-view";

export const metadata = { title: "Murais" };

/** Rota /murais: lista de murais (quadros com post-its, tarefas, grupos e setas). */
export default function PaginaDeMurais() {
  return (
    <Suspense fallback={null}>
      <MuraisView />
    </Suspense>
  );
}
