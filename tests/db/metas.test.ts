import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, comoVisitante, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Testes da migration de Metas: segurança, validações e o progresso calculado pela view
 * a partir das sessões de foco e das tarefas concluídas, dentro da janela do período.
 */
let db: Banco;
let ana: string;
let bia: string;
let sqlDaAna: string;
let pyDaAna: string;

async function meta(
  userId: string,
  campos: {
    kind: string;
    period?: string;
    target: number;
    track_id?: string | null;
    title?: string;
  },
): Promise<string> {
  const r = await db.query<{ id: string }>(
    `insert into public.goals (user_id, title, kind, period, target, track_id)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [
      userId,
      campos.title ?? "Meta",
      campos.kind,
      campos.period ?? "semana",
      campos.target,
      campos.track_id ?? null,
    ],
  );
  return r.rows[0]!.id;
}

/** Sessão de foco AGORA (dentro de qualquer janela atual) com `min` minutos. */
async function foco(userId: string, min: number, trackId: string | null = null) {
  await db.query(
    `insert into public.focus_sessions (user_id, track_id, planned_min, started_at, ended_at)
     values ($1, $2, 25, now() - ($3 || ' minutes')::interval, now())`,
    [userId, trackId, String(min)],
  );
}

async function tarefaFeita(userId: string, trackId: string | null = null, quando = "now()") {
  await db.query(
    `insert into public.tasks (user_id, title, track_id, status, completed_at)
     values ($1, 'feita', $2, 'done', ${quando})`,
    [userId, trackId],
  );
}

async function progresso(userId: string) {
  const r = await comoUsuario(db, userId, (tx) =>
    tx.query<{ id: string; atual: number; percentual: number }>(
      "select id, atual, percentual from public.v_goal_progress",
    ),
  );
  return new Map(r.rows.map((l) => [l.id, l]));
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com" });
  bia = await criarUsuario(db, { email: "bia@exemplo.com" });
  const t = await db.query<{ id: string }>(
    `insert into public.tracks (user_id, name, monogram) values ($1, 'SQL', 'S'), ($1, 'Python', 'Py')
     returning id`,
    [ana],
  );
  sqlDaAna = t.rows[0]!.id;
  pyDaAna = t.rows[1]!.id;
});
afterAll(async () => {
  await db.close();
});

describe("goals: segurança e validações", () => {
  it("visitante não acessa nada", async () => {
    await expect(comoVisitante(db, (tx) => tx.query("select * from public.goals"))).rejects.toThrow(
      /permission denied/i,
    );
  });

  it("cada pessoa só vê as próprias metas e não cria para outra", async () => {
    await meta(ana, { kind: "minutos", target: 300 });
    const vistas = await comoUsuario(db, bia, (tx) => tx.query("select * from public.goals"));
    expect(vistas.rows).toHaveLength(0);
    await expect(
      comoUsuario(db, bia, (tx) =>
        tx.query(
          "insert into public.goals (user_id, title, kind, target) values ($1, 'x', 'minutos', 10)",
          [ana],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("não aceita trilha de outra pessoa (FK composta)", async () => {
    await expect(meta(bia, { kind: "minutos", target: 10, track_id: sqlDaAna })).rejects.toThrow(
      /foreign key/i,
    );
  });

  it.each([
    [{ kind: "horas", target: 10 }, /goals_kind_check/],
    [{ kind: "minutos", target: 0 }, /goals_target_check/],
    [{ kind: "minutos", target: 10, period: "ano" }, /goals_period_check/],
    [{ kind: "minutos", target: 10, title: "   " }, /goals_title_check/],
  ])("recusa valores inválidos %j", async (campos, erro) => {
    await expect(meta(ana, campos)).rejects.toThrow(erro);
  });
});

describe("v_goal_progress", () => {
  it("meta de minutos soma o foco do período (sessões < 1 min não contam)", async () => {
    const eu = await criarUsuario(db, { email: "m1@exemplo.com" });
    const id = await meta(eu, { kind: "minutos", target: 100 });
    await foco(eu, 30);
    await foco(eu, 20);
    await db.query(
      `insert into public.focus_sessions (user_id, planned_min, started_at, ended_at)
       values ($1, 25, now() - interval '30 seconds', now())`,
      [eu],
    );
    expect((await progresso(eu)).get(id)).toMatchObject({ atual: 50, percentual: 50 });
  });

  it("meta presa a uma trilha só conta o que é da trilha", async () => {
    const id = await meta(ana, { kind: "minutos", target: 60, track_id: sqlDaAna });
    await foco(ana, 30, sqlDaAna);
    await foco(ana, 45, pyDaAna);
    await foco(ana, 10, null);
    expect((await progresso(ana)).get(id)).toMatchObject({ atual: 30, percentual: 50 });
  });

  it("meta de tarefas conta só tarefas-raiz concluídas dentro do período", async () => {
    const eu = await criarUsuario(db, { email: "m2@exemplo.com" });
    const id = await meta(eu, { kind: "tarefas", target: 4 });
    await tarefaFeita(eu);
    await tarefaFeita(eu);
    await tarefaFeita(eu, null, "now() - interval '40 days'"); // fora da semana
    await db.query("insert into public.tasks (user_id, title) values ($1, 'aberta')", [eu]);
    expect((await progresso(eu)).get(id)).toMatchObject({ atual: 2, percentual: 50 });
  });

  it("o percentual para em 100 mesmo passando da meta", async () => {
    const eu = await criarUsuario(db, { email: "m3@exemplo.com" });
    const id = await meta(eu, { kind: "minutos", target: 10 });
    await foco(eu, 40);
    expect((await progresso(eu)).get(id)).toMatchObject({ atual: 40, percentual: 100 });
  });

  it("meta arquivada some da view", async () => {
    const eu = await criarUsuario(db, { email: "m4@exemplo.com" });
    const id = await meta(eu, { kind: "minutos", target: 10 });
    await db.query("update public.goals set archived_at = now() where id = $1", [id]);
    expect((await progresso(eu)).has(id)).toBe(false);
  });

  it("a janela semanal vai de segunda a domingo; a mensal cobre o mês", async () => {
    const eu = await criarUsuario(db, { email: "m5@exemplo.com" });
    await meta(eu, { kind: "minutos", target: 10, period: "semana" });
    await meta(eu, { kind: "minutos", target: 10, period: "mes" });
    const r = await comoUsuario(db, eu, (tx) =>
      tx.query<{ period: string; dow_inicio: number; dow_fim: number; dia_inicio: number }>(
        `select period, extract(isodow from inicio)::int as dow_inicio,
                extract(isodow from fim)::int as dow_fim, extract(day from inicio)::int as dia_inicio
         from public.v_goal_progress order by period`,
      ),
    );
    const mes = r.rows.find((l) => l.period === "mes")!;
    const semana = r.rows.find((l) => l.period === "semana")!;
    expect(semana).toMatchObject({ dow_inicio: 1, dow_fim: 7 });
    expect(mes.dia_inicio).toBe(1);
  });

  it("uma pessoa não enxerga o progresso de outra", async () => {
    const r = await comoUsuario(db, bia, (tx) => tx.query("select * from public.v_goal_progress"));
    expect(r.rows).toHaveLength(0);
  });
});
