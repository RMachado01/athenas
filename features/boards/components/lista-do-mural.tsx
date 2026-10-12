"use client";

import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { useTarefas } from "@/features/tasks/queries";
import { varDaCor } from "../cores";
import type { ItemDoMural, LigacaoDoMural } from "../queries";

const TIPO: Record<ItemDoMural["tipo"], string> = {
  nota: "Post-it",
  tarefa: "Tarefa",
  titulo: "Título",
  grupo: "Grupo",
};

/**
 * Visão em LISTA do mural (acessibilidade: teclado e leitor de tela). Itens agrupados pelo
 * grupo em que estão, com as ligações de cada um, e botões de editar/apagar.
 */
export function ListaDoMural({
  itens,
  ligacoes,
  aoEditar,
  aoApagar,
}: {
  itens: readonly ItemDoMural[];
  ligacoes: readonly LigacaoDoMural[];
  aoEditar: (id: string) => void;
  aoApagar: (id: string) => void;
}) {
  const { data: tarefas = [] } = useTarefas();
  const nome = (i: ItemDoMural) =>
    i.tipo === "tarefa"
      ? (tarefas.find((t) => t.id === i.tarefaId)?.title ?? "Tarefa removida")
      : i.texto || `(${TIPO[i.tipo].toLowerCase()} vazio)`;
  const porId = new Map(itens.map((i) => [i.id, i]));
  const grupos = itens.filter((i) => i.tipo === "grupo");
  const soltos = itens.filter((i) => i.tipo !== "grupo" && !i.grupoId);

  const linha = (i: ItemDoMural) => {
    const saidas = ligacoes.filter((l) => l.de === i.id).map((l) => porId.get(l.para));
    return (
      <li key={i.id} className="cartao flex items-center gap-3 rounded-lg p-3">
        <span
          aria-hidden="true"
          className="h-8 w-1.5 shrink-0 rounded-full"
          style={{ background: varDaCor(i.cor) }}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-ink-muted text-body-sm">{TIPO[i.tipo]}</span>
          <span className="truncate font-semibold">{nome(i)}</span>
          {saidas.length > 0 && (
            <span className="text-ink-muted text-body-sm flex items-center gap-1 truncate">
              <ArrowRight className="size-3.5 shrink-0" aria-label="liga para" />
              {saidas.map((s) => (s ? nome(s) : "?")).join(", ")}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => aoEditar(i.id)}
          aria-label={`Editar ${nome(i)}`}
          className="botao-vidro grid size-11 shrink-0 cursor-pointer place-items-center"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => aoApagar(i.id)}
          aria-label={`Apagar ${nome(i)}`}
          className="botao-vidro text-danger grid size-11 shrink-0 cursor-pointer place-items-center"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </li>
    );
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      {itens.length === 0 ? (
        <p className="cartao text-ink-muted mt-2 rounded-xl p-5">
          Mural vazio. Use a barra abaixo para adicionar um post-it, título, grupo ou tarefa.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <section key={g.id} aria-label={`Grupo ${nome(g)}`} className="flex flex-col gap-2">
              <ul role="list" className="flex flex-col gap-2">
                {linha(g)}
              </ul>
              <ul
                role="list"
                className="ml-4 flex flex-col gap-2 border-l border-[var(--glass-border)] pl-3"
              >
                {itens.filter((i) => i.grupoId === g.id).map((i) => linha(i))}
              </ul>
            </section>
          ))}
          {soltos.length > 0 && (
            <section aria-label="Itens soltos" className="flex flex-col gap-2">
              <h2 className="text-ink-muted text-label uppercase">Soltos</h2>
              <ul role="list" className="flex flex-col gap-2">
                {soltos.map((i) => linha(i))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
