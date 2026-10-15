"use client";

import { Check, Flame, Pause, Play, X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { AnelDeProgresso } from "@/components/ui/anel-de-progresso";
import { BarraDeProgresso } from "@/components/ui/barra-de-progresso";
import { Esqueleto } from "@/components/ui/esqueleto";
import { GraficoDeBarras } from "@/components/ui/grafico-de-barras";
import { LegendaDoCalor, MapaDeCalor } from "@/components/ui/mapa-de-calor";
import { Seletor } from "@/components/ui/seletor";
import { useHoje, usePerfil } from "@/lib/perfil";
import { useMontado } from "@/lib/usar-montado";
import { nomeCurtoDoDia } from "@/features/tasks/resumos";
import { useTarefas } from "@/features/tasks/queries";
import { useDiasDeFoco, useSequencia } from "../queries";
import {
  barrasDaSemana,
  formatarMinutos,
  gradeDeCalor,
  minutosDoDia,
  totalDaSemana,
} from "../resumos";
import { formatarRelogio, type Fase } from "../timer";
import { useTimerDeFoco } from "../use-timer";

const ROTULO_DA_FASE: Record<Fase, string> = {
  foco: "Foco",
  pausa: "Pausa curta",
  "pausa-longa": "Pausa longa",
};

/**
 * Tela de Foco (MOBILE PRIMEIRO): cronômetro Pomodoro num anel grande, escolha da tarefa,
 * controles e, abaixo, a meta do dia, a sequência (streak), o gráfico da semana e o mapa de calor.
 * O tempo estudado vem das sessões gravadas no banco; a sequência é calculada pelo próprio banco.
 *
 * Só desenha depois de MONTAR (esqueleto até lá): o gráfico e o mapa de calor dependem do "hoje"
 * do APARELHO, e o perfil pode já estar no cache quando o React hidrata esta parte. Nos dois
 * casos a 1ª renderização do cliente sairia diferente do HTML do servidor.
 */
export function FocoView() {
  const montado = useMontado();
  if (!montado) return <FocoEsqueleto />;
  return <Foco />;
}

/** Mesmo casco da tela (título no lugar e o anel do cronômetro), para nada "pular" ao montar. */
function FocoEsqueleto() {
  return (
    <main
      aria-busy="true"
      className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]"
    >
      <header className="flex flex-col gap-1">
        <span className="text-ink-muted text-body-sm font-medium">Carregando…</span>
        <h1 className="font-display text-display-lg">Foco</h1>
      </header>
      <Esqueleto className="mx-auto size-[272px] rounded-full" />
      <div className="grid grid-cols-2 gap-3">
        <Esqueleto className="h-[132px]" />
        <Esqueleto className="h-[132px]" />
      </div>
    </main>
  );
}

function Foco() {
  const { data: perfil } = usePerfil();
  const { data: tarefas = [] } = useTarefas();
  const { data: dias = [] } = useDiasDeFoco();
  const { data: sequencia } = useSequencia();
  const hoje = useHoje();

  const abertas = useMemo(
    () => tarefas.filter((t) => t.parent_id === null && t.status !== "done"),
    [tarefas],
  );
  const trilhaDaTarefa = useCallback(
    (id: string | null) => (id ? (tarefas.find((t) => t.id === id)?.track_id ?? null) : null),
    [tarefas],
  );
  const timer = useTimerDeFoco(trilhaDaTarefa);

  const meta = perfil?.daily_goal_min ?? 120;
  const minutosHoje = minutosDoDia(dias, hoje);
  const percentualMeta = Math.min(100, Math.round((100 * minutosHoje) / Math.max(1, meta)));
  const barras = useMemo(() => barrasDaSemana(dias, hoje), [dias, hoje]);
  const grade = useMemo(() => gradeDeCalor(dias, hoje, meta), [dias, hoje, meta]);
  const totalSemana = totalDaSemana(dias, hoje);
  const diasEstudados = grade.flat().filter((c) => c.minutos > 0).length;

  const progresso = (100 * timer.decorridoMs) / Math.max(1, timer.duracaoMs);
  const ciclo = timer.cfg.cicloDe;
  const focoAtual = timer.fase === "foco" ? timer.ciclo + 1 : null;
  const atual = sequencia?.atual ?? 0;
  const tarefaEscolhida = abertas.find((t) => t.id === timer.taskId);

  return (
    <main className="flex flex-col gap-6 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-1">
        <span className="text-ink-muted text-body-sm font-medium">
          {ROTULO_DA_FASE[timer.fase]}
          {focoAtual ? ` · ${focoAtual} de ${ciclo}` : ""}
        </span>
        <h1 className="font-display text-display-lg">Foco</h1>
      </header>

      {/* Cronômetro */}
      <section aria-label="Cronômetro" className="flex flex-col items-center gap-6">
        <AnelDeProgresso
          valor={progresso}
          rotulo={`Progresso da fase de ${ROTULO_DA_FASE[timer.fase].toLowerCase()}`}
          tamanho={272}
          espessura={14}
        >
          <div className="flex flex-col items-center gap-1">
            <span
              role="timer"
              aria-label="Tempo restante"
              className="font-display text-[56px] leading-none font-bold tracking-tight tabular-nums"
            >
              {formatarRelogio(timer.restanteMs)}
            </span>
            <span className="text-ink-muted text-body-sm max-w-[160px] truncate">
              {timer.fase !== "foco"
                ? "Respire e se alongue"
                : tarefaEscolhida
                  ? tarefaEscolhida.title
                  : "Sem tarefa"}
            </span>
          </div>
        </AnelDeProgresso>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={timer.descartar}
            disabled={!timer.emAndamento}
            aria-label="Descartar"
            className="botao-vidro grid size-12 cursor-pointer place-items-center disabled:cursor-default disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={timer.alternar}
            disabled={!timer.pronto}
            aria-label={timer.rodando ? "Pausar" : timer.emAndamento ? "Continuar" : "Iniciar foco"}
            className="botao-primario grid size-20 cursor-pointer place-items-center"
          >
            {timer.rodando ? (
              <Pause className="size-8" aria-hidden />
            ) : (
              <Play className="size-8" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={timer.concluir}
            disabled={!timer.emAndamento}
            aria-label="Concluir agora"
            className="botao-vidro grid size-12 cursor-pointer place-items-center disabled:cursor-default disabled:opacity-40"
          >
            <Check className="size-5" aria-hidden />
          </button>
        </div>

        {/* Pontinhos do ciclo (quantos focos já foram feitos antes da pausa longa) */}
        <ol aria-label="Ciclo do Pomodoro" className="flex gap-2">
          {Array.from({ length: ciclo }, (_, i) => (
            <li
              key={i}
              aria-label={`Foco ${i + 1}${i < timer.ciclo ? " concluído" : ""}`}
              className={`size-2.5 rounded-pill ${i < timer.ciclo ? "bg-accent" : "bg-ink/20"}`}
            />
          ))}
        </ol>

        <div className="w-full">
          <Seletor
            rotulo="Em qual tarefa você vai trabalhar?"
            opcoes={[
              { valor: "", rotulo: "Sem tarefa (foco livre)" },
              ...abertas.map((t) => ({ valor: t.id, rotulo: t.title })),
            ]}
            valor={timer.taskId ?? ""}
            aoMudar={(v) => timer.escolherTarefa(v || null)}
          />
        </div>
      </section>

      {/* Meta do dia + sequência */}
      <section aria-label="Resumo do dia" className="grid grid-cols-2 gap-3">
        <div className="cartao flex flex-col justify-between gap-4 rounded-xl p-4">
          <span className="text-ink-muted text-body-sm font-semibold">Meta de hoje</span>
          <p className="flex items-baseline gap-1.5">
            <span className="text-numeric-lg tabular-nums">{formatarMinutos(minutosHoje)}</span>
            <span className="text-ink-muted text-body-sm">de {formatarMinutos(meta)}</span>
          </p>
          <BarraDeProgresso valor={percentualMeta} rotulo="Meta diária de estudo" />
        </div>
        <div className="cartao flex flex-col items-center justify-between gap-2 rounded-xl p-4">
          <span className="text-ink-muted text-body-sm self-start font-semibold">Sequência</span>
          <AnelDeProgresso
            valor={Math.min(100, (100 * atual) / 7)}
            rotulo={`Sequência de ${atual} ${atual === 1 ? "dia" : "dias"}`}
            tamanho={84}
            espessura={8}
          >
            <Flame className="text-accent size-6" aria-hidden />
          </AnelDeProgresso>
          <p className="text-body-sm">
            <span className="text-heading-3 tabular-nums">{atual}</span>{" "}
            <span className="text-ink-muted">{atual === 1 ? "dia" : "dias"}</span>
          </p>
        </div>
      </section>

      {/* Semana */}
      <section
        aria-labelledby="titulo-semana"
        className="cartao flex flex-col gap-4 rounded-xl p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-semana" className="text-heading-2">
            Esta semana
          </h2>
          <p className="text-ink-muted text-body-sm tabular-nums">{formatarMinutos(totalSemana)}</p>
        </div>
        <GraficoDeBarras
          descricao={`Minutos de foco por dia: ${barras
            .filter((b) => !b.futuro)
            .map((b) => `${nomeCurtoDoDia(b.dia)} ${b.minutos}`)
            .join(", ")}`}
          barras={barras.map((b) => ({
            rotulo: nomeCurtoDoDia(b.dia).slice(0, 1).toUpperCase(),
            valor: b.minutos,
            destaque: b.hoje,
            futuro: b.futuro,
          }))}
        />
      </section>

      {/* Mapa de calor */}
      <section aria-labelledby="titulo-calor" className="cartao flex flex-col gap-4 rounded-xl p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-calor" className="text-heading-2">
            Últimos 3 meses
          </h2>
          <p className="text-ink-muted text-body-sm tabular-nums">
            {diasEstudados} {diasEstudados === 1 ? "dia" : "dias"} de estudo
          </p>
        </div>
        <MapaDeCalor
          grade={grade}
          descricao={`Mapa de calor: ${diasEstudados} dias de estudo nas últimas 13 semanas`}
        />
        <LegendaDoCalor />
      </section>
    </main>
  );
}
