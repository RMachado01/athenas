"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chaves } from "@/lib/chaves-de-consulta";
import { hojeNoFuso } from "@/lib/datas";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

export interface Perfil {
  id: string;
  display_name: string;
  timezone: string;
  /** Preferências extras (JSON). Ex.: { trilhas_escolhidas: true }. */
  appearance: Record<string, unknown>;
  /** Meta diária de estudo e mínimo para o dia contar na sequência (minutos). */
  daily_goal_min: number;
  streak_min_min: number;
  /** Pomodoro (minutos) e quantos focos até a pausa longa. */
  pomodoro_focus_min: number;
  pomodoro_break_min: number;
  pomodoro_long_break_min: number;
  pomodoro_cycle_length: number;
}

function comoObjeto(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

/**
 * Perfil da própria pessoa (RLS: só enxerga a linha dela). Fornece o id para criar dados
 * (user_id) e o fuso horário para calcular o "hoje". Raramente muda: cache longo.
 */
export function usePerfil() {
  return useQuery({
    queryKey: chaves.perfil,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Perfil> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, timezone, appearance, daily_goal_min, streak_min_min, pomodoro_focus_min, pomodoro_break_min, pomodoro_long_break_min, pomodoro_cycle_length",
        )
        .single();
      if (error) throw error;
      return { ...data, appearance: comoObjeto(data.appearance) };
    },
  });
}

/** "AAAA-MM-DD" de hoje no fuso da pessoa (São Paulo enquanto o perfil não carrega). */
export function useHoje(): string {
  const { data } = usePerfil();
  return hojeNoFuso(data?.timezone ?? "America/Sao_Paulo");
}

/** Guarda no perfil que a pessoa já passou pela escolha de trilhas (não mostrar de novo). */
export function useMarcarTrilhasEscolhidas() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation({
    mutationFn: async () => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const supabase = criarClienteNavegador();
      const { error } = await supabase
        .from("profiles")
        .update({ appearance: { ...perfil.appearance, trilhas_escolhidas: true } })
        .eq("id", perfil.id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.perfil }),
  });
}
