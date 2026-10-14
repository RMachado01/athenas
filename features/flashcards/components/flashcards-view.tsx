"use client";

import { Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { varDaCor } from "@/features/boards/cores";
import { useTrilhas } from "@/features/tracks/queries";
import { usePerfil } from "@/lib/perfil";
import { useBaralhos, type Baralho } from "../queries";
import { FormularioDeBaralho } from "./formulario-de-baralho";

/**
 * Quantos cartões a pessoa revisaria agora: revisões de hoje + novos até o limite do dia.
 * É uma estimativa (não desconta os novos já vistos hoje); a sessão aplica o limite exato.
 */
export function totalParaRevisar(baralhos: readonly Baralho[], limiteDeNovos: number): number {
  const paraHoje = baralhos.reduce((s, b) => s + b.paraHoje, 0);
  const novos = baralhos.reduce((s, b) => s + b.novos, 0);
  return paraHoje + Math.min(novos, limiteDeNovos);
}

function resumoDoBaralho(b: Baralho): string {
  if (b.total === 0) return "Sem cartões ainda";
  const partes: string[] = [];
  if (b.paraHoje > 0) partes.push(`${b.paraHoje} para revisar`);
  if (b.novos > 0) partes.push(`${b.novos} ${b.novos === 1 ? "novo" : "novos"}`);
  return partes.length > 0
    ? partes.join(" · ")
    : `${b.total} ${b.total === 1 ? "cartão" : "cartões"} · em dia`;
}

/**
 * Lista de baralhos (MOBILE PRIMEIRO): o botão grande "Revisar tudo" no topo e, embaixo, cada
 * baralho com as contagens. "+" cria baralho.
 */
export function FlashcardsView({ caminhoBase = "/flashcards" }: { caminhoBase?: string }) {
  const router = useRouter();
  const { data: baralhos, isPending, isError, refetch } = useBaralhos();
  const { data: perfil } = usePerfil();
  const { data: trilhas = [] } = useTrilhas();
  const [novoAberto, setNovoAberto] = useState(false);
  const total = totalParaRevisar(baralhos ?? [], perfil?.new_cards_per_day ?? 10);
  const nomeDaTrilha = (id: string | null) => trilhas.find((t) => t.id === id)?.name;

  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-body-sm font-medium">
            {baralhos ? `${total} para revisar hoje` : "Repetição espaçada"}
          </span>
          <h1 className="font-display text-display-lg">Flashcards</h1>
        </div>
        <button
          type="button"
          onClick={() => setNovoAberto(true)}
          aria-label="Novo baralho"
          className="botao-primario grid size-12 shrink-0 cursor-pointer place-items-center"
        >
          <Plus className="size-6" strokeWidth={2.5} aria-hidden />
        </button>
      </header>

      {isError ? (
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar os baralhos.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      ) : isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando baralhos</span>
          <Esqueleto className="h-14 rounded-full" />
          <Esqueleto className="h-20" />
          <Esqueleto className="h-20" />
        </div>
      ) : baralhos.length === 0 ? (
        <div className="cartao flex flex-col items-start gap-3 rounded-xl p-5">
          <p className="font-semibold">Nenhum baralho ainda</p>
          <p className="text-ink-muted text-body-sm">
            Crie um baralho e adicione cartões, ou escreva <code>pergunta :: resposta</code> em
            qualquer nota: a linha vira um cartão sozinha.
          </p>
          <button
            type="button"
            onClick={() => setNovoAberto(true)}
            className="botao-primario min-h-11 cursor-pointer px-5 font-semibold"
          >
            Criar meu primeiro baralho
          </button>
        </div>
      ) : (
        <>
          {total > 0 ? (
            <Link
              href={`${caminhoBase}/revisar`}
              className="botao-primario flex min-h-14 items-center justify-center gap-2 font-semibold"
            >
              <Layers className="size-5" aria-hidden />
              Revisar tudo ({total})
            </Link>
          ) : (
            <p className="cartao text-ink-muted rounded-pill px-5 py-4 text-center">
              Nada para revisar agora. Volte amanhã.
            </p>
          )}
          <ul role="list" className="flex flex-col gap-2">
            {baralhos.map((b) => {
              const trilha = nomeDaTrilha(b.trilhaId);
              return (
                <li key={b.id}>
                  <Link
                    href={`${caminhoBase}/${b.id}`}
                    className="cartao tocavel flex items-center gap-3 rounded-lg p-4"
                  >
                    <span
                      aria-hidden
                      className="size-3.5 shrink-0 rounded-full"
                      style={{ background: varDaCor(b.cor) }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-semibold">{b.nome}</span>
                      <span className="text-ink-muted text-body-sm">
                        {resumoDoBaralho(b)}
                        {trilha ? ` · ${trilha}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <FolhaInferior aberta={novoAberto} aoMudar={setNovoAberto} titulo="Novo baralho">
        <FormularioDeBaralho
          aoTerminar={(id) => {
            setNovoAberto(false);
            router.push(`${caminhoBase}/${id}`);
          }}
        />
      </FolhaInferior>
    </main>
  );
}
