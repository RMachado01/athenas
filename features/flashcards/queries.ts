"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { ehCorDoMural, type CorDoMural } from "@/features/boards/cores";
import type { EstadoDoCartao } from "./agendador";

export interface Baralho {
  id: string;
  nome: string;
  cor: CorDoMural;
  trilhaId: string | null;
  padrao: boolean;
  total: number;
  novos: number;
  paraHoje: number;
  atrasados: number;
}

export interface Cartao {
  id: string;
  frente: string;
  verso: string;
  baralhoId: string;
  notaId: string | null;
  suspenso: boolean;
  estado: EstadoDoCartao;
}

export const COLUNAS_DO_ESTADO =
  "state, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review";

type LinhaDeEstado = {
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: string | null;
};

export function lerEstado(l: LinhaDeEstado): EstadoDoCartao {
  return {
    state: Math.min(3, Math.max(0, l.state)) as EstadoDoCartao["state"],
    due: l.due,
    stability: l.stability,
    difficulty: l.difficulty,
    elapsed_days: l.elapsed_days,
    scheduled_days: l.scheduled_days,
    learning_steps: l.learning_steps,
    reps: l.reps,
    lapses: l.lapses,
    last_review: l.last_review,
  };
}

/** Erro de nome repetido de baralho (índice único decks_nome_unico_idx). */
export function ehNomeRepetido(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string } | null;
  return e?.code === "23505" || /decks_nome_unico_idx/.test(e?.message ?? "");
}

/** Baralhos ativos com as contagens (view v_decks). "Geral" por último. */
export function useBaralhos() {
  return useQuery({
    queryKey: chaves.baralhos,
    queryFn: async (): Promise<Baralho[]> => {
      const { data, error } = await criarClienteNavegador()
        .from("v_decks")
        .select("id, name, color, track_id, is_default, total, novos, para_hoje, atrasados")
        .order("name");
      if (error) throw error;
      return data
        .flatMap((d) =>
          d.id
            ? [
                {
                  id: d.id,
                  nome: d.name ?? "",
                  cor: ehCorDoMural(d.color) ? d.color : "azul",
                  trilhaId: d.track_id,
                  padrao: !!d.is_default,
                  total: d.total ?? 0,
                  novos: d.novos ?? 0,
                  paraHoje: d.para_hoje ?? 0,
                  atrasados: d.atrasados ?? 0,
                } satisfies Baralho,
              ]
            : [],
        )
        .sort((a, b) => Number(a.padrao) - Number(b.padrao));
    },
  });
}

/** Cartões de um baralho (inclui suspensos; sem os arquivados), mais novos primeiro. */
export function useCartoesDoBaralho(baralhoId: string) {
  return useQuery({
    queryKey: chaves.cartoes(baralhoId),
    queryFn: async (): Promise<Cartao[]> => {
      const { data, error } = await criarClienteNavegador()
        .from("cards")
        .select(`id, front, back, deck_id, note_id, suspended, ${COLUNAS_DO_ESTADO}`)
        .eq("deck_id", baralhoId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((c) => ({
        id: c.id,
        frente: c.front,
        verso: c.back,
        baralhoId: c.deck_id,
        notaId: c.note_id,
        suspenso: c.suspended,
        estado: lerEstado(c),
      }));
    },
  });
}

export function useCriarBaralho() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  return useMutation({
    mutationFn: async (b: {
      id: string;
      nome: string;
      cor: CorDoMural;
      trilhaId: string | null;
    }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador().from("decks").insert({
        id: b.id,
        user_id: perfil.id,
        name: b.nome.trim(),
        color: b.cor,
        track_id: b.trilhaId,
      });
      if (error) throw error;
    },
    onError: (erro) =>
      toast.error(
        ehNomeRepetido(erro)
          ? "Já existe um baralho com esse nome."
          : "Não deu pra criar o baralho. Tente de novo.",
        { id: "baralho" },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

export function useEditarBaralho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (b: {
      id: string;
      nome: string;
      cor: CorDoMural;
      trilhaId: string | null;
    }) => {
      const { error } = await criarClienteNavegador()
        .from("decks")
        .update({ name: b.nome.trim(), color: b.cor, track_id: b.trilhaId })
        .eq("id", b.id);
      if (error) throw error;
    },
    onError: (erro) =>
      toast.error(
        ehNomeRepetido(erro)
          ? "Já existe um baralho com esse nome."
          : "Não deu pra salvar o baralho.",
        { id: "baralho" },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

/** Arquiva o baralho (os cartões saem da revisão; nada é apagado). Com "Desfazer". */
export function useArquivarBaralho() {
  const queryClient = useQueryClient();
  const mudar = async (id: string, arquivar: boolean) => {
    const { error } = await criarClienteNavegador()
      .from("decks")
      .update({ archived_at: arquivar ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      toast.error(
        ehNomeRepetido(error)
          ? "Já existe outro baralho com esse nome; renomeie antes de restaurar."
          : "Não deu pra salvar. Tente de novo.",
        { id: "baralho" },
      );
    }
    await queryClient.invalidateQueries({ queryKey: chaves.flashcards });
  };
  return (b: { id: string; nome: string }, aoArquivar?: () => void) => {
    const arquivando = mudar(b.id, true);
    aoArquivar?.();
    toast(`Baralho “${b.nome}” arquivado.`, {
      id: `arquivar-baralho-${b.id}`,
      action: { label: "Desfazer", onClick: () => void arquivando.then(() => mudar(b.id, false)) },
    });
  };
}

/** Cria ou edita um cartão feito à mão (cartões de notas são editados na nota). */
export function useSalvarCartao() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  return useMutation({
    mutationFn: async (c: {
      id: string;
      novo: boolean;
      frente: string;
      verso: string;
      baralhoId: string;
    }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const supabase = criarClienteNavegador();
      const dados = { front: c.frente.trim(), back: c.verso.trim(), deck_id: c.baralhoId };
      const { error } = c.novo
        ? await supabase.from("cards").insert({ id: c.id, user_id: perfil.id, ...dados })
        : await supabase.from("cards").update(dados).eq("id", c.id);
      if (error) throw error;
    },
    onError: (erro) =>
      toast.error(
        /5\.000 cartões/.test((erro as { message?: string }).message ?? "")
          ? "Você chegou ao limite de 5.000 cartões."
          : "Não deu pra salvar o cartão. Tente de novo.",
        { id: "cartao" },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

export function useSuspenderCartao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, suspenso }: { id: string; suspenso: boolean }) => {
      const { error } = await criarClienteNavegador()
        .from("cards")
        .update({ suspended: suspenso })
        .eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("Não deu pra salvar. Tente de novo.", { id: "cartao" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

/** Arquiva um cartão feito à mão. Com "Desfazer". */
export function useArquivarCartao() {
  const queryClient = useQueryClient();
  const mudar = async (id: string, arquivar: boolean) => {
    const { error } = await criarClienteNavegador()
      .from("cards")
      .update({ archived_at: arquivar ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) toast.error("Não deu pra salvar. Tente de novo.", { id: "cartao" });
    await queryClient.invalidateQueries({ queryKey: chaves.flashcards });
  };
  return (id: string) => {
    const arquivando = mudar(id, true);
    toast("Cartão arquivado.", {
      id: `arquivar-cartao-${id}`,
      action: { label: "Desfazer", onClick: () => void arquivando.then(() => mudar(id, false)) },
    });
  };
}
