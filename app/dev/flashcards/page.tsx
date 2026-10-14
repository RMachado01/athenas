import { notFound } from "next/navigation";
import { Suspense } from "react";
import LayoutDoApp from "@/app/(app)/layout";
import { FlashcardsView } from "@/features/flashcards/components/flashcards-view";

export const metadata = { title: "Flashcards (laboratório)" };

/** Laboratório: baralhos SEM login, só em desenvolvimento (em produção responde 404). */
export default function LaboratorioDeFlashcards() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <LayoutDoApp>
      <Suspense fallback={null}>
        <FlashcardsView caminhoBase="/dev/flashcards" />
      </Suspense>
    </LayoutDoApp>
  );
}
