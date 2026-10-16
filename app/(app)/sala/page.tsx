import { Suspense } from "react";
import { SalaView } from "@/features/pixel/components/sala-view";

export const metadata = { title: "Sala" };

/** Rota /sala: a sala-biblioteca em pixel art com o seu pet. */
export default function PaginaDaSala() {
  return (
    <Suspense fallback={null}>
      <SalaView />
    </Suspense>
  );
}
