"use client";

import { useEffect, useRef } from "react";

/**
 * O cartão da sessão: frente; tocar (ou "Mostrar resposta") vira para o verso.
 *
 * Acessibilidade: ao aparecer, o foco vai para a frente (quem usa teclado/leitor de tela segue
 * o cartão novo). Virado, a frente sai da árvore de acessibilidade (não é lida duas vezes) e a
 * resposta é anunciada por uma região "ao vivo" que fica sempre montada.
 */
export function CartaoDaRevisao({
  frente,
  verso,
  virado,
  aoVirar,
}: {
  frente: string;
  verso: string;
  virado: boolean;
  aoVirar: () => void;
}) {
  const frenteRef = useRef<HTMLButtonElement>(null);
  // Cada cartão novo é montado de novo (key na tela da revisão): foca a frente ao montar.
  useEffect(() => {
    frenteRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="cartao-que-vira w-full" data-virado={virado}>
      <p className="sr-only" aria-live="polite">
        {virado ? `Resposta: ${verso}` : ""}
      </p>
      <div className="miolo">
        <button
          ref={frenteRef}
          type="button"
          onClick={aoVirar}
          disabled={virado}
          aria-hidden={virado || undefined}
          aria-label={`Pergunta: ${frente}. Toque para ver a resposta.`}
          className="face face-frente vidro-forte flex min-h-[46dvh] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center"
        >
          <span className="text-ink-muted text-label uppercase">Pergunta</span>
          <span className="text-heading-1 whitespace-pre-wrap">{frente}</span>
        </button>
        <div
          aria-hidden={!virado}
          className="face face-verso vidro-forte flex min-h-[46dvh] w-full flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center"
        >
          <span className="text-ink-muted text-body-sm whitespace-pre-wrap">{frente}</span>
          <span className="h-px w-16 bg-[var(--glass-border)]" aria-hidden />
          <span className="text-heading-1 whitespace-pre-wrap">{virado ? verso : ""}</span>
        </div>
      </div>
    </div>
  );
}
