"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { useHoje, usePerfil } from "@/lib/perfil";
import { calcularGrupo } from "./datas";
import type { Prioridade, StatusDeTarefa, Tarefa } from "./tipos";
import { DURACAO_COM_ACAO } from "@/lib/avisos";

/**
 * Mutações de tarefas com ATUALIZAÇÃO OTIMISTA (princípio de UX nº 2 do projeto):
 * a tela muda na hora; o banco confirma depois; se recusar, voltamos ao estado anterior
 * e avisamos com uma mensagem que diz o que fazer.
 */

export interface NovaTarefa {
  /** Gerado no cliente (UUID): a tela já conhece o id e o reenvio nunca duplica. */
  id: string;
  title: string;
  track_id?: string | null;
  parent_id?: string | null;
  due_on?: string | null;
  due_time?: string | null;
  priority?: Prioridade;
  estimate_min?: number | null;
  notes?: string;
}

export type CamposEditaveis = Partial<
  Pick<
    Tarefa,
    | "title"
    | "notes"
    | "priority"
    | "status"
    | "due_on"
    | "due_time"
    | "estimate_min"
    | "track_id"
    | "sort_order"
  >
>;

/** Regra do banco (check tasks_hora_exige_data): sem data, não pode haver hora. */
function normalizarCampos(campos: CamposEditaveis): CamposEditaveis {
  return campos.due_on === null ? { ...campos, due_time: null } : campos;
}

type Contexto = { anterior: Tarefa[] | undefined };

export function useCriarTarefa() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  const hoje = useHoje();

  return useMutation<void, Error, NovaTarefa, Contexto>({
    mutationFn: async (nova) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const supabase = criarClienteNavegador();
      const { error } = await supabase.from("tasks").insert({
        id: nova.id,
        user_id: perfil.id,
        title: nova.title,
        track_id: nova.track_id ?? null,
        parent_id: nova.parent_id ?? null,
        due_on: nova.due_on ?? null,
        due_time: nova.due_on ? (nova.due_time ?? null) : null,
        priority: nova.priority ?? 2,
        estimate_min: nova.estimate_min ?? null,
        notes: nova.notes ?? "",
      });
      if (error) throw error;
    },
    onMutate: async (nova) => {
      await queryClient.cancelQueries({ queryKey: chaves.tarefas });
      const anterior = queryClient.getQueryData<Tarefa[]>(chaves.tarefas);
      if (perfil) {
        const agora = new Date().toISOString();
        const otimista: Tarefa = {
          id: nova.id,
          user_id: perfil.id,
          track_id: nova.track_id ?? null,
          parent_id: nova.parent_id ?? null,
          title: nova.title,
          notes: nova.notes ?? "",
          priority: nova.priority ?? 2,
          status: "todo",
          due_on: nova.due_on ?? null,
          due_time: nova.due_on ? (nova.due_time ?? null) : null,
          estimate_min: nova.estimate_min ?? null,
          completed_at: null,
          sort_order: 0,
          created_at: agora,
          updated_at: agora,
          grupo: calcularGrupo({ status: "todo", due_on: nova.due_on ?? null }, hoje),
        };
        queryClient.setQueryData<Tarefa[]>(chaves.tarefas, (atual) => [...(atual ?? []), otimista]);
      }
      return { anterior };
    },
    onError: (_erro, _nova, contexto) => {
      queryClient.setQueryData(chaves.tarefas, contexto?.anterior);
      toast.error("Não deu pra salvar a tarefa. Tentar de novo?");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.tarefas });
      void queryClient.invalidateQueries({ queryKey: chaves.trilhas });
    },
  });
}

export function useAtualizarTarefa() {
  const queryClient = useQueryClient();
  const hoje = useHoje();

  return useMutation<void, Error, { id: string; campos: CamposEditaveis }, Contexto>({
    mutationFn: async ({ id, campos }) => {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.from("tasks").update(normalizarCampos(campos)).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, campos }) => {
      await queryClient.cancelQueries({ queryKey: chaves.tarefas });
      const anterior = queryClient.getQueryData<Tarefa[]>(chaves.tarefas);
      queryClient.setQueryData<Tarefa[]>(chaves.tarefas, (atual) =>
        (atual ?? []).map((t) => {
          if (t.id !== id) return t;
          const novo = { ...t, ...normalizarCampos(campos) } as Tarefa;
          // O banco mantém completed_at pelo status; aqui repetimos para a tela reagir na hora.
          if (campos.status !== undefined) {
            novo.completed_at =
              campos.status === "done" ? (t.completed_at ?? new Date().toISOString()) : null;
          }
          novo.grupo = calcularGrupo(novo, hoje);
          return novo;
        }),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      queryClient.setQueryData(chaves.tarefas, contexto?.anterior);
      toast.error("Não deu pra salvar a alteração. A tarefa voltou ao que era. Tentar de novo?");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.tarefas });
      void queryClient.invalidateQueries({ queryKey: chaves.trilhas });
    },
  });
}

/** Marca/desmarca como concluída, com aviso "Desfazer" por 6 segundos (design: TaskItem). */
export function useAlternarConclusao() {
  const atualizar = useAtualizarTarefa();

  return (tarefa: Pick<Tarefa, "id" | "status" | "title">) => {
    const anterior: StatusDeTarefa = tarefa.status;
    const novo: StatusDeTarefa = anterior === "done" ? "todo" : "done";
    atualizar.mutate({ id: tarefa.id, campos: { status: novo } });

    if (novo === "done") {
      toast("Tarefa concluída.", {
        description: tarefa.title,
        duration: DURACAO_COM_ACAO,
        action: {
          label: "Desfazer",
          onClick: () => atualizar.mutate({ id: tarefa.id, campos: { status: anterior } }),
        },
      });
    }
  };
}

export function useExcluirTarefa() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string }, Contexto>({
    mutationFn: async ({ id }) => {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: chaves.tarefas });
      const anterior = queryClient.getQueryData<Tarefa[]>(chaves.tarefas);
      // Apagar a tarefa-mãe apaga as subtarefas (cascata no banco): a tela faz o mesmo.
      queryClient.setQueryData<Tarefa[]>(chaves.tarefas, (atual) =>
        (atual ?? []).filter((t) => t.id !== id && t.parent_id !== id),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      queryClient.setQueryData(chaves.tarefas, contexto?.anterior);
      toast.error("Não deu pra excluir a tarefa. Tentar de novo?");
    },
    onSuccess: () => {
      toast("Tarefa excluída.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.tarefas });
      void queryClient.invalidateQueries({ queryKey: chaves.trilhas });
    },
  });
}
