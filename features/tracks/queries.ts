"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { usePerfil } from "@/lib/perfil";
import { CORES_DO_MURAL, ehCorDoMural, type CorDoMural } from "@/features/boards/cores";
import type { PacoteDeTrilhas } from "./pacotes";

/** Trilha com o progresso (concluídas ÷ total) vindo da view v_track_progress. */
export interface Trilha {
  id: string;
  name: string;
  monogram: string;
  color: CorDoMural;
  sort_order: number;
  total: number;
  concluidas: number;
  percentual: number;
}

export function useTrilhas() {
  return useQuery({
    queryKey: chaves.trilhas,
    queryFn: async (): Promise<Trilha[]> => {
      const supabase = criarClienteNavegador();
      const [trilhas, progresso] = await Promise.all([
        supabase
          .from("tracks")
          .select("id, name, monogram, color, sort_order")
          .is("archived_at", null)
          .order("sort_order")
          .order("name"),
        supabase.from("v_track_progress").select("track_id, total, concluidas, percentual"),
      ]);
      if (trilhas.error) throw trilhas.error;
      if (progresso.error) throw progresso.error;

      const porTrilha = new Map(progresso.data.map((p) => [p.track_id, p]));
      return trilhas.data.map((t) => {
        const p = porTrilha.get(t.id);
        return {
          ...t,
          color: ehCorDoMural(t.color) ? t.color : "azul",
          total: p?.total ?? 0,
          concluidas: p?.concluidas ?? 0,
          percentual: p?.percentual ?? 0,
        };
      });
    },
  });
}

/** Cria as trilhas de um pacote do onboarding (todas de uma vez, na ordem do pacote). */
export function useCriarPacoteDeTrilhas() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation({
    mutationFn: async (pacote: PacoteDeTrilhas) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      if (pacote.trilhas.length === 0) return;
      const supabase = criarClienteNavegador();
      const { error } = await supabase.from("tracks").insert(
        pacote.trilhas.map((t, i) => ({
          user_id: perfil.id,
          name: t.nome,
          monogram: t.monograma,
          // Cada trilha do pacote nasce com uma cor diferente (a paleta dá a volta depois de 8).
          color: CORES_DO_MURAL[i % CORES_DO_MURAL.length]!.id,
          sort_order: i,
        })),
      );
      if (error) throw error;
    },
    onSuccess: (_dados, pacote) => {
      if (pacote.trilhas.length > 0) toast.success(`Trilhas de ${pacote.nome} criadas.`);
    },
    onError: () => {
      toast.error("Não deu pra criar as trilhas. Tentar de novo?");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.trilhas }),
  });
}
