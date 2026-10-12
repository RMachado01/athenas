import { Suspense } from "react";
import { MetasView } from "@/features/goals/components/metas-view";

export const metadata = { title: "Metas" };

/** Rota /metas: metas semanais/mensais com progresso calculado pelo banco. */
export default function PaginaDeMetas() {
  return (
    <Suspense fallback={null}>
      <MetasView />
    </Suspense>
  );
}
