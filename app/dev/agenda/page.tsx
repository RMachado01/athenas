import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { AgendaView } from "@/features/calendar/components/agenda-view";

export const metadata = { title: "Agenda (laboratório)" };

/** Laboratório: Agenda SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDaAgenda() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <AgendaView />
      </Suspense>
    </LayoutDoApp>
  );
}
