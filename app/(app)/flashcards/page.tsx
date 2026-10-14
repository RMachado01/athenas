import { Suspense } from "react";
import { FlashcardsView } from "@/features/flashcards/components/flashcards-view";

export const metadata = { title: "Flashcards" };

/** Rota /flashcards: baralhos e o atalho para revisar. */
export default function PaginaDeFlashcards() {
  return (
    <Suspense fallback={null}>
      <FlashcardsView />
    </Suspense>
  );
}
