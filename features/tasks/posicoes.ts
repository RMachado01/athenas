"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { Ponto } from "./mural";

/** Posição de cada tarefa no Mural das Tarefas (task_positions), indexada pelo id da tarefa. */
export function usePosicoesDeTarefas() {
  return useQuery({
    queryKey: chaves.posicoesDeTarefas,
    queryFn: async (): Promise<Map<string, Ponto>> => {
      const { data, error } = await criarClienteNavegador()
        .from("task_positions")
        .select("task_id, x, y");
      if (error) throw error;
      return new Map(data.map((p) => [p.task_id, { x: p.x, y: p.y }]));
    },
  });
}

/**
 * Guarda a posição de um post-it (cria ou atualiza: upsert). Otimista: o post-it já fica onde
 * a pessoa soltou; se o banco recusar, volta ao lugar anterior e avisa.
 */
export function useSalvarPosicao() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation<
    void,
    Error,
    { taskId: string; x: number; y: number },
    { anterior: Map<string, Ponto> | undefined }
  >({
    mutationFn: async ({ taskId, x, y }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador()
        .from("task_positions")
        .upsert({ user_id: perfil.id, task_id: taskId, x, y }, { onConflict: "user_id,task_id" });
      if (error) throw error;
    },
    onMutate: async ({ taskId, x, y }) => {
      await queryClient.cancelQueries({ queryKey: chaves.posicoesDeTarefas });
      const anterior = queryClient.getQueryData<Map<string, Ponto>>(chaves.posicoesDeTarefas);
      queryClient.setQueryData<Map<string, Ponto>>(
        chaves.posicoesDeTarefas,
        new Map(anterior).set(taskId, { x, y }),
      );
      return { anterior };
    },
    onError: (_e, _v, contexto) => {
      queryClient.setQueryData(chaves.posicoesDeTarefas, contexto?.anterior);
      toast.error("Não deu pra guardar o lugar do post-it. Ele voltou ao que era.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.posicoesDeTarefas }),
  });
}
