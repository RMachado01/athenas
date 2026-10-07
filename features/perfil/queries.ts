"use client";

import { useQuery } from "@tanstack/react-query";
import { chaves } from "@/lib/chaves-de-consulta";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { hojeNoFuso } from "@/lib/datas";

export interface Perfil {
  id: string;
  display_name: string;
  timezone: string;
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
        .select("id, display_name, timezone")
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** "AAAA-MM-DD" de hoje no fuso da pessoa (São Paulo enquanto o perfil não carrega). */
export function useHoje(): string {
  const { data } = usePerfil();
  return hojeNoFuso(data?.timezone ?? "America/Sao_Paulo");
}
