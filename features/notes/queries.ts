"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import type { Json } from "@/lib/database.types";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { DOCUMENTO_VAZIO, type NoDoDocumento } from "./documento";

export interface ResumoDeNota {
  id: string;
  titulo: string;
  icone: string | null;
  texto: string;
  atualizadaEm: string;
}

export interface Nota extends ResumoDeNota {
  conteudo: NoDoDocumento;
  trilhaId: string | null;
}

export interface Backlink {
  id: string;
  titulo: string;
  icone: string | null;
  trecho: string;
}

function lerDocumento(v: unknown): NoDoDocumento {
  return typeof v === "object" && v !== null && (v as NoDoDocumento).type === "doc"
    ? (v as NoDoDocumento)
    : DOCUMENTO_VAZIO;
}

/** Todas as notas ativas (mais recentes primeiro), com o texto para a busca. */
export function useNotas() {
  return useQuery({
    queryKey: chaves.notas,
    queryFn: async (): Promise<ResumoDeNota[]> => {
      const { data, error } = await criarClienteNavegador()
        .from("notes")
        .select("id, title, icon, plain_text, updated_at")
        .is("archived_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data.map((n) => ({
        id: n.id,
        titulo: n.title,
        icone: n.icon,
        texto: n.plain_text,
        atualizadaEm: n.updated_at,
      }));
    },
  });
}

export function useNota(id: string) {
  return useQuery({
    queryKey: chaves.nota(id),
    queryFn: async (): Promise<Nota | null> => {
      const { data, error } = await criarClienteNavegador()
        .from("notes")
        .select("id, title, icon, plain_text, updated_at, content, track_id")
        .eq("id", id)
        .is("archived_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        titulo: data.title,
        icone: data.icon,
        texto: data.plain_text,
        atualizadaEm: data.updated_at,
        conteudo: lerDocumento(data.content),
        trilhaId: data.track_id,
      };
    },
  });
}

export function useBacklinks(id: string) {
  return useQuery({
    queryKey: chaves.backlinks(id),
    queryFn: async (): Promise<Backlink[]> => {
      const { data, error } = await criarClienteNavegador()
        .from("v_note_backlinks")
        .select("from_note, title, icon, trecho, updated_at")
        .eq("to_note", id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data.flatMap((b) =>
        b.from_note
          ? [{ id: b.from_note, titulo: b.title ?? "", icone: b.icon, trecho: b.trecho ?? "" }]
          : [],
      );
    },
  });
}

/** Erro do Postgres de "título repetido" (índice único notes_titulo_unico_idx). */
export function ehTituloRepetido(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string } | null;
  return e?.code === "23505" || /notes_titulo_unico_idx/.test(e?.message ?? "");
}

/** Cria uma nota (vazia ou com conteúdo inicial). Devolve a promessa para quem precisa esperar. */
export function useCriarNota() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  return useMutation({
    mutationFn: async (n: { id: string; titulo: string }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador()
        .from("notes")
        .insert({ id: n.id, user_id: perfil.id, title: n.titulo.trim() });
      if (error) throw error;
    },
    onMutate: async (n) => {
      await queryClient.cancelQueries({ queryKey: chaves.notas });
      const anterior = queryClient.getQueryData<ResumoDeNota[]>(chaves.notas);
      queryClient.setQueryData<ResumoDeNota[]>(chaves.notas, [
        {
          id: n.id,
          titulo: n.titulo.trim(),
          icone: null,
          texto: "",
          atualizadaEm: new Date().toISOString(),
        },
        ...(anterior ?? []),
      ]);
      return { anterior };
    },
    onError: (erro, _n, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(chaves.notas, ctx.anterior);
      toast.error(
        ehTituloRepetido(erro)
          ? "Já existe uma nota com esse título."
          : "Não deu pra criar a nota. Tente de novo.",
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.notas }),
  });
}

export interface NotaParaSalvar {
  id: string;
  titulo: string;
  conteudo: NoDoDocumento;
  texto: string;
  links: string[];
}

/**
 * Salva título + conteúdo + links numa chamada só (função salvar_nota no banco, atômica).
 * Atualiza o cache na hora; se falhar, avisa (o editor mantém o que a pessoa escreveu).
 */
export function useSalvarNota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (n: NotaParaSalvar) => {
      const { error } = await criarClienteNavegador().rpc("salvar_nota", {
        p_id: n.id,
        p_titulo: n.titulo,
        p_conteudo: n.conteudo as unknown as Json,
        p_texto: n.texto,
        p_links: n.links,
      });
      if (error) throw error;
    },
    onMutate: (n) => {
      queryClient.setQueryData<ResumoDeNota[]>(chaves.notas, (lista) =>
        lista?.map((x) => (x.id === n.id ? { ...x, titulo: n.titulo.trim(), texto: n.texto } : x)),
      );
    },
    onError: (erro) => {
      toast.error(
        ehTituloRepetido(erro)
          ? "Já existe uma nota com esse título. Escolha outro."
          : "Não deu pra salvar a nota. Suas mudanças continuam aqui; tente de novo.",
      );
    },
    onSuccess: (_d, n) => {
      // Quem esta nota cita passa a ter (ou perder) um backlink.
      for (const destino of n.links) {
        void queryClient.invalidateQueries({ queryKey: chaves.backlinks(destino) });
      }
    },
  });
}

/** Arquiva a nota (some da lista e dos backlinks; nada é apagado). Com "Desfazer". */
export function useArquivarNota() {
  const queryClient = useQueryClient();
  const mudar = useMutation({
    mutationFn: async ({ id, arquivar }: { id: string; arquivar: boolean }) => {
      const { error } = await criarClienteNavegador()
        .from("notes")
        .update({ archived_at: arquivar ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onError: (erro) =>
      toast.error(
        ehTituloRepetido(erro)
          ? "Já existe outra nota com esse título; renomeie antes de restaurar."
          : "Não deu pra salvar. Tente de novo.",
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.notas }),
  });
  return (n: { id: string; titulo: string }, aoArquivar?: () => void) => {
    const arquivando = mudar.mutateAsync({ id: n.id, arquivar: true });
    aoArquivar?.();
    toast(`Nota “${n.titulo}” arquivada.`, {
      action: {
        label: "Desfazer",
        // Espera o "arquivar" terminar: se os dois pedidos corressem juntos, o arquivar poderia
        // chegar depois e vencer.
        // Sem depender da tela da nota (que já saiu): fala com o banco e recarrega a lista
        // direto pelo queryClient.
        onClick: () =>
          void arquivando
            .catch(() => undefined)
            .then(async () => {
              const { error } = await criarClienteNavegador()
                .from("notes")
                .update({ archived_at: null })
                .eq("id", n.id);
              if (error) {
                toast.error(
                  ehTituloRepetido(error)
                    ? "Já existe outra nota com esse título; renomeie antes de restaurar."
                    : "Não deu pra desfazer. Tente de novo.",
                );
              }
              await queryClient.invalidateQueries({ queryKey: chaves.notas });
            }),
      },
    });
  };
}
