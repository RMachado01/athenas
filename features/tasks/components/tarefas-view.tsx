"use client";

import * as m from "motion/react-m";
import { Dialog, Tabs } from "radix-ui";
import { useMemo, useState } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useHoje, usePerfil } from "@/lib/perfil";
import { useMediaQuery } from "@/lib/usar-media-query";
import { DURACAO, EASE_OUT, MOLA } from "@/lib/movimento";
import { EscolherPacote } from "@/features/tracks/components/escolher-pacote";
import { useTrilhas } from "@/features/tracks/queries";
import { ABAS, agruparPorAba, resumir, subtarefasPorMae, type Aba } from "../agrupar";
import { useAlternarConclusao } from "../mutations";
import { useTarefas } from "../queries";
import { AdicionarRapido } from "./adicionar-rapido";
import { GrupoDeTarefas } from "./grupo-de-tarefas";
import { PainelDeDetalhes } from "./painel-de-detalhes";
import { TarefaItem } from "./tarefa-item";

/** Tela de Tarefas (design: Tasks.dc.html): título, adicionar rápido, abas, grupos e painel de detalhes. */
export function TarefasView() {
  const { data: tarefas, isPending, isError, refetch } = useTarefas();
  const { data: trilhas = [], isPending: carregandoTrilhas } = useTrilhas();
  const { data: perfil } = usePerfil();
  const hoje = useHoje();
  const alternar = useAlternarConclusao();
  const painelFixo = useMediaQuery("(min-width: 1024px)");

  const [aba, setAba] = useState<Aba>("semana");
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  const lista = useMemo(() => tarefas ?? [], [tarefas]);
  const subtarefas = useMemo(() => subtarefasPorMae(lista), [lista]);
  const grupos = useMemo(() => agruparPorAba(lista, aba), [lista, aba]);
  const resumo = useMemo(() => resumir(lista), [lista]);
  const nomeDaTrilha = useMemo(() => new Map(trilhas.map((t) => [t.id, t.name])), [trilhas]);

  const selecionada = lista.find((t) => t.id === selecionadaId) ?? null;
  const totalVisivel = grupos.reduce((soma, g) => soma + g.tarefas.length, 0);
  const mostrarOnboarding =
    perfil !== undefined &&
    !carregandoTrilhas &&
    trilhas.length === 0 &&
    !perfil.appearance.trilhas_escolhidas;

  const painel = selecionada ? (
    <PainelDeDetalhes
      key={selecionada.id}
      tarefa={selecionada}
      trilhas={trilhas}
      subtarefas={subtarefas.get(selecionada.id) ?? []}
      aoExcluir={() => setSelecionadaId(null)}
    />
  ) : null;

  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-8 sm:px-8 lg:px-14 lg:py-12">
      <header className="flex flex-col gap-2">
        <span className="text-label text-ink-muted uppercase" aria-live="polite">
          {isPending
            ? "Carregando…"
            : `${resumo.abertas} ${resumo.abertas === 1 ? "aberta" : "abertas"} · ${resumo.atrasadas} ${resumo.atrasadas === 1 ? "atrasada" : "atrasadas"}`}
        </span>
        <h1 className="font-display text-display-lg">Tarefas</h1>
      </header>

      {mostrarOnboarding && <EscolherPacote />}

      <AdicionarRapido />

      <Tabs.Root value={aba} onValueChange={(v) => setAba(v as Aba)}>
        <Tabs.List
          aria-label="Período"
          className="vidro rounded-pill flex w-fit max-w-full gap-1 overflow-x-auto p-1"
        >
          {ABAS.map((a) => (
            <Tabs.Trigger
              key={a.id}
              value={a.id}
              className={`relative min-h-11 cursor-pointer rounded-pill px-4 font-semibold whitespace-nowrap transition-colors duration-(--duration-fast) ${
                aba === a.id ? "text-on-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              {aba === a.id && (
                // Pílula colorida que DESLIZA entre as abas (mola do design system).
                <m.span
                  layoutId="indicador-da-aba"
                  transition={MOLA}
                  className="bg-accent rounded-pill absolute inset-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_8px_20px_-10px_var(--accent)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative">{a.rotulo}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value={aba} className="mt-6 flex flex-wrap items-start gap-6 outline-none">
          <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-6">
            {isError ? (
              <p role="alert" className="border-danger text-danger rounded-lg border p-4">
                Não deu pra carregar as tarefas.{" "}
                <button type="button" onClick={() => refetch()} className="underline">
                  Tentar de novo
                </button>
              </p>
            ) : isPending ? (
              <div aria-busy="true" className="flex flex-col gap-2">
                <span className="sr-only">Carregando tarefas</span>
                <Esqueleto className="h-16" />
                <Esqueleto className="h-16" />
                <Esqueleto className="h-16" />
              </div>
            ) : totalVisivel === 0 ? (
              <m.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURACAO.base, ease: EASE_OUT }}
                className="text-ink-muted py-8 text-center"
              >
                {aba === "concluidas"
                  ? "Nenhuma tarefa concluída ainda."
                  : "Nada por aqui. Escreva uma tarefa acima e aperte Enter."}
              </m.p>
            ) : (
              grupos
                .filter((g) => g.tarefas.length > 0)
                .map((g) => (
                  <GrupoDeTarefas
                    key={g.grupo}
                    titulo={g.titulo}
                    quantidade={g.tarefas.length}
                    tom={g.tom}
                  >
                    {g.tarefas.map((t, i) => {
                      const subs = subtarefas.get(t.id) ?? [];
                      return (
                        <TarefaItem
                          key={t.id}
                          tarefa={t}
                          nomeDaTrilha={t.track_id ? (nomeDaTrilha.get(t.track_id) ?? null) : null}
                          hoje={hoje}
                          subtarefas={{
                            total: subs.length,
                            feitas: subs.filter((s) => s.status === "done").length,
                          }}
                          selecionada={t.id === selecionadaId}
                          indice={i}
                          aoSelecionar={() => setSelecionadaId(t.id)}
                          aoAlternar={() => alternar(t)}
                        />
                      );
                    })}
                  </GrupoDeTarefas>
                ))
            )}
          </div>

          {/* Desktop: painel fixo ao lado. */}
          {painelFixo && (
            <aside
              aria-label="Detalhes da tarefa"
              className="vidro-forte sticky top-6 flex min-w-0 flex-[2_1_320px] flex-col gap-5 rounded-xl p-6"
            >
              {painel ?? (
                <p className="text-ink-muted">Selecione uma tarefa para ver os detalhes.</p>
              )}
            </aside>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Celular: o painel abre como uma folha por cima (Radix Dialog: foco preso, Esc fecha). */}
      {!painelFixo && (
        <Dialog.Root
          open={selecionada !== null}
          onOpenChange={(aberto) => !aberto && setSelecionadaId(null)}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="bg-scrim fixed inset-0 z-40 backdrop-blur-sm" />
            <Dialog.Content
              aria-describedby={undefined}
              className="vidro-forte fixed inset-x-2 bottom-2 z-50 max-h-[88vh] overflow-y-auto rounded-xl p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-label text-ink-muted uppercase">
                  Detalhes da tarefa
                </Dialog.Title>
                <Dialog.Close className="hover:text-accent min-h-11 min-w-11 cursor-pointer rounded-md px-2 font-semibold">
                  Fechar
                </Dialog.Close>
              </div>
              {painel}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </main>
  );
}
