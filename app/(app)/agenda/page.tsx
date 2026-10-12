import { Suspense } from "react";
import { AgendaView } from "@/features/calendar/components/agenda-view";

export const metadata = { title: "Agenda" };

/** Rota /agenda: eventos do Google Agenda (somente leitura) + tarefas com prazo, por dia. */
export default function PaginaDaAgenda() {
  return (
    <Suspense fallback={null}>
      <AgendaView />
    </Suspense>
  );
}
