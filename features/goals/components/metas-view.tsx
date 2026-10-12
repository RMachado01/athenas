"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { useTrilhas } from "@/features/tracks/queries";
import { useArquivarMeta, useCriarMeta, useMetas } from "../queries";
import { ordenarMetas, type MetaValidada } from "../regras";
import { CartaoDeMeta } from "./cartao-de-meta";
import { NovaMeta } from "./nova-meta";

/** Sugestões para quem ainda não tem metas: um toque cria. */
const SUGESTOES: MetaValidada[] = [
  {
    titulo: "5 h de foco por semana",
    tipo: "minutos",
    periodo: "semana",
    alvo: 300,
    trilhaId: null,
  },
  { titulo: "15 tarefas por semana", tipo: "tarefas", periodo: "semana", alvo: 15, trilhaId: null },
  { titulo: "20 h de foco por mês", tipo: "minutos", periodo: "mes", alvo: 1200, trilhaId: null },
];

/**
 * Metas (MOBILE PRIMEIRO): lista de metas com anel de progresso, a mais perto de bater
 * primeiro. O progresso vem do banco (sessões de foco e tarefas concluídas no período).
 */
export function MetasView() {
  const { data: metas, isPending, isError, refetch } = useMetas();
  const { data: trilhas = [] } = useTrilhas();
  const criar = useCriarMeta();
  const arquivar = useArquivarMeta();
  const [novaAberta, setNovaAberta] = useState(false);

  const nomeDaTrilha = useMemo(() => new Map(trilhas.map((t) => [t.id, t.name])), [trilhas]);
  const lista = useMemo(() => ordenarMetas(metas ?? []), [metas]);
  const batidas = lista.filter((m) => m.percentual >= 100).length;

  return (
    <main className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-body-sm font-medium" aria-live="polite">
            {isPending
              ? "Carregando…"
              : lista.length === 0
                ? "Defina aonde quer chegar"
                : `${batidas} de ${lista.length} ${lista.length === 1 ? "batida" : "batidas"}`}
          </span>
          <h1 className="font-display text-display-lg">Metas</h1>
        </div>
        <button
          type="button"
          onClick={() => setNovaAberta(true)}
          aria-label="Nova meta"
          className="botao-primario grid size-12 shrink-0 cursor-pointer place-items-center"
        >
          <Plus className="size-6" strokeWidth={2.5} aria-hidden />
        </button>
      </header>

      {isError ? (
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar as metas.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      ) : isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Carregando metas</span>
          <Esqueleto className="h-[96px]" />
          <Esqueleto className="h-[96px]" />
        </div>
      ) : lista.length === 0 ? (
        <section aria-labelledby="titulo-sugestoes" className="flex flex-col gap-3">
          <p className="cartao text-ink-muted rounded-xl p-5">
            Metas transformam estudo em progresso visível. O app conta sozinho: minutos das suas
            sessões de foco e tarefas concluídas.
          </p>
          <h2 id="titulo-sugestoes" className="text-heading-3">
            Comece com uma sugestão
          </h2>
          <ul role="list" className="flex flex-col gap-2">
            {SUGESTOES.map((s) => (
              <li key={s.titulo}>
                <button
                  type="button"
                  onClick={() => criar.mutate({ ...s, id: crypto.randomUUID() })}
                  className="botao-vidro flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-5 font-semibold"
                >
                  {s.titulo}
                  <Plus className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ul role="list" className="flex flex-col gap-3">
          {lista.map((m) => (
            <li key={m.id}>
              <CartaoDeMeta
                meta={m}
                nomeDaTrilha={m.trilhaId ? (nomeDaTrilha.get(m.trilhaId) ?? null) : null}
                aoArquivar={() => arquivar(m)}
              />
            </li>
          ))}
        </ul>
      )}

      <FolhaInferior aberta={novaAberta} aoMudar={setNovaAberta} titulo="Nova meta">
        <NovaMeta aoCriar={() => setNovaAberta(false)} />
      </FolhaInferior>
    </main>
  );
}
