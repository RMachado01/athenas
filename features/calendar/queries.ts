"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { somarDias } from "@/lib/datas";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { EventoDaAgenda } from "./dia";

export interface ConexaoGoogle {
  status: "active" | "needs_reauth";
  ultimaSincronizacao: string | null;
  ultimoErro: string | null;
}

/** Estado da conexão com o Google (null = não conectado). Nunca traz o token. */
export function useConexaoGoogle() {
  return useQuery({
    queryKey: chaves.conexaoGoogle,
    queryFn: async (): Promise<ConexaoGoogle | null> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase.rpc("minha_conexao_google");
      if (error) throw error;
      const linha = data?.[0];
      if (!linha) return null;
      return {
        status: linha.status === "needs_reauth" ? "needs_reauth" : "active",
        ultimaSincronizacao: linha.last_synced_at,
        ultimoErro: linha.last_error,
      };
    },
  });
}

export interface AgendaDaPessoa {
  id: string;
  nome: string;
  cor: string | null;
  principal: boolean;
  importar: boolean;
}

export function useAgendasGoogle(ativo: boolean) {
  return useQuery({
    queryKey: chaves.agendasGoogle,
    enabled: ativo,
    queryFn: async (): Promise<AgendaDaPessoa[]> => {
      const supabase = criarClienteNavegador();
      const { data, error } = await supabase
        .from("google_calendars")
        .select("google_calendar_id, summary, color, is_primary, enabled")
        .order("is_primary", { ascending: false })
        .order("summary");
      if (error) throw error;
      return data.map((a) => ({
        id: a.google_calendar_id,
        nome: a.summary || a.google_calendar_id,
        cor: a.color,
        principal: a.is_primary,
        importar: a.enabled,
      }));
    },
  });
}

/** Eventos importados que tocam a semana [inicio, inicio+7) (com folga de 1 dia por causa do fuso). */
export function useEventosDaSemana(inicio: string, ativo: boolean) {
  return useQuery({
    queryKey: [...chaves.eventosGoogle, inicio],
    enabled: ativo,
    queryFn: async (): Promise<EventoDaAgenda[]> => {
      const supabase = criarClienteNavegador();
      const de = somarDias(inicio, -1);
      const ate = somarDias(inicio, 8);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, google_calendar_id, title, all_day, starts_at, ends_at, start_date, end_date")
        .or(
          `and(all_day.eq.false,starts_at.lt.${ate}T00:00:00Z,ends_at.gt.${de}T00:00:00Z),` +
            `and(all_day.eq.true,start_date.lt.${ate},end_date.gt.${de})`,
        )
        .order("starts_at", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data.map((e) => ({
        id: e.id,
        titulo: e.title,
        agendaId: e.google_calendar_id,
        diaInteiro: e.all_day,
        inicio: e.starts_at,
        fim: e.ends_at,
        diaInicio: e.start_date,
        diaFim: e.end_date,
      }));
    },
  });
}

type RespostaDoSync = {
  status: "ok" | "desconectado" | "needs_reauth" | "nao_configurado" | "erro";
};

/** Pede ao servidor para importar do Google o que mudou; depois recarrega a tela. */
export function useSincronizarGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<RespostaDoSync> => {
      const r = await fetch("/api/google/sincronizar", { method: "POST" });
      const corpo = (await r.json().catch(() => ({ status: "erro" }))) as RespostaDoSync;
      if (corpo.status === "erro") throw new Error("falha ao sincronizar");
      return corpo;
    },
    onSuccess: (r) => {
      if (r.status === "needs_reauth") {
        toast.error("O acesso ao Google Agenda expirou. Reconecte em Personalização.");
      }
    },
    onError: () => toast.error("Não deu pra sincronizar com o Google. Tentar de novo?"),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.conexaoGoogle });
      void queryClient.invalidateQueries({ queryKey: chaves.agendasGoogle });
      void queryClient.invalidateQueries({ queryKey: chaves.eventosGoogle });
    },
  });
}

/** Liga/desliga a importação de uma agenda e sincroniza em seguida. */
export function useAlternarAgenda() {
  const queryClient = useQueryClient();
  const sincronizar = useSincronizarGoogle();
  return useMutation({
    mutationFn: async ({ id, importar }: { id: string; importar: boolean }) => {
      const supabase = criarClienteNavegador();
      const { error } = await supabase
        .from("google_calendars")
        .update({ enabled: importar })
        .eq("google_calendar_id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, importar }) => {
      await queryClient.cancelQueries({ queryKey: chaves.agendasGoogle });
      const anterior = queryClient.getQueryData<AgendaDaPessoa[]>(chaves.agendasGoogle);
      if (anterior) {
        queryClient.setQueryData<AgendaDaPessoa[]>(
          chaves.agendasGoogle,
          anterior.map((a) => (a.id === id ? { ...a, importar } : a)),
        );
      }
      return { anterior };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(chaves.agendasGoogle, ctx.anterior);
      toast.error("Não deu pra salvar. Tente de novo.");
    },
    onSuccess: () => sincronizar.mutate(),
  });
}

export function useDesconectarGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/google/desconectar", { method: "POST" });
      if (!r.ok) throw new Error("falha ao desconectar");
    },
    onSuccess: () => toast("Google Agenda desconectado. Os eventos importados foram apagados."),
    onError: () => toast.error("Não deu pra desconectar. Tente de novo."),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.conexaoGoogle });
      void queryClient.invalidateQueries({ queryKey: chaves.agendasGoogle });
      void queryClient.invalidateQueries({ queryKey: chaves.eventosGoogle });
    },
  });
}
