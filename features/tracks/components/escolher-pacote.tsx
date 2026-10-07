"use client";

import { useMarcarTrilhasEscolhidas } from "@/lib/perfil";
import { PACOTES_DE_TRILHAS, type PacoteDeTrilhas } from "../pacotes";
import { useCriarPacoteDeTrilhas } from "../queries";

/**
 * Onboarding de trilhas: a pessoa escolhe o que estuda e já ganha as trilhas. Cada pacote é só
 * um ponto de partida: tudo pode ser renomeado, arquivado ou ampliado depois.
 */
export function EscolherPacote() {
  const criarPacote = useCriarPacoteDeTrilhas();
  const marcar = useMarcarTrilhasEscolhidas();
  const ocupado = criarPacote.isPending || marcar.isPending;

  function escolher(pacote: PacoteDeTrilhas) {
    criarPacote.mutate(pacote, { onSuccess: () => marcar.mutate() });
  }

  return (
    <section
      aria-labelledby="titulo-pacotes"
      className="bg-surface border-hairline flex flex-col gap-5 rounded-lg border p-6"
    >
      <div className="flex flex-col gap-1">
        <span className="text-label text-ink-muted uppercase">Primeiros passos</span>
        <h2 id="titulo-pacotes" className="font-display text-heading-1">
          O que você estuda?
        </h2>
        <p className="text-ink-muted max-w-prose">
          Escolha um ponto de partida. As trilhas organizam suas tarefas e mostram seu progresso, e
          você muda tudo depois.
        </p>
      </div>

      <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PACOTES_DE_TRILHAS.map((pacote) => (
          <li key={pacote.id}>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => escolher(pacote)}
              className="border-border-strong hover:border-accent flex h-full min-h-11 w-full cursor-pointer flex-col items-start gap-1 rounded-[10px] border p-4 text-left transition-colors duration-(--duration-instant) disabled:opacity-45"
            >
              <span className="font-semibold">{pacote.nome}</span>
              <span className="text-ink-muted text-body-sm">{pacote.descricao}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
