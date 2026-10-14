"use client";

import * as m from "motion/react-m";
import { useSearchParams } from "next/navigation";
import { Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { Segmentado } from "@/components/ui/segmentado";
import { useHoje } from "@/lib/perfil";
import { DURACAO, EASE_OUT } from "@/lib/movimento";
import { EscolherPacote } from "@/features/tracks/components/escolher-pacote";
import { GerenciarTrilhas } from "@/features/tracks/components/gerenciar-trilhas";
import { useTrilhas } from "@/features/tracks/queries";
import { usePerfil, useSalvarAparencia } from "@/lib/perfil";
import { ABAS, agruparDoDia, agruparPorAba, resumir, subtarefasPorMae, type Aba } from "../agrupar";
import { useAlternarConclusao, useAtualizarTarefa, useCriarTarefa } from "../mutations";
import { useTarefas } from "../queries";
import { pontosPorDia, semanaDe } from "../resumos";
import {
  VISOES,
  VISOES_DISPONIVEIS,
  lerAgruparPor,
  lerVisao,
  paraSalvarAgruparPor,
  paraSalvarVisao,
  type Visao,
} from "../visoes";
import { AdicionarRapido } from "./adicionar-rapido";
import { FaixaDaSemana } from "./faixa-da-semana";
import { GrupoDeTarefas } from "./grupo-de-tarefas";
import { PainelDeDetalhes } from "./painel-de-detalhes";
import { CalendarioDeTarefas } from "./calendario-de-tarefas";
import { QuadroDeTarefas } from "./quadro-de-tarefas";
import { TarefaItem } from "./tarefa-item";

/**
 * Tela de Tarefas (MOBILE PRIMEIRO): título, campo "adicionar rápido" em pílula, controle
 * segmentado (Hoje · Semana · Todas · Concluídas), faixa da semana com pontinhos e a lista em
 * cartões. O detalhe da tarefa abre numa folha que sobe de baixo.
 */
export function TarefasView() {
  const { data: tarefas, isPending, isError, refetch } = useTarefas();
  const { data: trilhas = [], isPending: carregandoTrilhas } = useTrilhas();
  const { data: perfil } = usePerfil();
  const hoje = useHoje();
  const alternar = useAlternarConclusao();
  const atualizar = useAtualizarTarefa();
  const criar = useCriarTarefa();
  const salvarAparencia = useSalvarAparencia();
  const [trilhasAbertas, setTrilhasAbertas] = useState(false);

  // A visão escolhida fica no perfil (vale em qualquer aparelho). Visão que ainda não existe
  // no app (salva por uma versão futura) cai na Lista.
  const aparencia = perfil?.appearance ?? {};
  const visaoSalva = lerVisao(aparencia);
  const visao: Visao = VISOES_DISPONIVEIS.includes(visaoSalva) ? visaoSalva : "lista";
  const agruparPor = lerAgruparPor(aparencia);

  // ?aba=hoje|semana|todas|concluidas (links do Início); sem nada, abre em "Semana".
  const abaDaUrl = useSearchParams().get("aba");
  const [aba, setAba] = useState<Aba>(ABAS.find((a) => a.id === abaDaUrl)?.id ?? "semana");
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);

  const lista = useMemo(() => tarefas ?? [], [tarefas]);
  const subtarefas = useMemo(() => subtarefasPorMae(lista), [lista]);
  const resumo = useMemo(() => resumir(lista), [lista]);
  const semana = useMemo(() => semanaDe(hoje), [hoje]);
  const pontos = useMemo(() => pontosPorDia(lista, semana), [lista, semana]);
  const nomeDaTrilha = useMemo(() => new Map(trilhas.map((t) => [t.id, t.name])), [trilhas]);

  const mostraFaixa = aba === "hoje" || aba === "semana";
  const grupos = useMemo(
    () =>
      diaEscolhido && mostraFaixa ? [agruparDoDia(lista, diaEscolhido)] : agruparPorAba(lista, aba),
    [lista, aba, diaEscolhido, mostraFaixa],
  );

  const selecionada = lista.find((t) => t.id === selecionadaId) ?? null;
  const totalVisivel = grupos.reduce((soma, g) => soma + g.tarefas.length, 0);
  const mostrarOnboarding =
    perfil !== undefined &&
    !carregandoTrilhas &&
    trilhas.length === 0 &&
    !perfil.appearance.trilhas_escolhidas;

  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-1">
        <span className="text-ink-muted text-body-sm font-medium" aria-live="polite">
          {isPending
            ? "Carregando…"
            : `${resumo.abertas} ${resumo.abertas === 1 ? "aberta" : "abertas"} · ${resumo.atrasadas} ${resumo.atrasadas === 1 ? "atrasada" : "atrasadas"}`}
        </span>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-display-lg">Tarefas</h1>
          <button
            type="button"
            onClick={() => setTrilhasAbertas(true)}
            className="botao-vidro text-body-sm flex min-h-11 shrink-0 cursor-pointer items-center gap-2 px-4 font-semibold"
          >
            <Tags className="size-4" aria-hidden />
            Trilhas
          </button>
        </div>
      </header>

      {mostrarOnboarding && <EscolherPacote />}

      <AdicionarRapido />

      <Segmentado
        rotulo="Visão"
        compacto
        opcoes={VISOES.filter((v) => VISOES_DISPONIVEIS.includes(v.id))}
        valor={visao}
        aoMudar={(v) => salvarAparencia.mutate(paraSalvarVisao(v))}
      >
        {visao === "calendario" ? (
          <CalendarioDeTarefas
            tarefas={lista}
            trilhas={trilhas}
            hoje={hoje}
            aoSelecionar={setSelecionadaId}
            aoAlternar={(t) => alternar(t)}
            aoMudarDatas={(id, campos) => atualizar.mutate({ id, campos })}
            aoCriar={(nova) => criar.mutate({ id: crypto.randomUUID(), ...nova })}
          />
        ) : visao === "quadro" ? (
          <QuadroDeTarefas
            tarefas={lista}
            trilhas={trilhas}
            subtarefas={subtarefas}
            hoje={hoje}
            agruparPor={agruparPor}
            aoMudarAgrupar={(g) => salvarAparencia.mutate(paraSalvarAgruparPor(g))}
            selecionadaId={selecionadaId}
            aoSelecionar={setSelecionadaId}
            aoAlternar={(t) => alternar(t)}
            aoMover={(id, campos) => atualizar.mutate({ id, campos })}
            aoCriar={(nova) => criar.mutate({ id: crypto.randomUUID(), ...nova })}
          />
        ) : (
          <Segmentado
            rotulo="Período"
            opcoes={ABAS}
            valor={aba}
            aoMudar={(nova) => {
              setAba(nova);
              setDiaEscolhido(null);
            }}
          >
            <div className="flex flex-col gap-6">
              {mostraFaixa && (
                <FaixaDaSemana
                  dias={semana}
                  pontos={pontos}
                  hoje={hoje}
                  selecionado={diaEscolhido}
                  aoSelecionar={setDiaEscolhido}
                />
              )}

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
                  <Esqueleto className="h-[72px]" />
                  <Esqueleto className="h-[72px]" />
                  <Esqueleto className="h-[72px]" />
                </div>
              ) : totalVisivel === 0 && !diaEscolhido ? (
                <m.p
                  initial={{ y: 8 }}
                  animate={{ y: 0 }}
                  transition={{ duration: DURACAO.base, ease: EASE_OUT }}
                  className="cartao text-ink-muted rounded-xl px-5 py-8 text-center"
                >
                  {aba === "concluidas"
                    ? "Nenhuma tarefa concluída ainda."
                    : "Nada por aqui. Escreva uma tarefa acima e aperte Enter."}
                </m.p>
              ) : totalVisivel === 0 ? (
                <p className="cartao text-ink-muted rounded-xl px-5 py-8 text-center">
                  Nenhuma tarefa neste dia. Toque no dia de novo para ver tudo.
                </p>
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
                            nomeDaTrilha={
                              t.track_id ? (nomeDaTrilha.get(t.track_id) ?? null) : null
                            }
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
          </Segmentado>
        )}
      </Segmentado>

      {/* Detalhes: folha que sobe de baixo (padrão de app mobile). */}
      <FolhaInferior
        aberta={selecionada !== null}
        aoMudar={(aberta) => !aberta && setSelecionadaId(null)}
        titulo="Detalhes da tarefa"
      >
        {selecionada && (
          <PainelDeDetalhes
            key={selecionada.id}
            tarefa={selecionada}
            trilhas={trilhas}
            subtarefas={subtarefas.get(selecionada.id) ?? []}
            aoExcluir={() => setSelecionadaId(null)}
          />
        )}
      </FolhaInferior>
      <FolhaInferior aberta={trilhasAbertas} aoMudar={setTrilhasAbertas} titulo="Trilhas">
        <GerenciarTrilhas />
      </FolhaInferior>
    </main>
  );
}
