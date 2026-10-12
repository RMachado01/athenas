"use client";

import { Circle } from "lucide-react";
import { useMemo, useState } from "react";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { useTarefas } from "@/features/tasks/queries";

/** Folha para escolher uma tarefa aberta e colocá-la no mural (as que já estão nele somem da lista). */
export function EscolherTarefa({
  aberta,
  aoMudar,
  jaNoMural,
  aoEscolher,
}: {
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
  jaNoMural: ReadonlySet<string>;
  aoEscolher: (tarefaId: string) => void;
}) {
  const { data: tarefas = [], isPending } = useTarefas();
  const [busca, setBusca] = useState("");
  const opcoes = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return tarefas.filter(
      (t) =>
        t.parent_id === null &&
        t.status !== "done" &&
        !jaNoMural.has(t.id) &&
        (!termo || t.title.toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [tarefas, jaNoMural, busca]);

  return (
    <FolhaInferior aberta={aberta} aoMudar={aoMudar} titulo="Adicionar tarefa ao mural">
      <div className="flex flex-col gap-3">
        <label className="sr-only" htmlFor="buscar-tarefa-mural">
          Buscar tarefa
        </label>
        <input
          id="buscar-tarefa-mural"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tarefa…"
          autoComplete="off"
          className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px] outline-none"
        />
        {isPending ? (
          <p className="text-ink-muted p-2">Carregando…</p>
        ) : opcoes.length === 0 ? (
          <p className="text-ink-muted p-2">
            {busca ? "Nenhuma tarefa encontrada." : "Todas as tarefas abertas já estão no mural."}
          </p>
        ) : (
          <ul role="list" className="flex max-h-[50dvh] flex-col overflow-y-auto">
            {opcoes.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => aoEscolher(t.id)}
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left hover:bg-[var(--card)]"
                >
                  <Circle className="text-accent size-4 shrink-0" aria-hidden />
                  <span className="truncate">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FolhaInferior>
  );
}
