"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { usePerfil } from "@/lib/perfil";
import { useBaralhos } from "../queries";
import { totalParaRevisar } from "./flashcards-view";

/**
 * Card "Revisar hoje" do Início: quantos cartões esperam revisão (revisões de hoje + novos até o
 * limite do dia). É uma estimativa: não desconta os novos já vistos hoje (a sessão aplica o
 * limite exato). Some enquanto a pessoa não tem cartões; mostra "Tudo em dia" quando zera.
 */
export function RevisarHoje({ caminhoBase = "/flashcards" }: { caminhoBase?: string }) {
  const { data: baralhos } = useBaralhos();
  const { data: perfil } = usePerfil();
  if (!baralhos || baralhos.every((b) => b.total === 0)) return null;
  const total = totalParaRevisar(baralhos, perfil?.new_cards_per_day ?? 10);

  return (
    <section
      aria-labelledby="titulo-revisar-hoje"
      className="cartao flex items-center gap-4 rounded-xl p-4"
    >
      <span className="bg-brand-soft/60 grid size-11 shrink-0 place-items-center rounded-md">
        <Layers className="text-accent size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 id="titulo-revisar-hoje" className="text-heading-2">
          Revisar hoje
        </h2>
        <p className="text-ink-muted text-body-sm">
          {total === 0
            ? "Tudo em dia. Volte amanhã."
            : `${total} ${total === 1 ? "cartão esperando" : "cartões esperando"} você`}
        </p>
      </div>
      {total > 0 && (
        <Link
          href={`${caminhoBase}/revisar`}
          className="botao-primario grid min-h-11 shrink-0 place-items-center px-5 font-semibold"
        >
          Começar
        </Link>
      )}
    </section>
  );
}
