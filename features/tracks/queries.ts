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

/** Letras do círculo da trilha: iniciais das 2 primeiras palavras (ou as 2 primeiras letras). */
export function monogramaDe(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  const letras =
    palavras.length >= 2 ? palavras[0]![0]! + palavras[1]![0]! : (palavras[0] ?? "?").slice(0, 2);
  return letras.toUpperCase();
}

/** Cria uma trilha (já com cor). Usa o id gerado na tela, então reenviar nunca duplica. */
export function useCriarTrilha() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation({
    mutationFn: async (nova: {
      id: string;
      name: string;
      color: CorDoMural;
      sort_order: number;
    }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador()
        .from("tracks")
        .insert({
          id: nova.id,
          user_id: perfil.id,
          name: nova.name,
          monogram: monogramaDe(nova.name),
          color: nova.color,
          sort_order: nova.sort_order,
        });
      if (error) throw error;
    },
    onError: () => toast.error("Não deu pra criar a trilha. Tentar de novo?"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.trilhas }),
  });
}

/** Renomeia e/ou troca a cor de uma trilha, com atualização otimista. */
export function useEditarTrilha() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: string; name?: string; color?: CorDoMural },
    { anterior: Trilha[] | undefined }
  >({
    mutationFn: async ({ id, name, color }) => {
      const campos = {
        ...(name !== undefined && { name, monogram: monogramaDe(name) }),
        ...(color !== undefined && { color }),
      };
      const { error } = await criarClienteNavegador().from("tracks").update(campos).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, name, color }) => {
      await queryClient.cancelQueries({ queryKey: chaves.trilhas });
      const anterior = queryClient.getQueryData<Trilha[]>(chaves.trilhas);
      queryClient.setQueryData<Trilha[]>(chaves.trilhas, (atual) =>
        (atual ?? []).map((t) =>
          t.id !== id
            ? t
            : {
                ...t,
                ...(name !== undefined && { name, monogram: monogramaDe(name) }),
                ...(color !== undefined && { color }),
              },
        ),
      );
      return { anterior };
    },
    onError: (_e, _v, contexto) => {
      queryClient.setQueryData(chaves.trilhas, contexto?.anterior);
      toast.error("Não deu pra salvar a trilha. Ela voltou ao que era.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.trilhas }),
  });
}
