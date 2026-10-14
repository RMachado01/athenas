"use client";

import {
  CheckCheck,
  FileText,
  Flame,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  Palette,
  Plus,
  Timer,
} from "lucide-react";
import * as m from "motion/react-m";
import { DropdownMenu } from "radix-ui";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnelDeProgresso } from "@/components/ui/anel-de-progresso";
import { BarraDeProgresso } from "@/components/ui/barra-de-progresso";
import { CartaoDeNumero } from "@/components/ui/cartao-de-numero";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { SeloDoDia } from "@/components/ui/selo-do-dia";
import { useEntrada } from "@/lib/usar-entrada";
import { useHoje, usePerfil } from "@/lib/perfil";
import { primeiroNome, saudacao } from "@/lib/saudacao";
import { AdicionarRapido } from "@/features/tasks/components/adicionar-rapido";
import { useDiasDeFoco, useSequencia } from "@/features/focus/queries";
import { CartaoDeMeta } from "@/features/goals/components/cartao-de-meta";
import { useMetas } from "@/features/goals/queries";
import { IconeDoMural } from "@/features/boards/components/icone-do-mural";
import { varDaCor } from "@/features/boards/cores";
import { useMurais } from "@/features/boards/queries";
import { RevisarHoje } from "@/features/flashcards/components/revisar-hoje";
import { ordenarMetas } from "@/features/goals/regras";
import { formatarMinutos, minutosDoDia } from "@/features/focus/resumos";
import { useTarefas } from "@/features/tasks/queries";
import {
  constanciaDaSemana,
  manchete,
  nomeLongoDoDia,
  resumoDeHoje,
  totaisDaSemana,
} from "@/features/tasks/resumos";
import { useTrilhas } from "@/features/tracks/queries";

/**
 * Início (MOBILE PRIMEIRO), seguindo as referências: barra do topo com avatar, frase grande com uma
 * palavra colorida, pílula de entrada, cartões de número, anel do dia, selos de constância da
 * semana e as trilhas com barra de progresso de ponta brilhante.
 *
 * Tudo vem de dados reais (tarefas e trilhas). A "constância" conta dias com ao menos uma tarefa
 * concluída; quando o modo Foco chegar, ela passa a contar minutos de estudo.
 */
export function InicioView({ sair }: { sair: () => Promise<void> }) {
  const { data: perfil } = usePerfil();
  const { data: tarefas, isPending } = useTarefas();
  const { data: trilhas = [] } = useTrilhas();
  const { data: diasDeFoco = [] } = useDiasDeFoco();
  const { data: sequencia } = useSequencia();
  const { data: metas = [] } = useMetas();
  const { data: murais = [] } = useMurais();
  const hoje = useHoje();
  const [novaAberta, setNovaAberta] = useState(false);
  const entrada = useEntrada();

  const fuso = perfil?.timezone ?? "America/Sao_Paulo";
  const lista = useMemo(() => tarefas ?? [], [tarefas]);
  const resumoHoje = useMemo(() => resumoDeHoje(lista, hoje, fuso), [lista, hoje, fuso]);
  const totais = useMemo(() => totaisDaSemana(lista, hoje, fuso), [lista, hoje, fuso]);
  const semana = useMemo(() => constanciaDaSemana(lista, hoje, fuso), [lista, hoje, fuso]);
  const diasCumpridos = semana.filter((d) => d.concluidas > 0).length;
  const frase = manchete(resumoHoje, totais.abertas);
  const atrasadas = lista.filter(
    (t) => t.parent_id === null && t.status !== "done" && t.grupo === "atrasada",
  ).length;

  const minutosHoje = minutosDoDia(diasDeFoco, hoje);
  const metaMin = perfil?.daily_goal_min ?? 120;
  const diasSeguidos = sequencia?.atual ?? 0;

  const nome = perfil ? primeiroNome(perfil.display_name) : "…";
  const trilhasEmDestaque = [...trilhas].sort((a, b) => b.total - a.total).slice(0, 4);

  return (
    <main className="flex flex-col gap-6 px-5 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      {/* Barra do topo */}
      <header className="flex items-center justify-between">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={`Conta de ${nome}`}
            className="cartao rounded-pill flex min-h-12 cursor-pointer items-center gap-3 py-1.5 pr-5 pl-1.5"
          >
            <span
              aria-hidden="true"
              className="bg-brand-soft grid size-9 place-items-center rounded-pill font-semibold"
            >
              {nome.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex flex-col text-left leading-tight">
              <span className="text-ink-muted text-body-sm">
                {perfil ? saudacao(new Date(), fuso) : "Olá"},
              </span>
              <span className="font-semibold">{nome}</span>
            </span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={8}
              className="menu-flutuante vidro-forte z-50 min-w-[200px] rounded-lg p-1.5"
            >
              <DropdownMenu.Item asChild>
                <Link
                  href="/notas"
                  className="data-[highlighted]:bg-card flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 font-semibold outline-none"
                >
                  <FileText className="size-[18px]" aria-hidden />
                  Notas
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/flashcards"
                  className="data-[highlighted]:bg-card flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 font-semibold outline-none"
                >
                  <Layers className="size-[18px]" aria-hidden />
                  Flashcards
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/murais"
                  className="data-[highlighted]:bg-card flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 font-semibold outline-none"
                >
                  <LayoutDashboard className="size-[18px]" aria-hidden />
                  Murais
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/personalizacao"
                  className="data-[highlighted]:bg-card flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 font-semibold outline-none"
                >
                  <Palette className="size-[18px]" aria-hidden />
                  Personalização
                </Link>
              </DropdownMenu.Item>
              <form action={sair}>
                <DropdownMenu.Item asChild>
                  <button
                    type="submit"
                    className="data-[highlighted]:bg-card flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left font-semibold outline-none"
                  >
                    <LogOut className="size-[18px]" aria-hidden />
                    Sair
                  </button>
                </DropdownMenu.Item>
              </form>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </header>

      {/* Frase grande, com a palavra-chave na cor do tema */}
      <section aria-labelledby="titulo-inicio" className="flex flex-col gap-4">
        <h1 id="titulo-inicio" className="font-display text-display-lg">
          {isPending ? (
            <span className="text-ink-muted">Carregando…</span>
          ) : (
            <>
              {frase.antes}
              <span className="text-accent">{frase.destaque}</span>
              {frase.depois}
            </>
          )}
        </h1>

        {/* Pílula de entrada (abre a folha de nova tarefa) */}
        <button
          type="button"
          onClick={() => setNovaAberta(true)}
          className="campo rounded-pill flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 pr-1.5 pl-5 text-left"
        >
          <span className="text-ink-muted truncate">Escreva uma tarefa…</span>
          <span
            aria-hidden="true"
            className="botao-primario grid size-11 shrink-0 place-items-center"
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </span>
          <span className="sr-only">Abrir nova tarefa</span>
        </button>

        {/* Atalhos que levam direto para a lista certa */}
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5">
          <Link
            href="/tarefas?aba=hoje"
            className="botao-vidro text-body-sm flex min-h-11 shrink-0 items-center px-4 font-semibold"
          >
            Hoje · {resumoHoje.pendentes}
          </Link>
          {atrasadas > 0 && (
            <Link
              href="/tarefas?aba=hoje"
              className="botao-vidro text-body-sm text-danger flex min-h-11 shrink-0 items-center px-4 font-semibold"
            >
              Atrasadas · {atrasadas}
            </Link>
          )}
          <Link
            href="/tarefas?aba=semana"
            className="botao-vidro text-body-sm flex min-h-11 shrink-0 items-center px-4 font-semibold"
          >
            Semana
          </Link>
          <Link
            href="/tarefas?aba=concluidas"
            className="botao-vidro text-body-sm flex min-h-11 shrink-0 items-center px-4 font-semibold"
          >
            Concluídas
          </Link>
        </div>
      </section>

      {/* Cartões de número */}
      {isPending ? (
        <div className="grid grid-cols-2 gap-3" aria-busy="true">
          <Esqueleto className="h-[132px]" />
          <Esqueleto className="h-[132px]" />
        </div>
      ) : (
        <section aria-label="Resumo" className="grid grid-cols-2 gap-3">
          <m.div {...entrada(0)}>
            <CartaoDeNumero
              Icone={ListChecks}
              rotulo="Abertas"
              valor={totais.abertas}
              unidade="tarefas"
            />
          </m.div>
          <m.div {...entrada(1)}>
            <CartaoDeNumero
              Icone={CheckCheck}
              rotulo="Concluídas"
              valor={totais.concluidasNaSemana}
              unidade="na semana"
            />
          </m.div>
        </section>
      )}

      {/* Foco: minutos reais de estudo e sequência; leva para o cronômetro */}
      <Link
        href="/foco"
        className="cartao tocavel flex flex-col gap-4 rounded-xl p-5"
        aria-label={`Foco: ${formatarMinutos(minutosHoje)} de ${formatarMinutos(metaMin)} hoje, sequência de ${diasSeguidos} ${diasSeguidos === 1 ? "dia" : "dias"}. Abrir cronômetro`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <span className="bg-brand-soft/60 grid size-9 place-items-center rounded-md">
              <Timer className="text-accent size-[18px]" aria-hidden />
            </span>
            <span className="text-heading-2">Foco</span>
          </span>
          <span className="bg-glass-border/60 rounded-pill flex items-center gap-1.5 px-3 py-1.5">
            <Flame className="text-accent size-4" aria-hidden />
            <span className="tabular-nums font-semibold">{diasSeguidos}</span>
          </span>
        </div>
        <p className="flex items-baseline gap-1.5">
          <span className="text-numeric-lg tabular-nums">{formatarMinutos(minutosHoje)}</span>
          <span className="text-ink-muted text-body-sm">de {formatarMinutos(metaMin)} hoje</span>
        </p>
        <BarraDeProgresso
          valor={Math.min(100, (100 * minutosHoje) / Math.max(1, metaMin))}
          rotulo="Meta diária de estudo"
        />
      </Link>

      {/* Flashcards: quantos cartões esperam revisão hoje */}
      <RevisarHoje />

      {/* Metas: as 3 mais perto de bater */}
      <section aria-labelledby="titulo-metas" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-metas" className="text-heading-2">
            Metas
          </h2>
          <Link
            href="/metas"
            className="text-accent text-body-sm min-h-11 content-center font-semibold"
          >
            {metas.length === 0 ? "Criar meta" : "Ver todas"}
          </Link>
        </div>
        {metas.length === 0 ? (
          <Link href="/metas" className="cartao tocavel text-ink-muted rounded-xl p-5">
            Defina uma meta semanal de horas de foco ou de tarefas. O progresso é contado sozinho.
          </Link>
        ) : (
          <ul role="list" className="flex flex-col gap-3">
            {ordenarMetas(metas)
              .slice(0, 3)
              .map((m) => (
                <li key={m.id}>
                  <CartaoDeMeta
                    meta={m}
                    nomeDaTrilha={
                      m.trilhaId ? (trilhas.find((t) => t.id === m.trilhaId)?.name ?? null) : null
                    }
                  />
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* Murais recentes (até 4) */}
      <section aria-labelledby="titulo-murais" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-murais" className="text-heading-2">
            Murais
          </h2>
          <Link
            href="/murais"
            className="text-accent text-body-sm min-h-11 content-center font-semibold"
          >
            {murais.length === 0 ? "Criar mural" : "Ver todos"}
          </Link>
        </div>
        {murais.length === 0 ? (
          <Link href="/murais" className="cartao tocavel text-ink-muted rounded-xl p-5">
            Monte um mural com post-its, tarefas e setas para organizar suas ideias.
          </Link>
        ) : (
          <ul role="list" className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {murais.slice(0, 4).map((m) => (
              <li key={m.id} className="shrink-0">
                <Link
                  href={`/murais/${m.id}`}
                  className="cartao tocavel flex w-40 flex-col gap-3 rounded-xl p-4"
                >
                  <span
                    className="grid size-9 place-items-center rounded-md"
                    style={{
                      background: `color-mix(in srgb, ${varDaCor(m.cor)} 30%, var(--surface))`,
                    }}
                  >
                    <IconeDoMural icone={m.icone} className="size-[18px]" />
                  </span>
                  <span className="truncate font-semibold">{m.titulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Anel de hoje */}
      <section
        aria-labelledby="titulo-hoje"
        className="cartao flex items-center gap-5 rounded-xl p-5"
      >
        <AnelDeProgresso
          valor={resumoHoje.percentual}
          rotulo="Tarefas concluídas hoje"
          tamanho={108}
        >
          <span className="text-heading-1 tabular-nums">{resumoHoje.percentual}%</span>
        </AnelDeProgresso>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="titulo-hoje" className="text-heading-2">
            Hoje
          </h2>
          <p className="text-ink-muted">
            <span className="text-ink tabular-nums">{resumoHoje.feitas}</span> de{" "}
            <span className="tabular-nums">{resumoHoje.total}</span>{" "}
            {resumoHoje.total === 1 ? "tarefa" : "tarefas"}
          </p>
          <p className="text-ink-muted text-body-sm">{nomeLongoDoDia(hoje)}</p>
        </div>
      </section>

      {/* Constância da semana (selos) */}
      <section
        aria-labelledby="titulo-constancia"
        className="cartao flex flex-col gap-4 rounded-xl p-5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="titulo-constancia" className="text-heading-2">
            Constância
          </h2>
          <p className="text-ink-muted text-body-sm tabular-nums">
            {diasCumpridos} {diasCumpridos === 1 ? "dia" : "dias"} nesta semana
          </p>
        </div>
        <ul role="list" className="grid grid-cols-7 gap-1">
          {semana.map((d) => (
            <SeloDoDia
              key={d.dia}
              rotulo={d.rotulo}
              cumprido={d.concluidas > 0}
              hoje={d.hoje}
              futuro={d.futuro}
              descricao={`${nomeLongoDoDia(d.dia)}: ${
                d.concluidas === 0
                  ? d.futuro
                    ? "ainda por vir"
                    : "nenhuma tarefa concluída"
                  : d.concluidas === 1
                    ? "1 tarefa concluída"
                    : `${d.concluidas} tarefas concluídas`
              }`}
            />
          ))}
        </ul>
      </section>

      {/* Trilhas com barra de ponta brilhante ("Continue Learning") */}
      <section aria-labelledby="titulo-trilhas" className="flex flex-col gap-3">
        <h2 id="titulo-trilhas" className="text-heading-2">
          Trilhas
        </h2>
        {trilhasEmDestaque.length === 0 ? (
          <Link href="/tarefas" className="cartao tocavel text-ink-muted rounded-xl p-5">
            Escolha suas trilhas na tela de Tarefas para acompanhar o progresso de cada assunto.
          </Link>
        ) : (
          <ul role="list" className="flex flex-col gap-3">
            {trilhasEmDestaque.map((t, i) => (
              <m.li
                key={t.id}
                {...entrada(i)}
                className="cartao flex flex-col gap-3 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-brand-soft grid size-11 shrink-0 place-items-center rounded-pill font-semibold"
                  >
                    {t.monogram}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{t.name}</span>
                    <span className="text-ink-muted text-body-sm tabular-nums">
                      {t.concluidas} de {t.total} {t.total === 1 ? "tarefa" : "tarefas"}
                    </span>
                  </div>
                  <span className="text-heading-3 tabular-nums">{t.percentual}%</span>
                </div>
                <BarraDeProgresso valor={t.percentual} rotulo={`Progresso da trilha ${t.name}`} />
              </m.li>
            ))}
          </ul>
        )}
      </section>

      <FolhaInferior aberta={novaAberta} aoMudar={setNovaAberta} titulo="Nova tarefa">
        <AdicionarRapido autoFoco aoEnviar={() => setNovaAberta(false)} />
      </FolhaInferior>
    </main>
  );
}
