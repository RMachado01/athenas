import { describe, expect, it, vi } from "vitest";
import {
  criarClienteGoogle,
  ErroGoogle,
  type ClienteGoogle,
  type PaginaDeEventos,
} from "@/features/calendar/google/api";
import {
  ErroOAuth,
  ESCOPOS_ETAPA_1,
  gerarPkce,
  montarUrlDeAutorizacao,
  renovarAcesso,
  trocarCodigo,
} from "@/features/calendar/google/oauth";
import {
  paraLinha,
  sincronizarAgenda,
  type LinhaDeEvento,
  type RepositorioDeAgenda,
} from "@/features/calendar/google/sincronizar";

/** fetch falso: devolve as respostas na ordem e guarda as requisições. */
function fetchFalso(respostas: { status?: number; corpo: unknown }[]) {
  const chamadas: { url: string; init?: RequestInit }[] = [];
  const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    chamadas.push({ url: String(url), init });
    const r = respostas.shift() ?? { status: 500, corpo: {} };
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200 });
  });
  return { f: f as unknown as typeof fetch, chamadas };
}

describe("OAuth", () => {
  it("PKCE: challenge é o SHA-256 do verifier em base64url", async () => {
    const { verifier, challenge } = await gerarPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const esperado = Buffer.from(hash).toString("base64url");
    expect(challenge).toBe(esperado);
  });

  it("URL de autorização pede só leitura, offline, consentimento e PKCE S256", () => {
    const url = new URL(
      montarUrlDeAutorizacao({
        clientId: "cid",
        redirectUri: "https://app/api/google/retorno",
        state: "st",
        challenge: "ch",
        email: "ana@x.com",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "cid",
      redirect_uri: "https://app/api/google/retorno",
      response_type: "code",
      scope: ESCOPOS_ETAPA_1.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state: "st",
      code_challenge: "ch",
      code_challenge_method: "S256",
      login_hint: "ana@x.com",
    });
    expect(url.searchParams.get("scope")).not.toMatch(/calendar\.events( |$)/); // nada de escrita
  });

  it("trocarCodigo devolve os tokens quando os escopos foram concedidos", async () => {
    const { f, chamadas } = fetchFalso([
      {
        corpo: {
          refresh_token: "r",
          access_token: "a",
          scope: `openid ${ESCOPOS_ETAPA_1.join(" ")}`,
        },
      },
    ]);
    const t = await trocarCodigo(f, {
      code: "c",
      verifier: "v",
      clientId: "id",
      clientSecret: "s",
      redirectUri: "u",
    });
    expect(t).toMatchObject({ refreshToken: "r", accessToken: "a" });
    const corpo = new URLSearchParams(String(chamadas[0]!.init!.body));
    expect(corpo.get("code_verifier")).toBe("v");
    expect(corpo.get("grant_type")).toBe("authorization_code");
  });

  it("trocarCodigo recusa se a pessoa desmarcou permissões ou sem refresh token", async () => {
    const semEscopo = fetchFalso([
      { corpo: { refresh_token: "r", access_token: "a", scope: "openid" } },
    ]);
    await expect(
      trocarCodigo(semEscopo.f, {
        code: "c",
        verifier: "v",
        clientId: "i",
        clientSecret: "s",
        redirectUri: "u",
      }),
    ).rejects.toMatchObject({ codigo: "escopos_negados" });

    const semRefresh = fetchFalso([
      { corpo: { access_token: "a", scope: ESCOPOS_ETAPA_1.join(" ") } },
    ]);
    await expect(
      trocarCodigo(semRefresh.f, {
        code: "c",
        verifier: "v",
        clientId: "i",
        clientSecret: "s",
        redirectUri: "u",
      }),
    ).rejects.toMatchObject({ codigo: "sem_refresh_token" });
  });

  it("renovarAcesso traduz invalid_grant (token revogado) em ErroOAuth", async () => {
    const { f } = fetchFalso([{ status: 400, corpo: { error: "invalid_grant" } }]);
    const erro = await renovarAcesso(f, {
      refreshToken: "r",
      clientId: "i",
      clientSecret: "s",
    }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroOAuth);
    expect((erro as ErroOAuth).codigo).toBe("invalid_grant");
  });
});

describe("cliente da API", () => {
  it("listarEventos com syncToken não manda timeMin/timeMax", async () => {
    const { f, chamadas } = fetchFalso([{ corpo: { items: [], nextSyncToken: "n" } }]);
    await criarClienteGoogle(f).listarEventos("tok", "a@b.com", {
      syncToken: "s1",
      timeMin: "2026-01-01T00:00:00Z",
    });
    const url = new URL(chamadas[0]!.url);
    expect(url.pathname).toBe("/calendar/v3/calendars/a%40b.com/events");
    expect(url.searchParams.get("syncToken")).toBe("s1");
    expect(url.searchParams.has("timeMin")).toBe(false);
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect((chamadas[0]!.init!.headers as Record<string, string>).authorization).toBe("Bearer tok");
  });

  it("erro HTTP vira ErroGoogle com o status", async () => {
    const { f } = fetchFalso([{ status: 410, corpo: {} }]);
    await expect(criarClienteGoogle(f).listarEventos("t", "x", {})).rejects.toMatchObject({
      status: 410,
    });
  });

  it("listarAgendas junta as páginas", async () => {
    const { f } = fetchFalso([
      { corpo: { items: [{ id: "a", summary: "A" }], nextPageToken: "p2" } },
      { corpo: { items: [{ id: "b", summary: "B" }] } },
    ]);
    const agendas = await criarClienteGoogle(f).listarAgendas("t");
    expect(agendas.map((a) => a.id)).toEqual(["a", "b"]);
  });
});

describe("paraLinha", () => {
  it("evento com horário vira UTC", () => {
    expect(
      paraLinha({
        id: "e1",
        summary: " Plantão ",
        updated: "2026-10-01T00:00:00Z",
        start: { dateTime: "2026-10-12T08:00:00-03:00" },
        end: { dateTime: "2026-10-12T20:00:00-03:00" },
      }),
    ).toEqual({
      google_event_id: "e1",
      title: "Plantão",
      all_day: false,
      starts_at: "2026-10-12T11:00:00.000Z",
      ends_at: "2026-10-12T23:00:00.000Z",
      start_date: null,
      end_date: null,
      google_updated_at: "2026-10-01T00:00:00Z",
    });
  });

  it("dia inteiro guarda as datas (fim exclusivo) e título vazio vira '(sem título)'", () => {
    expect(
      paraLinha({ id: "d", start: { date: "2026-10-12" }, end: { date: "2026-10-13" } }),
    ).toMatchObject({
      all_day: true,
      start_date: "2026-10-12",
      end_date: "2026-10-13",
      title: "(sem título)",
    });
  });

  it("cancelado ou sem horário devolve null", () => {
    expect(paraLinha({ id: "c", status: "cancelled" })).toBeNull();
    expect(paraLinha({ id: "x", start: {}, end: {} })).toBeNull();
  });
});

describe("sincronizarAgenda", () => {
  const agora = new Date("2026-10-12T15:00:00Z");
  const ev = (id: string): PaginaDeEventos["items"][number] => ({
    id,
    summary: id,
    start: { dateTime: "2026-10-12T10:00:00Z" },
    end: { dateTime: "2026-10-12T11:00:00Z" },
  });

  function repoFalso(travaOk = true) {
    const lotes: {
      agendaId: string;
      eventos: LinhaDeEvento[];
      remover: string[];
      token: string;
      completo: boolean;
    }[] = [];
    const repo: RepositorioDeAgenda = {
      travar: vi.fn(async () => travaOk),
      aplicarLote: vi.fn(async (agendaId, eventos, remover, token, completo) => {
        lotes.push({ agendaId, eventos, remover, token, completo });
      }),
    };
    return { repo, lotes };
  }

  function clienteCom(paginas: (PaginaDeEventos | ErroGoogle)[]) {
    const pedidos: Parameters<ClienteGoogle["listarEventos"]>[2][] = [];
    const cliente: ClienteGoogle = {
      listarAgendas: vi.fn(),
      listarEventos: vi.fn(async (_t, _a, opcoes) => {
        pedidos.push(opcoes);
        const p = paginas.shift();
        if (!p) throw new Error("sem mais páginas");
        if (p instanceof ErroGoogle) throw p;
        return p;
      }),
    };
    return { cliente, pedidos };
  }

  it("primeira vez: carga completa na janela, todas as páginas num lote só", async () => {
    const { cliente, pedidos } = clienteCom([
      { items: [ev("a")], nextPageToken: "p2" },
      { items: [ev("b")], nextSyncToken: "tok-1" },
    ]);
    const { repo, lotes } = repoFalso();
    const r = await sincronizarAgenda({
      cliente,
      repo,
      accessToken: "t",
      agenda: { id: "primary", syncToken: null },
      agora,
    });
    expect(r).toEqual({
      agendaId: "primary",
      status: "ok",
      completo: true,
      gravados: 2,
      removidos: 0,
    });
    expect(pedidos[0]).toMatchObject({
      timeMin: "2026-09-12T15:00:00.000Z",
      timeMax: "2027-01-10T15:00:00.000Z",
    });
    expect(pedidos[1]).toMatchObject({ pageToken: "p2" });
    expect(lotes).toHaveLength(1);
    expect(lotes[0]).toMatchObject({ token: "tok-1", completo: true });
  });

  it("incremental: usa o syncToken e transforma cancelados em remoção", async () => {
    const { cliente, pedidos } = clienteCom([
      { items: [ev("novo"), { id: "velho", status: "cancelled" }], nextSyncToken: "tok-2" },
    ]);
    const { repo, lotes } = repoFalso();
    await sincronizarAgenda({
      cliente,
      repo,
      accessToken: "t",
      agenda: { id: "p", syncToken: "tok-1" },
      agora,
    });
    expect(pedidos[0]).toEqual({ syncToken: "tok-1", pageToken: undefined });
    expect(lotes[0]).toMatchObject({ remover: ["velho"], completo: false, token: "tok-2" });
    expect(lotes[0]!.eventos.map((e) => e.google_event_id)).toEqual(["novo"]);
  });

  it("410 Gone: descarta o token e refaz a carga completa", async () => {
    const { cliente, pedidos } = clienteCom([
      new ErroGoogle(410, "gone"),
      { items: [ev("a")], nextSyncToken: "tok-novo" },
    ]);
    const { repo, lotes } = repoFalso();
    const r = await sincronizarAgenda({
      cliente,
      repo,
      accessToken: "t",
      agenda: { id: "p", syncToken: "tok-velho" },
      agora,
    });
    expect(r).toMatchObject({ status: "ok", completo: true });
    expect(pedidos[1]!.syncToken).toBeUndefined();
    expect(lotes[0]).toMatchObject({ completo: true, token: "tok-novo" });
  });

  it("agenda travada por outra sincronização: não faz nada", async () => {
    const { cliente } = clienteCom([]);
    const { repo, lotes } = repoFalso(false);
    const r = await sincronizarAgenda({
      cliente,
      repo,
      accessToken: "t",
      agenda: { id: "p", syncToken: null },
      agora,
    });
    expect(r).toEqual({ agendaId: "p", status: "ocupada" });
    expect(cliente.listarEventos).not.toHaveBeenCalled();
    expect(lotes).toHaveLength(0);
  });

  it("erro no meio das páginas não grava nada (nem o token)", async () => {
    const { cliente } = clienteCom([
      { items: [ev("a")], nextPageToken: "p2" },
      new ErroGoogle(500, "falhou"),
    ]);
    const { repo, lotes } = repoFalso();
    await expect(
      sincronizarAgenda({
        cliente,
        repo,
        accessToken: "t",
        agenda: { id: "p", syncToken: null },
        agora,
      }),
    ).rejects.toMatchObject({ status: 500 });
    expect(lotes).toHaveLength(0);
  });

  it("sem nextSyncToken na última página é erro (nunca guardar dados sem token)", async () => {
    const { cliente } = clienteCom([{ items: [ev("a")] }]);
    const { repo, lotes } = repoFalso();
    await expect(
      sincronizarAgenda({
        cliente,
        repo,
        accessToken: "t",
        agenda: { id: "p", syncToken: null },
        agora,
      }),
    ).rejects.toBeInstanceOf(ErroGoogle);
    expect(lotes).toHaveLength(0);
  });
});
