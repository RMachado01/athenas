"use client";

import { useReducedMotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { BarrasDePrioridade } from "@/components/ui/barras-de-prioridade";
import { BotaoCheck } from "@/components/ui/botao-check";
import { Chip } from "@/components/ui/chip";
import { formatarDuracao } from "@/lib/duracao";
import { DURACAO, EASE_IN, EASE_OUT, atrasoDeCascata } from "@/lib/movimento";
import { formatarPrazo } from "../datas";
import type { Tarefa } from "../tipos";

interface Props {
  tarefa: Tarefa;
  /** Nome da trilha (chip). Nulo = sem trilha. */
  nomeDaTrilha: string | null;
  hoje: string;
  subtarefas: { total: number; feitas: number };
  selecionada: boolean;
  indice: number;
  aoSelecionar: () => void;
  aoAlternar: () => void;
}

/**
 * Linha de tarefa (design: TaskItem). Entra com fade + 8px de subida em cascata (40 ms),
 * sai com ease-in e reposiciona os vizinhos com `layout` (só transform/opacity).
 * Estados: padrão · hover · selecionada (borda dourada) · concluída (60% e riscada) · atrasada (prazo em vermelho).
 */
export function TarefaItem({
  tarefa,
  nomeDaTrilha,
  hoje,
  subtarefas,
  selecionada,
  indice,
  aoSelecionar,
  aoAlternar,
}: Props) {
  const concluida = tarefa.status === "done";
  const atrasada = tarefa.grupo === "atrasada";
  const prazo = formatarPrazo(tarefa.due_on, tarefa.due_time, hoje);
  // Com "reduzir movimento", a linha aparece direto (sem fade de entrada).
  const reduzido = useReducedMotionConfig();

  return (
    <m.li
      layout="position"
      initial={reduzido ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: concluida ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: DURACAO.base, ease: EASE_IN } }}
      transition={{ duration: DURACAO.base, ease: EASE_OUT, delay: atrasoDeCascata(indice) }}
      className={`cartao flex items-center rounded-lg pr-4 transition-[border-color,background-color] duration-(--duration-fast) ${
        selecionada
          ? "border-accent! shadow-[0_0_0_1px_var(--accent),0_12px_30px_-14px_color-mix(in_srgb,var(--accent)_50%,transparent)]"
          : "hover:border-glass-border!"
      }`}
    >
      <BotaoCheck
        marcado={concluida}
        rotulo={`${concluida ? "Reabrir" : "Concluir"} tarefa: ${tarefa.title}`}
        onAlternar={aoAlternar}
      />

      <button
        type="button"
        onClick={aoSelecionar}
        aria-current={selecionada ? "true" : undefined}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col gap-1 py-3 text-left"
      >
        <span className={`font-semibold ${concluida ? "text-ink-muted line-through" : ""}`}>
          {tarefa.title}
        </span>
        <span className="text-body-sm flex flex-wrap items-center gap-2">
          {nomeDaTrilha && <Chip>{nomeDaTrilha}</Chip>}
          {prazo && <span className={atrasada ? "text-danger" : "text-ink-muted"}>{prazo}</span>}
          {tarefa.estimate_min && (
            <span className="text-numeric text-ink-muted tabular-nums">
              {formatarDuracao(tarefa.estimate_min)}
            </span>
          )}
          {subtarefas.total > 0 && (
            <span className="text-numeric text-ink-muted tabular-nums">
              {subtarefas.feitas}/{subtarefas.total}
            </span>
          )}
        </span>
      </button>

      <BarrasDePrioridade prioridade={tarefa.priority} />
    </m.li>
  );
}
