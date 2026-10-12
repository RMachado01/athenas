import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  comoServidor,
  comoUsuario,
  comoVisitante,
  criarBanco,
  criarUsuario,
  type Banco,
} from "./apoio";

/**
 * Testes da migration do Google Agenda (Etapa 1): o token só passa pelo servidor, a pessoa
 * só LÊ eventos e agendas (e liga/desliga a importação), o lote é atômico, a trava funciona
 * e desconectar apaga tudo, inclusive o segredo do Vault.
 */
let db: Banco;
let ana: string;
let bia: string;

const evento = (id: string, extra: Record<string, unknown> = {}) => ({
  google_event_id: id,
  title: `Evento ${id}`,
  all_day: false,
  starts_at: "2026-10-12T12:00:00Z",
  ends_at: "2026-10-12T13:00:00Z",
  ...extra,
});

async function conectar(userId: string, token = "refresh-secreto") {
  await comoServidor(db, async (tx) => {
    await tx.query("select public.gcal_salvar_conexao($1, $2, $3)", [
      userId,
      token,
      ["calendar.events.readonly"],
    ]);
    await tx.query(
      `insert into public.google_calendars (user_id, google_calendar_id, summary, is_primary)
       values ($1, 'primary@gmail.com', 'Pessoal', true), ($1, 'trabalho', 'Trabalho', false)`,
      [userId],
    );
  });
}

async function aplicar(
  userId: string,
  eventos: unknown[],
  opcoes: { remover?: string[]; token?: string; completo?: boolean; agenda?: string } = {},
) {
  await comoServidor(db, (tx) =>
    tx.query("select public.gcal_aplicar_lote($1, $2, $3, $4, $5, $6)", [
      userId,
      opcoes.agenda ?? "primary@gmail.com",
      JSON.stringify(eventos),
      opcoes.remover ?? [],
      opcoes.token ?? "tok-1",
      opcoes.completo ?? false,
    ]),
  );
}

const eventosDe = (userId: string) =>
  comoUsuario(db, userId, (tx) =>
    tx.query<{ google_event_id: string; title: string }>(
      "select google_event_id, title from public.calendar_events order by google_event_id",
    ),
  ).then((r) => r.rows);

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com" });
  bia = await criarUsuario(db, { email: "bia@exemplo.com" });
  await conectar(ana);
});
afterAll(async () => {
  await db.close();
});

describe("token e funções do servidor", () => {
  it("o refresh token fica no Vault (não na tabela) e o servidor consegue ler", async () => {
    const r = await db.query<{ vault_secret_id: string }>(
      "select vault_secret_id from private.google_connections where user_id = $1",
      [ana],
    );
    expect(r.rows[0]?.vault_secret_id).toBeTruthy();
    const lido = await comoServidor(db, (tx) =>
      tx.query<{ t: string }>("select public.gcal_ler_refresh_token($1) as t", [ana]),
    );
    expect(lido.rows[0]?.t).toBe("refresh-secreto");
  });

  it("reconectar troca o token no mesmo segredo e volta o status para ativo", async () => {
    await comoServidor(db, (tx) =>
      tx.query("select public.gcal_marcar_conexao($1, 'needs_reauth', 'invalid_grant')", [ana]),
    );
    await comoServidor(db, (tx) =>
      tx.query("select public.gcal_salvar_conexao($1, 'novo-token', '{}')", [ana]),
    );
    const r = await comoServidor(db, (tx) =>
      tx.query<{ t: string }>("select public.gcal_ler_refresh_token($1) as t", [ana]),
    );
    expect(r.rows[0]?.t).toBe("novo-token");
    const segredos = await db.query("select * from vault.secrets");
    expect(segredos.rows).toHaveLength(1);
    const estado = await comoUsuario(db, ana, (tx) =>
      tx.query<{ status: string; last_error: string | null }>(
        "select status, last_error from public.minha_conexao_google()",
      ),
    );
    expect(estado.rows).toEqual([{ status: "active", last_error: null }]);
  });

  it.each([
    ["select public.gcal_ler_refresh_token($1)", [ana]],
    ["select public.gcal_salvar_conexao($1, 'x', '{}')", [ana]],
    ["select public.gcal_remover_conexao($1)", [ana]],
    ["select public.gcal_travar_agenda($1, 'primary@gmail.com', 60)", [ana]],
    ["select public.gcal_aplicar_lote($1, 'primary@gmail.com', '[]', '{}', 't', true)", [ana]],
  ])("a pessoa logada NÃO pode chamar %s", async (sql, params) => {
    await expect(comoUsuario(db, ana, (tx) => tx.query(sql, params))).rejects.toThrow(
      /permission denied/i,
    );
  });

  it("visitante não vê agendas, eventos nem o estado da conexão", async () => {
    await expect(
      comoVisitante(db, (tx) => tx.query("select * from public.calendar_events")),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      comoVisitante(db, (tx) => tx.query("select * from public.minha_conexao_google()")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("ninguém da API enxerga o schema private nem o Vault", async () => {
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("select * from private.google_connections")),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("select * from vault.decrypted_secrets")),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("agendas e eventos (somente leitura para a pessoa)", () => {
  it("a pessoa vê só as próprias agendas e pode ligar/desligar a importação", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query(
        "update public.google_calendars set enabled = false where google_calendar_id = 'trabalho'",
      );
      return tx.query<{ google_calendar_id: string; enabled: boolean }>(
        "select google_calendar_id, enabled from public.google_calendars order by 1",
      );
    });
    expect(r.rows).toEqual([
      { google_calendar_id: "primary@gmail.com", enabled: true },
      { google_calendar_id: "trabalho", enabled: false },
    ]);
    const daBia = await comoUsuario(db, bia, (tx) =>
      tx.query("select * from public.google_calendars"),
    );
    expect(daBia.rows).toHaveLength(0);
  });

  it("a pessoa NÃO pode mexer no sync_token nem criar/apagar eventos", async () => {
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("update public.google_calendars set sync_token = 'x'")),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query(
          `insert into public.calendar_events (user_id, google_calendar_id, google_event_id, starts_at, ends_at)
           values ($1, 'primary@gmail.com', 'x', now(), now())`,
          [ana],
        ),
      ),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("delete from public.calendar_events")),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("gcal_aplicar_lote", () => {
  it("carga completa substitui tudo; incremental insere, atualiza e remove", async () => {
    await aplicar(ana, [evento("a"), evento("b")], { completo: true, token: "t1" });
    expect((await eventosDe(ana)).map((e) => e.google_event_id)).toEqual(["a", "b"]);

    await aplicar(ana, [evento("b", { title: "B novo" }), evento("c")], {
      remover: ["a"],
      token: "t2",
    });
    expect(await eventosDe(ana)).toEqual([
      { google_event_id: "b", title: "B novo" },
      { google_event_id: "c", title: "Evento c" },
    ]);

    await aplicar(ana, [evento("z")], { completo: true, token: "t3" });
    expect((await eventosDe(ana)).map((e) => e.google_event_id)).toEqual(["z"]);

    const ag = await db.query<{ sync_token: string; sync_locked_until: string | null }>(
      "select sync_token, sync_locked_until from public.google_calendars where user_id = $1 and google_calendar_id = 'primary@gmail.com'",
      [ana],
    );
    expect(ag.rows[0]).toEqual({ sync_token: "t3", sync_locked_until: null });
  });

  it("evento de dia inteiro guarda datas; horário inválido é recusado (e nada é gravado)", async () => {
    await aplicar(
      ana,
      [
        evento("dia", {
          all_day: true,
          starts_at: null,
          ends_at: null,
          start_date: "2026-10-12",
          end_date: "2026-10-13",
        }),
      ],
      { token: "t4" },
    );
    expect((await eventosDe(ana)).map((e) => e.google_event_id)).toContain("dia");

    await expect(
      aplicar(ana, [evento("ruim", { ends_at: "2026-10-12T11:00:00Z" }), evento("ok2")], {
        token: "t5",
      }),
    ).rejects.toThrow(/horario_coerente/);
    const ids = (await eventosDe(ana)).map((e) => e.google_event_id);
    expect(ids).not.toContain("ok2");
    const ag = await db.query<{ sync_token: string }>(
      "select sync_token from public.google_calendars where user_id = $1 and google_calendar_id = 'primary@gmail.com'",
      [ana],
    );
    expect(ag.rows[0]?.sync_token).toBe("t4"); // o token não andou sem os dados
  });
});

describe("trava e desconexão", () => {
  it("só um consegue travar a agenda por vez", async () => {
    const primeiro = await comoServidor(db, (tx) =>
      tx.query<{ ok: boolean }>("select public.gcal_travar_agenda($1, 'trabalho', 60) as ok", [
        ana,
      ]),
    );
    const segundo = await comoServidor(db, (tx) =>
      tx.query<{ ok: boolean }>("select public.gcal_travar_agenda($1, 'trabalho', 60) as ok", [
        ana,
      ]),
    );
    expect([primeiro.rows[0]?.ok, segundo.rows[0]?.ok]).toEqual([true, false]);
  });

  it("desconectar apaga conexão, segredo, agendas e eventos", async () => {
    await conectar(bia, "token-da-bia");
    await aplicar(bia, [evento("x")], { completo: true });
    await comoServidor(db, (tx) => tx.query("select public.gcal_remover_conexao($1)", [bia]));

    expect(await eventosDe(bia)).toEqual([]);
    const conexao = await db.query("select * from private.google_connections where user_id = $1", [
      bia,
    ]);
    expect(conexao.rows).toHaveLength(0);
    const segredo = await db.query("select * from vault.secrets where secret = 'token-da-bia'");
    expect(segredo.rows).toHaveLength(0);
    // a conexão da Ana continua intacta
    expect((await eventosDe(ana)).length).toBeGreaterThan(0);
  });
});
