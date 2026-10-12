/**
 * Motor de importação Google → Athenas (ADR-005, Etapa 1). Sem React, sem Supabase direto:
 * recebe o cliente do Google e um "repositório" (quem grava no banco), então dá para testar
 * tudo com respostas gravadas.
 *
 * Regras:
 *  - Primeira vez (sem syncToken): carga COMPLETA numa janela (30 dias atrás → 90 à frente).
 *  - Depois: só o que mudou, com o syncToken daquela agenda.
 *  - 410 Gone = o Google invalidou o syncToken: refazemos a carga completa (previsto, não é bug).
 *  - Juntamos TODAS as páginas e só então gravamos, numa transação, junto com o novo token.
 *  - Uma trava por agenda impede duas sincronizações ao mesmo tempo.
 */
import { ErroGoogle, type ClienteGoogle, type EventoGoogle } from "./api";

export interface LinhaDeEvento {
  google_event_id: string;
  title: string;
  all_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
  start_date: string | null;
  end_date: string | null;
  google_updated_at: string | null;
}

export interface RepositorioDeAgenda {
  travar(agendaId: string): Promise<boolean>;
  aplicarLote(
    agendaId: string,
    eventos: LinhaDeEvento[],
    remover: string[],
    /** null = esquecer o token (usado ao desligar uma agenda). */
    syncToken: string | null,
    completo: boolean,
  ): Promise<void>;
}

const DIA = 86_400_000;
export const JANELA = { diasAntes: 30, diasDepois: 90 } as const;

/**
 * Converte um evento do Google numa linha do banco. Devolve null para cancelados (viram
 * remoção) e para eventos sem horário reconhecível.
 */
export function paraLinha(e: EventoGoogle): LinhaDeEvento | null {
  if (e.status === "cancelled" || !e.id) return null;
  const titulo = (e.summary ?? "").trim().slice(0, 500) || "(sem título)";
  const base = { google_event_id: e.id, title: titulo, google_updated_at: e.updated ?? null };

  if (e.start?.date && e.end?.date) {
    // Dia inteiro: o Google já manda o fim EXCLUSIVO (evento de 1 dia: 12 → 13).
    const fim = e.end.date > e.start.date ? e.end.date : proximoDia(e.start.date);
    return {
      ...base,
      all_day: true,
      starts_at: null,
      ends_at: null,
      start_date: e.start.date,
      end_date: fim,
    };
  }
  if (e.start?.dateTime && e.end?.dateTime) {
    const inicio = new Date(e.start.dateTime);
    const fim = new Date(e.end.dateTime);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null;
    return {
      ...base,
      all_day: false,
      starts_at: inicio.toISOString(),
      ends_at: (fim < inicio ? inicio : fim).toISOString(),
      start_date: null,
      end_date: null,
    };
  }
  return null;
}

function proximoDia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

export type ResultadoDaAgenda =
  | { agendaId: string; status: "ok"; completo: boolean; gravados: number; removidos: number }
  | { agendaId: string; status: "ocupada" };

export async function sincronizarAgenda(p: {
  cliente: ClienteGoogle;
  repo: RepositorioDeAgenda;
  accessToken: string;
  agenda: { id: string; syncToken: string | null };
  agora: Date;
}): Promise<ResultadoDaAgenda> {
  const { cliente, repo, accessToken, agenda, agora } = p;
  if (!(await repo.travar(agenda.id))) return { agendaId: agenda.id, status: "ocupada" };

  let syncToken = agenda.syncToken ?? undefined;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const completo = !syncToken;
    try {
      const eventos: LinhaDeEvento[] = [];
      const remover: string[] = [];
      let pageToken: string | undefined;
      let proximoToken: string | undefined;
      do {
        const pagina = await cliente.listarEventos(accessToken, agenda.id, {
          syncToken,
          pageToken,
          ...(completo && {
            timeMin: new Date(agora.getTime() - JANELA.diasAntes * DIA).toISOString(),
            timeMax: new Date(agora.getTime() + JANELA.diasDepois * DIA).toISOString(),
          }),
        });
        for (const item of pagina.items) {
          const linha = paraLinha(item);
          if (linha) eventos.push(linha);
          else if (!completo && item.id) remover.push(item.id);
        }
        pageToken = pagina.nextPageToken;
        proximoToken = pagina.nextSyncToken ?? proximoToken;
      } while (pageToken);

      if (!proximoToken) throw new ErroGoogle(500, "O Google não devolveu o nextSyncToken.");
      await repo.aplicarLote(agenda.id, eventos, remover, proximoToken, completo);
      return {
        agendaId: agenda.id,
        status: "ok",
        completo,
        gravados: eventos.length,
        removidos: remover.length,
      };
    } catch (erro) {
      // 410: token velho. Descarta e tenta UMA vez com carga completa.
      if (erro instanceof ErroGoogle && erro.status === 410 && syncToken) {
        syncToken = undefined;
        continue;
      }
      throw erro;
    }
  }
  throw new ErroGoogle(410, "syncToken inválido mesmo após recarga completa.");
}
