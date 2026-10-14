"use client";

/**
 * O cartão da sessão: frente; tocar (ou "Mostrar resposta") vira para o verso.
 * O verso fica escondido do leitor de tela até virar (aria-hidden) e é anunciado ao virar.
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
  return (
    <div className="cartao-que-vira w-full" data-virado={virado}>
      <div className="miolo">
        <button
          type="button"
          onClick={aoVirar}
          disabled={virado}
          aria-label={virado ? undefined : `Pergunta: ${frente}. Toque para ver a resposta.`}
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
          <span className="text-heading-1 whitespace-pre-wrap" aria-live="polite">
            {virado ? verso : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
