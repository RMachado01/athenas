import { Suspense } from "react";
import { FocoView } from "@/features/focus/components/foco-view";

export const metadata = { title: "Foco" };

/** Rota /foco: cronômetro Pomodoro, meta do dia, sequência e histórico de estudo. */
export default function PaginaDeFoco() {
  return (
    <Suspense fallback={null}>
      <FocoView />
    </Suspense>
  );
}
