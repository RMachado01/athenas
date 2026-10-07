import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, comoVisitante, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Testes da migration de Foco: isolamento, FKs compostas, limites da sessão e as views
 * de minutos por dia e de sequência (streak).
 */
let db: Banco;
let ana: string;
let bia: string;

/** Insere uma sessão de foco que começou há `diasAtras` dias (às 12:00 UTC) e durou `min` minutos. */
async function sessao(userId: string, diasAtras: number, min: number, kind = "focus") {
  await db.query(
    `insert into public.focus_sessions (user_id, kind, planned_min, started_at, ended_at)
     values ($1, $2, 25,
       date_trunc('day', now()) - ($3 || ' days')::interval + interval '12 hours',
       date_trunc('day', now()) - ($3 || ' days')::interval + interval '12 hours' + ($4 || ' minutes')::interval)`,
    [userId, kind, String(diasAtras), String(min)],
  );
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com" });
  bia = await criarUsuario(db, { email: "bia@exemplo.com" });
});
afterAll(async () => {
  await db.close();
});

describe("focus_sessions: segurança", () => {
  it("visitante não acessa nada", async () => {
    await expect(
      comoVisitante(db, (tx) => tx.query("select * from public.focus_sessions")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("cada pessoa só vê e cria as próprias sessões", async () => {
    await sessao(ana, 0, 25);
    const vistas = await comoUsuario(db, bia, (tx) => tx.query("select * from public.focus_sessions"));
    expect(vistas.rows).toHaveLength(0);

    await expect(
      comoUsuario(db, bia, (tx) =>
        tx.query(
          `insert into public.focus_sessions (user_id, planned_min, started_at, ended_at)
           values ($1, 25, now() - interval '25 minutes', now())`,
          [ana],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("não aceita tarefa de outra pessoa (FK composta)", async () => {
    const t = await db.query<{ id: string }>(
      "insert into public.tasks (user_id, title) values ($1, 'da Ana') returning id",
      [ana],
    );
    await expect(
      db.query(
        `insert into public.focus_sessions (user_id, task_id, planned_min, started_at, ended_at)
         values ($1, $2, 25, now() - interval '25 minutes', now())`,
        [bia, t.rows[0]!.id],
      ),
    ).rejects.toThrow(/foreign key/i);
  });

  it("apagar a tarefa mantém a sessão (só perde o vínculo)", async () => {
    const t = await db.query<{ id: string }>(
      "insert into public.tasks (user_id, title) values ($1, 'temporária') returning id",
      [ana],
    );
    const s = await db.query<{ id: string }>(
      `insert into public.focus_sessions (user_id, task_id, planned_min, started_at, ended_at)
       values ($1, $2, 25, now() - interval '25 minutes', now()) returning id`,
      [ana, t.rows[0]!.id],
    );
    await db.query("delete from public.tasks where id = $1", [t.rows[0]!.id]);
    const r = await db.query<{ task_id: string | null }>(
      "select task_id from public.focus_sessions where id = $1",
      [s.rows[0]!.id],
    );
    expect(r.rows[0]?.task_id).toBeNull();
  });
});

describe("focus_sessions: limites", () => {
  it("fim precisa ser depois do início e a duração é calculada pelo banco", async () => {
    await expect(
      db.query(
        `insert into public.focus_sessions (user_id, planned_min, started_at, ended_at)
         values ($1, 25, now(), now() - interval '1 minute')`,
        [ana],
      ),
    ).rejects.toThrow(/fim_depois_do_inicio/);

    const r = await db.query<{ duration_sec: number }>(
      `insert into public.focus_sessions (user_id, planned_min, started_at, ended_at)
       values ($1, 25, now() - interval '25 minutes', now()) returning duration_sec`,
      [ana],
    );
    expect(r.rows[0]?.duration_sec).toBe(1500);
  });

  it("recusa sessão com mais de 6 horas", async () => {
    await expect(
      db.query(
        `insert into public.focus_sessions (user_id, planned_min, started_at, ended_at)
         values ($1, 25, now() - interval '7 hours', now())`,
        [ana],
      ),
    ).rejects.toThrow(/duracao_maxima/);
  });
});

describe("v_focus_days e v_streak", () => {
  it("soma minutos por dia, ignora pausas e sessões com menos de 5 min", async () => {
    const eu = await criarUsuario(db, { email: "dia@exemplo.com" });
    await sessao(eu, 0, 25);
    await sessao(eu, 0, 30);
    await sessao(eu, 0, 3); // curta demais
    await sessao(eu, 0, 5, "break"); // pausa não conta
    const r = await comoUsuario(db, eu, (tx) =>
      tx.query<{ sessoes: number; minutos: number }>("select sessoes, minutos from public.v_focus_days"),
    );
    expect(r.rows).toEqual([{ sessoes: 2, minutos: 55 }]);
  });

  it("sequência atual conta dias seguidos terminando hoje", async () => {
    const eu = await criarUsuario(db, { email: "seq1@exemplo.com" });
    for (const d of [0, 1, 2]) await sessao(eu, d, 25);
    await sessao(eu, 5, 25); // ilha antiga, de 1 dia
    const r = await comoUsuario(db, eu, (tx) =>
      tx.query<{ atual: number; melhor: number }>("select atual, melhor from public.v_streak"),
    );
    expect(r.rows).toEqual([{ atual: 3, melhor: 3 }]);
  });

  it("ainda vale se a última sessão foi ontem (dá tempo de estudar hoje)", async () => {
    const eu = await criarUsuario(db, { email: "seq2@exemplo.com" });
    for (const d of [1, 2]) await sessao(eu, d, 25);
    const r = await comoUsuario(db, eu, (tx) =>
      tx.query<{ atual: number }>("select atual from public.v_streak"),
    );
    expect(r.rows[0]?.atual).toBe(2);
  });

  it("zera a atual (mas guarda a melhor) se passou mais de um dia sem estudar", async () => {
    const eu = await criarUsuario(db, { email: "seq3@exemplo.com" });
    for (const d of [3, 4, 5, 6]) await sessao(eu, d, 25);
    const r = await comoUsuario(db, eu, (tx) =>
      tx.query<{ atual: number; melhor: number }>("select atual, melhor from public.v_streak"),
    );
    expect(r.rows).toEqual([{ atual: 0, melhor: 4 }]);
  });

  it("quem nunca estudou tem sequência zero", async () => {
    const eu = await criarUsuario(db, { email: "seq4@exemplo.com" });
    const r = await comoUsuario(db, eu, (tx) =>
      tx.query<{ atual: number; melhor: number }>("select atual, melhor from public.v_streak"),
    );
    expect(r.rows).toEqual([{ atual: 0, melhor: 0 }]);
  });

  it("uma pessoa não enxerga os dias nem a sequência de outra", async () => {
    const r = await comoUsuario(db, bia, (tx) => tx.query("select * from public.v_focus_days"));
    expect(r.rows).toHaveLength(0);
  });
});
