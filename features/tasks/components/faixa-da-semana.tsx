"use client";

import { nomeCurtoDoDia, nomeLongoDoDia, numeroDoDia } from "../resumos";

/**
 * Faixa da semana (referência do perfil com "Mon 19 … Sun 25"): 7 colunas, cada uma com pontinhos
 * (tarefas abertas naquele dia), a abreviação e o número. Hoje tem um contorno da cor do tema;
 * o dia escolhido fica "aceso". Tocar de novo no dia escolhido desfaz o filtro.
 */
export function FaixaDaSemana({
  dias,
  pontos,
  hoje,
  selecionado,
  aoSelecionar,
  descreverPontos = (n) =>
    n === 0 ? "sem tarefas abertas" : n === 1 ? "1 tarefa aberta" : `${n} tarefas abertas`,
}: {
  dias: readonly string[];
  pontos: Record<string, number>;
  hoje: string;
  selecionado: string | null;
  aoSelecionar: (dia: string | null) => void;
  /** Texto dos pontinhos para leitor de tela (Tarefas: "2 tarefas abertas"; Agenda: "2 itens"). */
  descreverPontos?: (n: number) => string;
}) {
  return (
    <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1.5">
      {dias.map((dia) => {
        const n = pontos[dia] ?? 0;
        const escolhido = selecionado === dia;
        const ehHoje = dia === hoje;
        return (
          <button
            key={dia}
            type="button"
            aria-pressed={escolhido}
            aria-label={`${nomeLongoDoDia(dia)}, dia ${numeroDoDia(dia)}: ${descreverPontos(n)}`}
            onClick={() => aoSelecionar(escolhido ? null : dia)}
            className={`cartao flex min-h-[78px] cursor-pointer flex-col items-center justify-between rounded-[18px] px-1 py-2.5 transition-[border-color,background-color,transform] duration-(--duration-fast) active:scale-95 ${
              escolhido ? "border-accent! bg-glass-strong" : ""
            } ${ehHoje && !escolhido ? "border-accent/60!" : ""}`}
          >
            <span aria-hidden="true" className="flex h-2 items-center gap-0.5">
              {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                <i key={i} className="bg-accent block size-1.5 rounded-pill" />
              ))}
            </span>
            <span
              aria-hidden="true"
              className={`text-body-sm font-medium ${escolhido || ehHoje ? "text-accent" : "text-ink-muted"}`}
            >
              {nomeCurtoDoDia(dia)}
            </span>
            <span aria-hidden="true" className="text-heading-3 tabular-nums">
              {numeroDoDia(dia)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
