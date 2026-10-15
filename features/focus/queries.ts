"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { DiaDeFoco } from "./resumos";

/** Minutos de foco por dia (view v_focus_days, já no fuso da pessoa). Dá para ~4 meses de mapa. */
export function useDiasDeFoco() {
  return useQuery({
    queryKey: chaves.diasDeFoco,
    queryFn: async (): Promise<DiaDeFoco[]> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase
        .from("v_focus_days")
        .select("dia, minutos, sessoes")
        .order("dia", { ascending: false })
        .limit(130);
      if (error) throw error;
      return data.flatMap((d) =>
        d.dia === null ? [] : [{ dia: d.dia, minutos: d.minutos ?? 0, sessoes: d.sessoes ?? 0 }],
      );
    },
  });
}

export interface Sequencia {
  atual: number;
  melhor: number;
}

/** Sequência atual e melhor (view v_streak: calculada pelo banco a partir das sessões). */
export function useSequencia() {
  return useQuery({
    queryKey: chaves.sequencia,
    queryFn: async (): Promise<Sequencia> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase.from("v_streak").select("atual, melhor").maybeSingle();
      if (error) throw error;
      return { atual: data?.atual ?? 0, melhor: data?.melhor ?? 0 };
    },
  });
}

export interface NovaSessao {
  inicio: Date;
  fim: Date;
  minutosPlanejados: number;
  taskId: string | null;
  trackId: string | null;
  /** De onde veio o tempo: cronômetro do Foco (padrão) ou sessão de flashcards. */
  origem?: "foco" | "revisao";
}

/** Grava uma sessão de foco concluída. O banco calcula a duração e a sequência. */
export function useRegistrarSessao() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation({
    mutationFn: async (s: NovaSessao) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const supabase = criarClienteNavegador();
      const { error } = await supabase.from("focus_sessions").insert({
        id: crypto.randomUUID(),
        user_id: perfil.id,
        kind: "focus",
        planned_min: Math.min(240, Math.max(1, s.minutosPlanejados)),
        started_at: s.inicio.toISOString(),
        ended_at: s.fim.toISOString(),
        task_id: s.taskId,
        track_id: s.trackId,
        origin: s.origem ?? "foco",
      });
      if (error) throw error;
    },
    onError: () => {
      toast.error("Não deu pra salvar essa sessão de foco. Confira a conexão.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.diasDeFoco });
      void queryClient.invalidateQueries({ queryKey: chaves.sequencia });
    },
  });
}
