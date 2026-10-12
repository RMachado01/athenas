"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { ehCorDoMural, ehIconeDoMural, type CorDoMural, type IconeDoMural } from "./cores";
import type { Camera, TipoDeItem } from "./geometria";

// ---------------------------------------------------------------------------
// Tipos do lado do app (nomes em português; o banco usa inglês)
// ---------------------------------------------------------------------------
export interface ResumoDeMural {
  id: string;
  titulo: string;
  cor: CorDoMural;
  icone: IconeDoMural;
  trilhaId: string | null;
  itens: number;
  atualizadoEm: string;
}

export interface Mural {
  id: string;
  titulo: string;
  cor: CorDoMural;
  icone: IconeDoMural;
  trilhaId: string | null;
  camera: Camera;
}

export interface ItemDoMural {
  id: string;
  tipo: TipoDeItem;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  cor: CorDoMural;
  texto: string;
  tarefaId: string | null;
  grupoId: string | null;
}

export interface LigacaoDoMural {
  id: string;
  de: string;
  para: string;
  rotulo: string;
}

export interface MuralCompleto {
  mural: Mural;
  itens: ItemDoMural[];
  ligacoes: LigacaoDoMural[];
}

const TIPOS: readonly TipoDeItem[] = ["nota", "tarefa", "titulo", "grupo"];

function lerCamera(v: unknown): Camera {
  const o = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  const n = (x: unknown, padrao: number) =>
    typeof x === "number" && Number.isFinite(x) ? x : padrao;
  return { x: n(o.x, 0), y: n(o.y, 0), zoom: Math.min(4, Math.max(0.1, n(o.zoom, 1))) };
}

function paraItem(l: {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  color: string;
  text: string;
  task_id: string | null;
  parent_id: string | null;
}): ItemDoMural {
  return {
    id: l.id,
    tipo: (TIPOS as readonly string[]).includes(l.kind) ? (l.kind as TipoDeItem) : "nota",
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
    z: l.z,
    cor: ehCorDoMural(l.color) ? l.color : "amarelo",
    texto: l.text,
    tarefaId: l.task_id,
    grupoId: l.parent_id,
  };
}

/** Converte uma mudança do app para as colunas do banco. */
function paraColunas(m: Partial<ItemDoMural>) {
  return {
    ...(m.x !== undefined && { x: m.x }),
    ...(m.y !== undefined && { y: m.y }),
    ...(m.w !== undefined && { w: m.w }),
    ...(m.h !== undefined && { h: m.h }),
    ...(m.z !== undefined && { z: m.z }),
    ...(m.cor !== undefined && { color: m.cor }),
    ...(m.texto !== undefined && { text: m.texto }),
    ...(m.grupoId !== undefined && { parent_id: m.grupoId }),
  };
}

// ---------------------------------------------------------------------------
// Lista de murais
// ---------------------------------------------------------------------------
export function useMurais() {
  return useQuery({
    queryKey: chaves.murais,
    queryFn: async (): Promise<ResumoDeMural[]> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase
        .from("v_boards")
        .select("id, title, color, icon, track_id, itens, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data.flatMap((b) =>
        b.id === null
          ? []
          : [
              {
                id: b.id,
                titulo: b.title ?? "",
                cor: ehCorDoMural(b.color) ? b.color : "amarelo",
                icone: ehIconeDoMural(b.icon) ? b.icon : "layout-dashboard",
                trilhaId: b.track_id,
                itens: b.itens ?? 0,
                atualizadoEm: b.updated_at ?? "",
              },
            ],
      );
    },
  });
}

export interface NovoMural {
  id: string;
  titulo: string;
  cor: CorDoMural;
  icone: IconeDoMural;
  trilhaId: string | null;
}

export function useCriarMural() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  return useMutation({
    mutationFn: async (m: NovoMural) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador().from("boards").insert({
        id: m.id,
        user_id: perfil.id,
        title: m.titulo,
        color: m.cor,
        icon: m.icone,
        track_id: m.trilhaId,
      });
      if (error) throw error;
    },
    onMutate: async (m) => {
      await queryClient.cancelQueries({ queryKey: chaves.murais });
      const anterior = queryClient.getQueryData<ResumoDeMural[]>(chaves.murais);
      queryClient.setQueryData<ResumoDeMural[]>(chaves.murais, [
        { ...m, itens: 0, atualizadoEm: new Date().toISOString() },
        ...(anterior ?? []),
      ]);
      return { anterior };
    },
    onError: (_e, _m, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(chaves.murais, ctx.anterior);
      toast.error("Não deu pra criar o mural. Tente de novo.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.murais }),
  });
}

/** Arquiva o mural (some da lista; nada é apagado). Com "Desfazer". */
export function useArquivarMural() {
  const queryClient = useQueryClient();
  const mudar = useMutation({
    mutationFn: async ({ id, arquivar }: { id: string; arquivar: boolean }) => {
      const { error } = await criarClienteNavegador()
        .from("boards")
        .update({ archived_at: arquivar ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, arquivar }) => {
      await queryClient.cancelQueries({ queryKey: chaves.murais });
      const anterior = queryClient.getQueryData<ResumoDeMural[]>(chaves.murais);
      if (arquivar && anterior) {
        queryClient.setQueryData<ResumoDeMural[]>(
          chaves.murais,
          anterior.filter((m) => m.id !== id),
        );
      }
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(chaves.murais, ctx.anterior);
      toast.error("Não deu pra salvar. Tente de novo.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.murais }),
  });
  return (m: { id: string; titulo: string }) => {
    mudar.mutate({ id: m.id, arquivar: true });
    toast(`Mural “${m.titulo}” arquivado.`, {
      action: { label: "Desfazer", onClick: () => mudar.mutate({ id: m.id, arquivar: false }) },
    });
  };
}

// ---------------------------------------------------------------------------
// Um mural (com itens e setas)
// ---------------------------------------------------------------------------
export function useMural(id: string) {
  return useQuery({
    queryKey: chaves.mural(id),
    queryFn: async (): Promise<MuralCompleto | null> => {
      const supabase = criarClienteNavegador();
      const [b, i, l] = await Promise.all([
        supabase
          .from("boards")
          .select("id, title, color, icon, track_id, viewport")
          .eq("id", id)
          .is("archived_at", null)
          .maybeSingle(),
        supabase
          .from("board_items")
          .select("id, kind, x, y, w, h, z, color, text, task_id, parent_id")
          .eq("board_id", id)
          .order("z"),
        supabase.from("board_links").select("id, from_item, to_item, label").eq("board_id", id),
      ]);
      if (b.error) throw b.error;
      if (i.error) throw i.error;
      if (l.error) throw l.error;
      if (!b.data) return null;
      return {
        mural: {
          id: b.data.id,
          titulo: b.data.title,
          cor: ehCorDoMural(b.data.color) ? b.data.color : "amarelo",
          icone: ehIconeDoMural(b.data.icon) ? b.data.icon : "layout-dashboard",
          trilhaId: b.data.track_id,
          camera: lerCamera(b.data.viewport),
        },
        itens: i.data.map(paraItem),
        ligacoes: l.data.map((x) => ({
          id: x.id,
          de: x.from_item,
          para: x.to_item,
          rotulo: x.label,
        })),
      };
    },
  });
}

/** Aplica uma mudança no cache do mural (atualização otimista) e devolve o estado anterior. */
async function mexerNoCache(
  queryClient: QueryClient,
  muralId: string,
  mudar: (m: MuralCompleto) => MuralCompleto,
) {
  const chave = chaves.mural(muralId);
  await queryClient.cancelQueries({ queryKey: chave });
  const anterior = queryClient.getQueryData<MuralCompleto | null>(chave);
  if (anterior) queryClient.setQueryData<MuralCompleto>(chave, mudar(anterior));
  return { anterior };
}

function desfazerCache(
  queryClient: QueryClient,
  muralId: string,
  ctx: { anterior?: MuralCompleto | null } | undefined,
  mensagem: string,
) {
  if (ctx?.anterior) queryClient.setQueryData(chaves.mural(muralId), ctx.anterior);
  toast.error(mensagem);
}

/** Todas as operações de um mural, com atualização otimista e "Desfazer" ao apagar. */
export function useOperacoesDoMural(muralId: string) {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  const supabase = criarClienteNavegador();
  const recarregar = () => queryClient.invalidateQueries({ queryKey: chaves.mural(muralId) });

  const criarItem = useMutation({
    mutationFn: async (item: ItemDoMural) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await supabase.from("board_items").insert({
        id: item.id,
        user_id: perfil.id,
        board_id: muralId,
        kind: item.tipo,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        z: item.z,
        color: item.cor,
        text: item.texto,
        task_id: item.tarefaId,
        parent_id: item.grupoId,
      });
      if (error) throw error;
    },
    onMutate: (item) =>
      mexerNoCache(queryClient, muralId, (m) => ({ ...m, itens: [...m.itens, item] })),
    onError: (_e, _v, ctx) =>
      desfazerCache(queryClient, muralId, ctx, "Não deu pra adicionar. Tente de novo."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.murais }),
  });

  const atualizarItem = useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: Partial<ItemDoMural> }) => {
      const { error } = await supabase
        .from("board_items")
        .update(paraColunas(mudanca))
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, mudanca }) =>
      mexerNoCache(queryClient, muralId, (m) => ({
        ...m,
        itens: m.itens.map((i) => (i.id === id ? { ...i, ...mudanca } : i)),
      })),
    onError: (_e, _v, ctx) => {
      desfazerCache(queryClient, muralId, ctx, "Não deu pra salvar a mudança.");
      void recarregar();
    },
  });

  // Apagar: guarda o item, as setas dele e os filhos (se for grupo) para o "Desfazer".
  const apagarItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_items").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) =>
      mexerNoCache(queryClient, muralId, (m) => ({
        ...m,
        itens: m.itens
          .filter((i) => i.id !== id)
          .map((i) => (i.grupoId === id ? { ...i, grupoId: null } : i)),
        ligacoes: m.ligacoes.filter((l) => l.de !== id && l.para !== id),
      })),
    onError: (_e, _v, ctx) => desfazerCache(queryClient, muralId, ctx, "Não deu pra apagar."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.murais }),
  });

  const restaurar = useMutation({
    mutationFn: async (copia: {
      item: ItemDoMural;
      ligacoes: LigacaoDoMural[];
      filhos: string[];
    }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { item } = copia;
      const r1 = await supabase.from("board_items").insert({
        id: item.id,
        user_id: perfil.id,
        board_id: muralId,
        kind: item.tipo,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        z: item.z,
        color: item.cor,
        text: item.texto,
        task_id: item.tarefaId,
        parent_id: item.grupoId,
      });
      if (r1.error) throw r1.error;
      if (copia.filhos.length > 0) {
        const r2 = await supabase
          .from("board_items")
          .update({ parent_id: item.id })
          .in("id", copia.filhos);
        if (r2.error) throw r2.error;
      }
      if (copia.ligacoes.length > 0) {
        const r3 = await supabase.from("board_links").insert(
          copia.ligacoes.map((l) => ({
            id: l.id,
            user_id: perfil.id,
            board_id: muralId,
            from_item: l.de,
            to_item: l.para,
            label: l.rotulo,
          })),
        );
        if (r3.error) throw r3.error;
      }
    },
    onError: () => toast.error("Não deu pra desfazer."),
    onSettled: recarregar,
  });

  const criarLigacao = useMutation({
    mutationFn: async (l: LigacaoDoMural) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await supabase.from("board_links").insert({
        id: l.id,
        user_id: perfil.id,
        board_id: muralId,
        from_item: l.de,
        to_item: l.para,
        label: l.rotulo,
      });
      if (error) throw error;
    },
    onMutate: (l) =>
      mexerNoCache(queryClient, muralId, (m) => ({ ...m, ligacoes: [...m.ligacoes, l] })),
    onError: (_e, _v, ctx) =>
      desfazerCache(queryClient, muralId, ctx, "Não deu pra ligar os itens."),
  });

  const apagarLigacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_links").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) =>
      mexerNoCache(queryClient, muralId, (m) => ({
        ...m,
        ligacoes: m.ligacoes.filter((l) => l.id !== id),
      })),
    onError: (_e, _v, ctx) =>
      desfazerCache(queryClient, muralId, ctx, "Não deu pra apagar a ligação."),
  });

  const salvarCamera = useMutation({
    mutationFn: async (camera: Camera) => {
      const { error } = await supabase
        .from("boards")
        .update({ viewport: { ...camera } })
        .eq("id", muralId);
      if (error) throw error;
    },
  });

  return {
    criarItem: (item: ItemDoMural) => criarItem.mutate(item),
    atualizarItem: (id: string, mudanca: Partial<ItemDoMural>) =>
      atualizarItem.mutate({ id, mudanca }),
    apagarItem: (id: string) => {
      const atual = queryClient.getQueryData<MuralCompleto | null>(chaves.mural(muralId));
      const item = atual?.itens.find((i) => i.id === id);
      if (!atual || !item) return;
      const copia = {
        item,
        ligacoes: atual.ligacoes.filter((l) => l.de === id || l.para === id),
        filhos: atual.itens.filter((i) => i.grupoId === id).map((i) => i.id),
      };
      apagarItem.mutate(id);
      toast(item.tipo === "grupo" ? "Grupo apagado (os itens ficaram soltos)." : "Item apagado.", {
        action: { label: "Desfazer", onClick: () => restaurar.mutate(copia) },
      });
    },
    criarLigacao: (l: LigacaoDoMural) => criarLigacao.mutate(l),
    apagarLigacao: (id: string) => apagarLigacao.mutate(id),
    salvarCamera: (c: Camera) => salvarCamera.mutate(c),
  };
}
