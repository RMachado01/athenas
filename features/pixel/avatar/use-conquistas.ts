"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useDiasDeFoco, useSequencia } from "@/features/focus/queries";
import { useTarefas } from "@/features/tasks/queries";
import { chaves } from "@/lib/chaves-de-consulta";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { useSalvarAvatar } from "../queries";
import { ITENS } from "./itens";
import { novasConquistas, type AvatarSalvo, type EstatisticasDeEstudo } from "./modelo";

/** Quantas revisões de flashcard já foram feitas (só a contagem, sem trazer as linhas). */
function useRevisoesFeitas() {
  return useQuery({
    queryKey: chaves.revisoesFeitas,
    queryFn: async (): Promise<number> => {
      const { count, error } = await criarClienteNavegador()
        .from("card_reviews")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/**
 * Os números de estudo que liberam itens do avatar. `pronto` = tudo chegou (uma consulta que
 * falhou conta como zero: o item só não libera agora, e tenta de novo na próxima visita).
 */
export function useEstatisticasDoAvatar(): { estatisticas: EstatisticasDeEstudo; pronto: boolean } {
  const dias = useDiasDeFoco();
  const sequencia = useSequencia();
  const tarefas = useTarefas();
  const revisoes = useRevisoesFeitas();
  const chegou = (q: { data?: unknown; isError: boolean }) => q.data !== undefined || q.isError;

  const estatisticas = useMemo<EstatisticasDeEstudo>(
    () => ({
      minutosDeFoco: (dias.data ?? []).reduce((soma, d) => soma + d.minutos, 0),
      melhorSequencia: sequencia.data?.melhor ?? 0,
      tarefasConcluidas: (tarefas.data ?? []).filter((t) => t.status === "done").length,
      cartoesRevisados: revisoes.data ?? 0,
    }),
    [dias.data, sequencia.data, tarefas.data, revisoes.data],
  );
  return {
    estatisticas,
    pronto: chegou(dias) && chegou(sequencia) && chegou(tarefas) && chegou(revisoes),
  };
}

/**
 * Libera os itens de conquista que a pessoa acabou de ganhar: grava na lista `desbloqueados`
 * (para sempre) e avisa ("Novo item para o avatar: …"). Roda quando o avatar e os números
 * estão prontos; a trava evita gravar duas vezes (o React roda efeitos 2x em desenvolvimento).
 */
export function useConquistasDoAvatar(avatar: AvatarSalvo | undefined) {
  const { estatisticas, pronto } = useEstatisticasDoAvatar();
  const salvar = useSalvarAvatar();
  const jaGravadas = useRef(new Set<string>());

  useEffect(() => {
    if (!avatar || !pronto) return;
    const novas = novasConquistas(avatar, estatisticas).filter((id) => !jaGravadas.current.has(id));
    if (novas.length === 0) return;
    novas.forEach((id) => jaGravadas.current.add(id));
    salvar.mutate({ ...avatar, desbloqueados: [...avatar.desbloqueados, ...novas] });
    for (const id of novas) {
      const nome = ITENS.find((i) => i.id === id)?.nome ?? id;
      toast.success(`Novo item para o avatar: ${nome}!`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `salvar` muda a cada render; o mutate é estável
  }, [avatar, pronto, estatisticas]);

  return estatisticas;
}
