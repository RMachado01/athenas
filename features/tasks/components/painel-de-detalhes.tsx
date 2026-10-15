"use client";

import { useId, useRef, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertDialog } from "radix-ui";
import { BotaoCheck } from "@/components/ui/botao-check";
import { Chip } from "@/components/ui/chip";
import { Seletor } from "@/components/ui/seletor";
import { formatarDuracao } from "@/lib/duracao";
import type { Trilha } from "@/features/tracks/queries";
import { useAtualizarTarefa, useCriarTarefa, useExcluirTarefa } from "../mutations";
import type { Prioridade, Tarefa } from "../tipos";

interface Props {
  tarefa: Tarefa;
  trilhas: Trilha[];
  subtarefas: Tarefa[];
  /** Chamado depois de excluir (a tela fecha o painel). */
  aoExcluir: () => void;
}

const PRIORIDADES: { valor: Prioridade; rotulo: string }[] = [
  { valor: 1, rotulo: "Baixa" },
  { valor: 2, rotulo: "Média" },
  { valor: 3, rotulo: "Alta" },
];

// 16 px: abaixo disso o iPhone dá zoom ao tocar no campo (e a tela "pula").
const CAMPO = "campo min-h-11 w-full px-3.5 text-[16px]";

/**
 * Painel de detalhes da tarefa selecionada (design: aside da tela de Tarefas).
 * Campos de texto salvam ao SAIR do campo (blur); seletores e datas salvam na hora.
 * O componente é recriado por tarefa (key = id), então os campos começam sempre com os valores dela.
 */
export function PainelDeDetalhes({ tarefa, trilhas, subtarefas, aoExcluir }: Props) {
  const atualizar = useAtualizarTarefa();
  const criar = useCriarTarefa();
  const excluir = useExcluirTarefa();
  // No laboratório (/dev/…) o link também fica dentro do laboratório.
  const caminhoDoFoco = usePathname().startsWith("/dev") ? "/dev/foco" : "/foco";
  const idNotas = useId();
  const novaSub = useRef<HTMLInputElement>(null);

  const trilha = trilhas.find((t) => t.id === tarefa.track_id) ?? null;
  const concluida = tarefa.status === "done";
  const salvar = (campos: Parameters<typeof atualizar.mutate>[0]["campos"]) =>
    atualizar.mutate({ id: tarefa.id, campos });

  function adicionarSubtarefa(evento: FormEvent) {
    evento.preventDefault();
    const titulo = novaSub.current?.value.trim() ?? "";
    if (!titulo) return;
    criar.mutate({ id: crypto.randomUUID(), title: titulo, parent_id: tarefa.id });
    if (novaSub.current) novaSub.current.value = "";
  }

  const feitas = subtarefas.filter((s) => s.status === "done").length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        {trilha && <Chip className="self-start">{trilha.name}</Chip>}
        <label className="sr-only" htmlFor={`${idNotas}-titulo`}>
          Título da tarefa
        </label>
        <input
          id={`${idNotas}-titulo`}
          defaultValue={tarefa.title}
          maxLength={200}
          onBlur={(e) => {
            const novo = e.target.value.trim();
            if (!novo)
              e.target.value = tarefa.title; // título vazio não é permitido: volta ao que era
            else if (novo !== tarefa.title) salvar({ title: novo });
          }}
          className="font-display text-heading-1 w-full bg-transparent outline-none focus-visible:underline focus-visible:decoration-accent focus-visible:underline-offset-4"
        />
      </header>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
        <div className="col-span-2">
          <dt aria-hidden="true" className="text-label text-ink-muted uppercase">
            Trilha
          </dt>
          <dd className="mt-1">
            <Seletor
              rotulo="Trilha"
              rotuloVisivel={false}
              opcoes={[
                { valor: "", rotulo: "Sem trilha" },
                ...trilhas.map((t) => ({ valor: t.id, rotulo: t.name })),
              ]}
              valor={tarefa.track_id ?? ""}
              aoMudar={(v) => salvar({ track_id: v || null })}
            />
          </dd>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <dt>
            <label
              htmlFor={`${idNotas}-estimativa`}
              className="text-label text-ink-muted uppercase"
            >
              Estimativa (min)
            </label>
          </dt>
          <dd className="mt-1">
            <input
              id={`${idNotas}-estimativa`}
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              defaultValue={tarefa.estimate_min ?? ""}
              onBlur={(e) => {
                const n = e.target.value === "" ? null : Number(e.target.value);
                const valido = n === null || (Number.isInteger(n) && n >= 1 && n <= 1440);
                if (!valido) e.target.value = String(tarefa.estimate_min ?? "");
                else if (n !== tarefa.estimate_min) salvar({ estimate_min: n });
              }}
              className={`${CAMPO} tabular-nums`}
            />
            {tarefa.estimate_min ? (
              <span className="text-ink-muted text-body-sm mt-1 block">
                {formatarDuracao(tarefa.estimate_min)} ·{" "}
                {Math.max(1, Math.round(tarefa.estimate_min / 25))} pomodoros
              </span>
            ) : null}
          </dd>
        </div>

        <div>
          <dt>
            <label htmlFor={`${idNotas}-prazo`} className="text-label text-ink-muted uppercase">
              Prazo
            </label>
          </dt>
          <dd className="mt-1">
            <input
              id={`${idNotas}-prazo`}
              type="date"
              value={tarefa.due_on ?? ""}
              onChange={(e) => salvar({ due_on: e.target.value || null })}
              className={CAMPO}
            />
          </dd>
        </div>

        <div>
          <dt>
            <label htmlFor={`${idNotas}-hora`} className="text-label text-ink-muted uppercase">
              Hora
            </label>
          </dt>
          <dd className="mt-1">
            <input
              id={`${idNotas}-hora`}
              type="time"
              value={tarefa.due_time?.slice(0, 5) ?? ""}
              disabled={!tarefa.due_on}
              onChange={(e) => salvar({ due_time: e.target.value || null })}
              className={`${CAMPO} tabular-nums disabled:opacity-45`}
            />
          </dd>
        </div>
      </dl>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-label text-ink-muted uppercase">Prioridade</legend>
        <div role="radiogroup" aria-label="Prioridade" className="mt-1 flex gap-2">
          {PRIORIDADES.map((p) => {
            const marcada = tarefa.priority === p.valor;
            return (
              <button
                key={p.valor}
                type="button"
                role="radio"
                aria-checked={marcada}
                onClick={() => salvar({ priority: p.valor })}
                className={`min-h-11 flex-1 cursor-pointer rounded-pill font-semibold transition-colors duration-(--duration-instant) ${
                  marcada ? "bg-accent text-on-accent" : "botao-vidro text-ink-muted"
                }`}
              >
                {p.rotulo}
              </button>
            );
          })}
        </div>
      </fieldset>

      <section aria-labelledby={`${idNotas}-subs`} className="flex flex-col gap-2">
        <h3 id={`${idNotas}-subs`} className="text-label text-ink-muted uppercase">
          Subtarefas{subtarefas.length > 0 ? ` · ${feitas}/${subtarefas.length}` : ""}
        </h3>
        {subtarefas.length > 0 && (
          <ul role="list" className="flex flex-col">
            {subtarefas.map((s) => (
              <li key={s.id} className="flex items-center">
                <BotaoCheck
                  marcado={s.status === "done"}
                  rotulo={`${s.status === "done" ? "Reabrir" : "Concluir"} subtarefa: ${s.title}`}
                  onAlternar={() =>
                    atualizar.mutate({
                      id: s.id,
                      campos: { status: s.status === "done" ? "todo" : "done" },
                    })
                  }
                />
                <span className={s.status === "done" ? "text-ink-muted line-through" : ""}>
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={adicionarSubtarefa} className="flex gap-2">
          <label className="sr-only" htmlFor={`${idNotas}-nova-sub`}>
            Nova subtarefa
          </label>
          <input
            ref={novaSub}
            id={`${idNotas}-nova-sub`}
            placeholder="Nova subtarefa"
            maxLength={200}
            autoComplete="off"
            className={CAMPO}
          />
          <button type="submit" className="botao-vidro min-h-11 cursor-pointer px-5 font-semibold">
            Adicionar
          </button>
        </form>
      </section>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idNotas}-notas`} className="text-label text-ink-muted uppercase">
          Notas
        </label>
        <textarea
          id={`${idNotas}-notas`}
          rows={4}
          maxLength={5000}
          defaultValue={tarefa.notes}
          onBlur={(e) => {
            if (e.target.value !== tarefa.notes) salvar({ notes: e.target.value });
          }}
          className="campo px-3.5 py-3 text-[16px]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Leva ao Foco com esta tarefa já escolhida; o cronômetro só começa quando a pessoa toca em Iniciar. */}
        <Link
          href={`${caminhoDoFoco}?tarefa=${tarefa.id}`}
          className="botao-primario inline-flex min-h-11 items-center px-6 font-semibold"
        >
          Começar foco
        </Link>
        <button
          type="button"
          onClick={() => salvar({ status: concluida ? "todo" : "done" })}
          className="botao-vidro min-h-11 cursor-pointer px-5 font-semibold"
        >
          {concluida ? "Reabrir" : "Concluir"}
        </button>

        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button
              type="button"
              className="text-danger hover:bg-card ml-auto min-h-11 cursor-pointer rounded-pill px-5 font-semibold transition-colors duration-(--duration-instant)"
            >
              Excluir
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="bg-scrim fixed inset-0 z-40 backdrop-blur-sm" />
            <AlertDialog.Content className="vidro-forte fixed top-1/2 left-1/2 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl p-6">
              <AlertDialog.Title className="font-display text-heading-1">
                Excluir esta tarefa?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-ink-muted">
                “{tarefa.title}”
                {subtarefas.length > 0
                  ? ` e as ${subtarefas.length} subtarefas serão apagadas.`
                  : " será apagada."}{" "}
                Isso não dá para desfazer.
              </AlertDialog.Description>
              <div className="flex justify-end gap-3">
                {/* Foco inicial no Cancelar: a ação segura é a padrão. */}
                <AlertDialog.Cancel asChild>
                  <button
                    type="button"
                    className="botao-vidro min-h-11 cursor-pointer px-5 font-semibold"
                  >
                    Manter tarefa
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    type="button"
                    onClick={() => {
                      excluir.mutate({ id: tarefa.id });
                      aoExcluir();
                    }}
                    className="border-danger text-danger hover:bg-card min-h-11 cursor-pointer rounded-pill border px-5 font-semibold"
                  >
                    Excluir tarefa
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
}
