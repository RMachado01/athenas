/**
 * Cliente mínimo da API do Google Agenda (v3), só leitura nesta etapa. `fetch` injetável:
 * nos testes passamos respostas gravadas em vez de ir à rede.
 */

type Fetch = typeof fetch;
const BASE = "https://www.googleapis.com/calendar/v3";

export class ErroGoogle extends Error {
  constructor(
    /** 410 = syncToken inválido (refazer carga completa) · 401 = token ruim · 429/403 = limite. */
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroGoogle";
  }
}

export interface AgendaGoogle {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
}

/** Só o que lemos de um evento (a API devolve muito mais). */
export interface EventoGoogle {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
}

export interface PaginaDeEventos {
  items: EventoGoogle[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

async function getJson<T>(f: Fetch, url: string, accessToken: string): Promise<T> {
  const r = await f(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new ErroGoogle(r.status, `Google Agenda respondeu ${r.status}`);
  return (await r.json()) as T;
}

export interface ClienteGoogle {
  listarAgendas(accessToken: string): Promise<AgendaGoogle[]>;
  listarEventos(
    accessToken: string,
    agendaId: string,
    opcoes: { syncToken?: string; pageToken?: string; timeMin?: string; timeMax?: string },
  ): Promise<PaginaDeEventos>;
}

export function criarClienteGoogle(f: Fetch = fetch): ClienteGoogle {
  return {
    async listarAgendas(accessToken) {
      const todas: AgendaGoogle[] = [];
      let pageToken: string | undefined;
      do {
        const url = new URL(`${BASE}/users/me/calendarList`);
        url.searchParams.set("minAccessRole", "reader");
        if (pageToken) url.searchParams.set("pageToken", pageToken);
        const pag = await getJson<{ items?: AgendaGoogle[]; nextPageToken?: string }>(
          f,
          url.toString(),
          accessToken,
        );
        todas.push(...(pag.items ?? []));
        pageToken = pag.nextPageToken;
      } while (pageToken);
      return todas;
    },

    async listarEventos(accessToken, agendaId, opcoes) {
      const url = new URL(`${BASE}/calendars/${encodeURIComponent(agendaId)}/events`);
      url.searchParams.set("singleEvents", "true"); // repetições viram eventos individuais
      url.searchParams.set("maxResults", "250");
      if (opcoes.pageToken) url.searchParams.set("pageToken", opcoes.pageToken);
      if (opcoes.syncToken) {
        // Com syncToken o Google NÃO aceita timeMin/timeMax: só "o que mudou desde então".
        url.searchParams.set("syncToken", opcoes.syncToken);
      } else {
        if (opcoes.timeMin) url.searchParams.set("timeMin", opcoes.timeMin);
        if (opcoes.timeMax) url.searchParams.set("timeMax", opcoes.timeMax);
      }
      const pag = await getJson<PaginaDeEventos>(f, url.toString(), accessToken);
      return { ...pag, items: pag.items ?? [] };
    },
  };
}
