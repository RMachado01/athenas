"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { Meta, MetaValidada, PeriodoDeMeta, TipoDeMeta } from "./regras";
import { DURACAO_COM_ACAO } from "@/lib/avisos";

/** Metas ativas com o progresso do período atual (view v_goal_progress, calculada pelo banco). */
export function useMetas() {
  return useQuery({
    queryKey: chaves.metas,
    queryFn: async (): Promise<Meta[]> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase
        .from("v_goal_progress")
        .select("id, title, kind, period, target, track_id, atual, percentual")
        .order("created_at");
      if (error) throw error;
      return data.flatMap((l) =>
        l.id === null
          ? []
          : [
              {
                id: l.id,
                titulo: l.title ?? "",
                tipo: (l.kind === "tarefas" ? "tarefas" : "minutos") as TipoDeMeta,
                periodo: (l.period === "mes" ? "mes" : "semana") as PeriodoDeMeta,
                alvo: l.target ?? 1,
                trilhaId: l.track_id,
                atual: l.atual ?? 0,
                percentual: l.percentual ?? 0,
              },
            ],
      );
    },
  });
}

/** Cria uma meta. Otimista: ela aparece na hora (com progresso 0) e o banco completa depois. */
export function useCriarMeta() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();

  return useMutation({
    mutationFn: async (m: MetaValidada & { id: string }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const supabase = criarClienteNavegador();
      const { error } = await supabase.from("goals").insert({
        id: m.id,
        user_id: perfil.id,
        title: m.titulo,
        kind: m.tipo,
        period: m.periodo,
        target: m.alvo,
        track_id: m.trilhaId,
      });
      if (error) throw error;
    },
    onMutate: async (m) => {
      await queryClient.cancelQueries({ queryKey: chaves.metas });
      const anterior = queryClient.getQueryData<Meta[]>(chaves.metas);
      queryClient.setQueryData<Meta[]>(chaves.metas, [
        ...(anterior ?? []),
        { ...m, atual: 0, percentual: 0 },
      ]);
      return { anterior };
    },
    onError: (_e, _m, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(chaves.metas, ctx.anterior);
      toast.error("Não deu pra criar a meta. Tente de novo.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.metas }),
  });
}

/** Arquiva a meta (some da lista; o histórico fica no banco). Com "Desfazer". */
export function useArquivarMeta() {
  const queryClient = useQueryClient();

  const mudar = useMutation({
    mutationFn: async ({ id, arquivar }: { id: string; arquivar: boolean }) => {
      const supabase = criarClienteNavegador();
      const { error } = await supabase
        .from("goals")
        .update({ archived_at: arquivar ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, arquivar }) => {
      await queryClient.cancelQueries({ queryKey: chaves.metas });
      const anterior = queryClient.getQueryData<Meta[]>(chaves.metas);
      if (arquivar && anterior) {
        queryClient.setQueryData<Meta[]>(
          chaves.metas,
          anterior.filter((m) => m.id !== id),
        );
      }
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(chaves.metas, ctx.anterior);
      toast.error("Não deu pra salvar. Tente de novo.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.metas }),
  });

  return (meta: Meta) => {
    mudar.mutate({ id: meta.id, arquivar: true });
    toast(`Meta “${meta.titulo}” arquivada.`, {
      duration: DURACAO_COM_ACAO,
      action: { label: "Desfazer", onClick: () => mudar.mutate({ id: meta.id, arquivar: false }) },
    });
  };
}
