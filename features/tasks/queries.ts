"use client";

import { useQuery } from "@tanstack/react-query";
import { chaves } from "@/lib/chaves-de-consulta";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { paraTarefa, type Tarefa } from "./tipos";

/** Todas as tarefas da pessoa (raízes e subtarefas), já com o grupo calculado pelo banco no fuso dela. */
export function useTarefas() {
  return useQuery({
    queryKey: chaves.tarefas,
    queryFn: async (): Promise<Tarefa[]> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase
        .from("v_tasks")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data.map(paraTarefa);
    },
  });
}
