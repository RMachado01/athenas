"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Circle, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { somarDias } from "@/lib/datas";
import { useHoje, usePerfil } from "@/lib/perfil";
import { useMontado } from "@/lib/usar-montado";
import { FaixaDaSemana } from "@/features/tasks/components/faixa-da-semana";
import { useTarefas } from "@/features/tasks/queries";
import { nomeLongoDoDia, semanaDe } from "@/features/tasks/resumos";
import type { Tarefa } from "@/features/tasks/tipos";
import {
  distribuirEmColunas,
  eventoNoDia,
  formatarHora,
  haQuantoTempo,
  intervaloNoDia,
  noFuso,
  type EventoDaAgenda,
} from "../dia";
import {
  useAgendasGoogle,
  useConexaoGoogle,
  useEventosDaSemana,
  useSincronizarGoogle,
} from "../queries";

/** Altura de 1 hora na grade (px). 56 px = 1 min ≈ 0,93 px: dá para ler blocos de 30 min. */
const HORA_PX = 56;
const MESES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

type ItemDaGrade = { tipo: "evento"; evento: EventoDaAgenda } | { tipo: "tarefa"; tarefa: Tarefa };

/**
 * Agenda (MOBILE PRIMEIRO, estilo Notion Calendar): faixa da semana, linha "Dia todo" e uma
 * grade de horas limpa, com linhas finas e blocos com a cor da agenda na borda esquerda.
 * Mostra eventos importados do Google (somente leitura) junto das tarefas com prazo no dia.
 */
/** A Agenda depende do relógio do aparelho: só desenha depois de montar (esqueleto até lá). */
export function AgendaView() {
  const montado = useMontado();
  if (!montado) {
    return (
      <main
        aria-busy="true"
        className="flex flex-col gap-5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]"
      >
        <span className="sr-only">Carregando agenda</span>
        <Esqueleto className="h-16 w-40" />
        <Esqueleto className="h-[78px]" />
        <Esqueleto className="h-[58dvh]" />
      </main>
    );
  }
  return <Agenda />;
}

function Agenda() {
  const hoje = useHoje();
  const { data: perfil } = usePerfil();
  const fuso = perfil?.timezone ?? "America/Sao_Paulo";
  const [dia, setDia] = useState(hoje);
  const [aberto, setAberto] = useState<EventoDaAgenda | null>(null);

  const semana = useMemo(() => semanaDe(dia), [dia]);
  const inicioDaSemana = semana[0] ?? dia;

  const { data: conexao, isPending: carregandoConexao } = useConexaoGoogle();
  const conectado = conexao != null;
  const { data: agendas = [] } = useAgendasGoogle(conectado);
  const { data: eventos = [] } = useEventosDaSemana(inicioDaSemana, conectado);
  const { data: tarefas = [] } = useTarefas();
  const sincronizar = useSincronizarGoogle();

  // Sincroniza ao abrir, se a última vez foi há mais de 2 minutos (uma vez por visita).
  const jaPediu = useRef(false);
  useEffect(() => {
    if (!conexao || conexao.status !== "active" || jaPediu.current) return;
    const ultima = conexao.ultimaSincronizacao
      ? new Date(conexao.ultimaSincronizacao).getTime()
      : 0;
    if (Date.now() - ultima > 2 * 60_000) {
      jaPediu.current = true;
      sincronizar.mutate();
    }
  }, [conexao, sincronizar]);

  // Aviso ao voltar da tela de permissão do Google.
  const parametro = useSearchParams().get("google");
  useEffect(() => {
    if (parametro === "conectado")
      toast.success("Google Agenda conectado! Importando seus eventos…", {
        id: "google-conectado",
      });
  }, [parametro]);

  const corDaAgenda = useMemo(() => new Map(agendas.map((a) => [a.id, a.cor])), [agendas]);
  const nomeDaAgenda = useMemo(() => new Map(agendas.map((a) => [a.id, a.nome])), [agendas]);

  const doDia = useMemo(
    () => eventos.filter((e) => eventoNoDia(e, dia, fuso)),
    [eventos, dia, fuso],
  );
  const tarefasDoDia = useMemo(
    () => tarefas.filter((t) => t.parent_id === null && t.status !== "done" && t.due_on === dia),
    [tarefas, dia],
  );

  const diaTodo = doDia.filter((e) => e.diaInteiro);
  const tarefasSemHora = tarefasDoDia.filter((t) => !t.due_time);
  const blocos = useMemo(() => {
    const itens: { item: ItemDaGrade; inicioMin: number; fimMin: number }[] = [];
    for (const e of doDia) {
      const intervalo = intervaloNoDia(e, dia, fuso);
      if (intervalo) itens.push({ item: { tipo: "evento", evento: e }, ...intervalo });
    }
    for (const t of tarefasDoDia) {
      if (!t.due_time) continue;
      const [h, m] = t.due_time.split(":").map(Number) as [number, number];
      const inicioMin = h * 60 + m;
      itens.push({
        item: { tipo: "tarefa", tarefa: t },
        inicioMin,
        fimMin: inicioMin + Math.max(30, Math.min(t.estimate_min ?? 30, 240)),
      });
    }
    return distribuirEmColunas(itens);
  }, [doDia, tarefasDoDia, dia, fuso]);

  // Contagem por dia para os pontinhos da faixa (eventos + tarefas).
  const pontos = useMemo(() => {
    const r: Record<string, number> = {};
    for (const d of semana) {
      r[d] =
        eventos.filter((e) => eventoNoDia(e, d, fuso)).length +
        tarefas.filter((t) => t.parent_id === null && t.status !== "done" && t.due_on === d).length;
    }
    return r;
  }, [semana, eventos, tarefas, fuso]);

  // Linha do "agora" e rolagem inicial (perto da hora atual, ou 7h).
  const [agoraMin, setAgoraMin] = useState<number | null>(null);
  useEffect(() => {
    const atualizar = () => setAgoraMin(noFuso(new Date().toISOString(), fuso).minutos);
    atualizar();
    const id = window.setInterval(atualizar, 60_000);
    return () => window.clearInterval(id);
  }, [fuso]);
  const grade = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const alvo = dia === hoje && agoraMin !== null ? Math.max(0, agoraMin - 90) : 7 * 60;
    grade.current?.scrollTo({ top: (alvo / 60) * HORA_PX });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao trocar de dia
  }, [dia]);

  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-body-sm font-medium first-letter:uppercase">
            {MESES.format(new Date(`${dia}T12:00:00Z`))}
          </span>
          <h1 className="font-display text-display-lg">Agenda</h1>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Navegar semanas">
          <button
            type="button"
            onClick={() => setDia(somarDias(dia, -7))}
            aria-label="Semana anterior"
            className="botao-vidro grid size-11 cursor-pointer place-items-center"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setDia(hoje)}
            disabled={dia === hoje}
            className="botao-vidro text-body-sm min-h-11 cursor-pointer px-4 font-semibold disabled:cursor-default disabled:opacity-50"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setDia(somarDias(dia, 7))}
            aria-label="Próxima semana"
            className="botao-vidro grid size-11 cursor-pointer place-items-center"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <FaixaDaSemana
        dias={semana}
        pontos={pontos}
        hoje={hoje}
        selecionado={dia}
        aoSelecionar={(d) => d && setDia(d)}
        descreverPontos={(n) =>
          n === 0 ? "nada marcado" : n === 1 ? "1 item na agenda" : `${n} itens na agenda`
        }
      />

      <StatusDaConexao
        carregando={carregandoConexao}
        conexao={conexao ?? null}
        sincronizando={sincronizar.isPending}
        aoAtualizar={() => sincronizar.mutate()}
      />

      <section
        aria-label={`Agenda de ${nomeLongoDoDia(dia)}`}
        className="cartao overflow-hidden rounded-xl"
      >
        {/* Dia todo (Notion: faixa fina acima da grade) */}
        <div className="flex gap-2 border-b border-[var(--glass-border)] px-3 py-2.5">
          <span className="text-ink-muted w-10 shrink-0 pt-1 text-[11px] font-medium uppercase">
            Dia todo
          </span>
          <ul role="list" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {diaTodo.length === 0 && tarefasSemHora.length === 0 && (
              <li className="text-ink-muted text-body-sm py-1">—</li>
            )}
            {diaTodo.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setAberto(e)}
                  className="text-body-sm flex min-h-8 max-w-full cursor-pointer items-center rounded-md px-2.5 font-medium"
                  style={estiloDoEvento(corDaAgenda.get(e.agendaId))}
                >
                  <span className="truncate">{e.titulo}</span>
                </button>
              </li>
            ))}
            {tarefasSemHora.map((t) => (
              <li
                key={t.id}
                className="text-body-sm flex min-h-8 items-center gap-1.5 rounded-md border border-dashed border-[var(--glass-border)] px-2.5"
              >
                <Circle className="text-accent size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{t.title}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Grade de horas */}
        <div
          ref={grade}
          className="relative max-h-[58dvh] overflow-y-auto overscroll-contain"
          aria-label="Horários do dia"
          role="region"
          tabIndex={0}
        >
          <div className="relative" style={{ height: 24 * HORA_PX }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                aria-hidden="true"
                className="absolute inset-x-0 flex"
                style={{ top: h * HORA_PX, height: HORA_PX }}
              >
                <span className="text-ink-muted w-12 shrink-0 -translate-y-2 pr-2 text-right text-[11px] tabular-nums">
                  {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                </span>
                <span className="flex-1 border-t border-[var(--glass-border)]" />
              </div>
            ))}

            {dia === hoje && agoraMin !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 left-12 z-20 flex items-center"
                style={{ top: (agoraMin / 60) * HORA_PX }}
              >
                <span className="bg-danger -ml-1 size-2 rounded-full" />
                <span className="bg-danger h-px flex-1" />
              </div>
            )}

            <ul role="list" className="absolute inset-y-0 right-2 left-12">
              {blocos.map((b) => {
                const topo = (b.inicioMin / 60) * HORA_PX;
                const altura = Math.max(((b.fimMin - b.inicioMin) / 60) * HORA_PX, 22);
                const largura = 100 / b.colunas;
                const posicao: CSSProperties = {
                  top: topo,
                  height: altura,
                  left: `calc(${b.coluna * largura}% + 2px)`,
                  width: `calc(${largura}% - 4px)`,
                };
                const horario = `${formatarHora(b.inicioMin)}–${formatarHora(b.fimMin)}`;
                if (b.item.tipo === "tarefa") {
                  const t = b.item.tarefa;
                  return (
                    <li
                      key={`t-${t.id}`}
                      className="bg-card/80 absolute flex flex-col overflow-hidden rounded-md border border-dashed border-[var(--accent)] px-2 py-1"
                      style={posicao}
                    >
                      <span className="flex items-center gap-1 text-[13px] leading-tight font-semibold">
                        <Circle className="text-accent size-3 shrink-0" aria-hidden />
                        <span className="truncate">{t.title}</span>
                      </span>
                      {altura > 34 && (
                        <span className="text-ink-muted text-[11px] tabular-nums">
                          Tarefa · {formatarHora(b.inicioMin)}
                        </span>
                      )}
                    </li>
                  );
                }
                const e = b.item.evento;
                return (
                  <li key={`e-${e.id}`} className="absolute" style={posicao}>
                    <button
                      type="button"
                      onClick={() => setAberto(e)}
                      aria-label={`${e.titulo}, ${horario}`}
                      className="flex size-full cursor-pointer flex-col overflow-hidden rounded-md px-2 py-1 text-left"
                      style={estiloDoEvento(corDaAgenda.get(e.agendaId))}
                    >
                      <span className="truncate text-[13px] leading-tight font-semibold">
                        {e.titulo}
                      </span>
                      {altura > 34 && (
                        <span className="text-ink-muted text-[11px] tabular-nums">{horario}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <FolhaInferior
        aberta={aberto !== null}
        aoMudar={(v) => !v && setAberto(null)}
        titulo="Evento do Google Agenda"
      >
        {aberto && (
          <div className="flex flex-col gap-3 pb-2">
            <p className="text-heading-2">{aberto.titulo}</p>
            <p className="text-ink-muted">
              {aberto.diaInteiro ? "Dia todo" : descreverHorario(aberto, fuso)}
            </p>
            <p className="text-ink-muted text-body-sm flex items-center gap-2">
              <CalendarDays className="size-4" aria-hidden />
              {nomeDaAgenda.get(aberto.agendaId) ?? "Google Agenda"}
            </p>
            <p className="text-ink-muted text-body-sm flex items-center gap-2">
              <Lock className="size-4" aria-hidden />
              Somente leitura: edite no Google Agenda.
            </p>
          </div>
        )}
      </FolhaInferior>
    </main>
  );
}

/** Estilo Notion: fundo levemente tingido com a cor da agenda e uma barra à esquerda. */
function estiloDoEvento(cor: string | null | undefined): CSSProperties {
  const c = cor ?? "var(--accent)";
  return {
    background: `color-mix(in srgb, ${c} 16%, var(--card))`,
    boxShadow: `inset 3px 0 0 ${c}`,
    color: "var(--ink)",
  };
}

function descreverHorario(e: EventoDaAgenda, fuso: string): string {
  if (!e.inicio || !e.fim) return "";
  const ini = noFuso(e.inicio, fuso);
  const fim = noFuso(e.fim, fuso);
  const mesmoDia = ini.dia === fim.dia;
  return mesmoDia
    ? `${formatarHora(ini.minutos)} – ${formatarHora(fim.minutos)}`
    : `${formatarHora(ini.minutos)} – ${formatarHora(fim.minutos)} (dia seguinte)`;
}

/** Linha de estado (Notion-like, discreta) ou o convite para conectar. */
function StatusDaConexao({
  carregando,
  conexao,
  sincronizando,
  aoAtualizar,
}: {
  carregando: boolean;
  conexao: { status: string; ultimaSincronizacao: string | null; ultimoErro: string | null } | null;
  sincronizando: boolean;
  aoAtualizar: () => void;
}) {
  if (carregando) return null;
  if (!conexao) {
    return (
      <div className="cartao flex items-center gap-4 rounded-xl p-4">
        <span className="bg-brand-soft/60 grid size-10 shrink-0 place-items-center rounded-md">
          <CalendarDays className="text-accent size-5" aria-hidden />
        </span>
        <p className="text-body-sm min-w-0 flex-1">
          <span className="block font-semibold">Traga seus compromissos</span>
          <span className="text-ink-muted">
            Conecte o Google Agenda para ver aulas, plantões e eventos aqui (só leitura).
          </span>
        </p>
        <Link
          href="/personalizacao#google"
          className="botao-primario text-body-sm min-h-11 shrink-0 content-center px-4 font-semibold"
        >
          Conectar
        </Link>
      </div>
    );
  }
  if (conexao.status === "needs_reauth") {
    return (
      <p
        role="alert"
        className="cartao text-body-sm flex items-center justify-between gap-3 rounded-xl p-4"
      >
        <span>O acesso ao Google Agenda expirou.</span>
        <a
          href="/api/google/conectar"
          className="text-accent min-h-11 content-center font-semibold"
        >
          Reconectar
        </a>
      </p>
    );
  }
  return (
    <div className="text-ink-muted text-body-sm flex items-center justify-between gap-3">
      <span aria-live="polite" className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${conexao.ultimoErro ? "bg-warning" : "bg-success"}`}
        />
        {sincronizando
          ? "Sincronizando com o Google…"
          : conexao.ultimoErro
            ? "Não deu pra sincronizar agora."
            : `Google Agenda · sincronizada ${haQuantoTempo(conexao.ultimaSincronizacao, new Date())}`}
      </span>
      <button
        type="button"
        onClick={aoAtualizar}
        disabled={sincronizando}
        aria-label="Sincronizar agora"
        className="botao-vidro grid size-11 cursor-pointer place-items-center disabled:opacity-50"
      >
        <RefreshCw className={`size-4 ${sincronizando ? "animate-spin" : ""}`} aria-hidden />
      </button>
    </div>
  );
}
