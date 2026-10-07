import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, comoVisitante, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Testes da migration de tarefas: isolamento entre pessoas, FKs compostas, hierarquia,
 * conclusão automática e as views (agrupamento por fuso e progresso por trilha).
 */
let db: Banco;
let ana: string;
let bia: string;
let trilhaDaAna: string;
let trilhaDaBia: string;

/** Insere uma tarefa como dono do banco (atalho para montar cenários). */
async function criarTarefa(
  userId: string,
  campos: {
    title?: string;
    track_id?: string | null;
    parent_id?: string | null;
    status?: string;
    due_on?: string | null;
  } = {},
): Promise<string> {
  const r = await db.query<{ id: string }>(
    `insert into public.tasks (user_id, title, track_id, parent_id, status, due_on)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [
      userId,
      campos.title ?? "Tarefa",
      campos.track_id ?? null,
      campos.parent_id ?? null,
      campos.status ?? "todo",
      campos.due_on ?? null,
    ],
  );
  return r.rows[0]!.id;
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com" });
  bia = await criarUsuario(db, { email: "bia@exemplo.com" });
  const t1 = await db.query<{ id: string }>(
    "insert into public.tracks (user_id, name, monogram) values ($1, 'SQL', 'S') returning id",
    [ana],
  );
  const t2 = await db.query<{ id: string }>(
    "insert into public.tracks (user_id, name, monogram) values ($1, 'Python', 'Py') returning id",
    [bia],
  );
  trilhaDaAna = t1.rows[0]!.id;
  trilhaDaBia = t2.rows[0]!.id;
});

afterAll(async () => {
  await db.close();
});

describe("tasks: isolamento (RLS)", () => {
  it("a pessoa cria, lê, edita e apaga as próprias tarefas", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query("insert into public.tasks (user_id, title) values ($1, 'CTEs')", [ana]);
      await tx.query("update public.tasks set title = 'CTEs e window functions'");
      const lida = await tx.query<{ title: string }>("select title from public.tasks");
      const apagadas = await tx.query("delete from public.tasks");
      return { lida: lida.rows, apagadas: apagadas.affectedRows };
    });
    expect(r.lida).toEqual([{ title: "CTEs e window functions" }]);
    expect(r.apagadas).toBe(1);
  });

  it("a pessoa NÃO vê, edita nem apaga tarefas de outra", async () => {
    const id = await criarTarefa(ana, { title: "Só da Ana" });
    const r = await comoUsuario(db, bia, async (tx) => ({
      vistas: (await tx.query("select 1 from public.tasks where id = $1", [id])).rows.length,
      editadas: (await tx.query("update public.tasks set title = 'x' where id = $1", [id]))
        .affectedRows,
      apagadas: (await tx.query("delete from public.tasks where id = $1", [id])).affectedRows,
    }));
    expect(r).toEqual({ vistas: 0, editadas: 0, apagadas: 0 });
  });

  it("a pessoa NÃO cria tarefa em nome de outra", async () => {
    await expect(
      comoUsuario(db, bia, (tx) =>
        tx.query("insert into public.tasks (user_id, title) values ($1, 'Intrusa')", [ana]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a pessoa NÃO move a própria tarefa para outro dono", async () => {
    const id = await criarTarefa(ana);
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query("update public.tasks set user_id = $1 where id = $2", [bia, id]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("visitante sem login não acessa a tabela nem as views", async () => {
    for (const objeto of ["tasks", "v_tasks", "v_track_progress"]) {
      await expect(
        comoVisitante(db, (tx) => tx.query(`select * from public.${objeto}`)),
        objeto,
      ).rejects.toThrow(/permission denied/);
    }
  });
});

describe("tasks: FKs compostas (não referenciar dados de outra pessoa)", () => {
  it("aceita a própria trilha", async () => {
    await expect(criarTarefa(ana, { track_id: trilhaDaAna })).resolves.toBeDefined();
  });

  it("recusa trilha de OUTRA pessoa, mesmo conhecendo o UUID", async () => {
    await expect(criarTarefa(ana, { track_id: trilhaDaBia })).rejects.toThrow(/foreign key/);
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query("insert into public.tasks (user_id, title, track_id) values ($1, 'x', $2)", [
          ana,
          trilhaDaBia,
        ]),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("recusa tarefa-mãe de OUTRA pessoa", async () => {
    const mae = await criarTarefa(bia, { title: "Mãe da Bia" });
    await expect(criarTarefa(ana, { parent_id: mae })).rejects.toThrow(/foreign key/);
  });

  it("apagar a trilha NÃO apaga a tarefa: ela só fica sem trilha", async () => {
    const trilha = await db.query<{ id: string }>(
      "insert into public.tracks (user_id, name, monogram) values ($1, 'Temporária', 'T') returning id",
      [ana],
    );
    const tarefa = await criarTarefa(ana, { track_id: trilha.rows[0]!.id });
    await db.query("delete from public.tracks where id = $1", [trilha.rows[0]!.id]);
    const r = await db.query<{ track_id: string | null }>(
      "select track_id from public.tasks where id = $1",
      [tarefa],
    );
    expect(r.rows).toEqual([{ track_id: null }]);
  });

  it("apagar a tarefa-mãe apaga as subtarefas", async () => {
    const mae = await criarTarefa(ana, { title: "Mãe" });
    const filha = await criarTarefa(ana, { title: "Filha", parent_id: mae });
    await db.query("delete from public.tasks where id = $1", [mae]);
    const r = await db.query("select 1 from public.tasks where id = $1", [filha]);
    expect(r.rows).toHaveLength(0);
  });
});

describe("tasks: hierarquia de 1 nível", () => {
  it("permite subtarefa de tarefa raiz", async () => {
    const mae = await criarTarefa(ana);
    await expect(criarTarefa(ana, { parent_id: mae })).resolves.toBeDefined();
  });

  it("recusa subtarefa de subtarefa", async () => {
    const mae = await criarTarefa(ana);
    const filha = await criarTarefa(ana, { parent_id: mae });
    await expect(criarTarefa(ana, { parent_id: filha })).rejects.toThrow(/subtarefas/);
  });

  it("recusa transformar em subtarefa uma tarefa que já tem subtarefas", async () => {
    const a = await criarTarefa(ana);
    await criarTarefa(ana, { parent_id: a });
    const b = await criarTarefa(ana);
    await expect(
      db.query("update public.tasks set parent_id = $1 where id = $2", [b, a]),
    ).rejects.toThrow(/já tem subtarefas/);
  });

  it("recusa tarefa que é mãe dela mesma", async () => {
    const t = await criarTarefa(ana);
    await expect(
      db.query("update public.tasks set parent_id = id where id = $1", [t]),
    ).rejects.toThrow(/check constraint|tasks_parent/);
  });
});

describe("tasks: conclusão automática e validações", () => {
  it("marcar como done preenche completed_at; reabrir limpa", async () => {
    const id = await criarTarefa(ana);
    const a = await db.query<{ completed_at: string | null }>(
      "update public.tasks set status = 'done' where id = $1 returning completed_at",
      [id],
    );
    expect(a.rows[0]?.completed_at).not.toBeNull();
    const b = await db.query<{ completed_at: string | null }>(
      "update public.tasks set status = 'doing' where id = $1 returning completed_at",
      [id],
    );
    expect(b.rows[0]?.completed_at).toBeNull();
  });

  it("criar já concluída preenche completed_at; o cliente não consegue 'forjar' um valor fora do status", async () => {
    const r = await db.query<{ status: string; completed_at: string | null }>(
      `insert into public.tasks (user_id, title, status) values ($1, 'x', 'done') returning status, completed_at`,
      [ana],
    );
    expect(r.rows[0]?.completed_at).not.toBeNull();

    const s = await db.query<{ completed_at: string | null }>(
      `insert into public.tasks (user_id, title, status, completed_at) values ($1, 'y', 'todo', now()) returning completed_at`,
      [ana],
    );
    expect(s.rows[0]?.completed_at).toBeNull();
  });

  it("valida título, prioridade, status, estimativa e hora sem data", async () => {
    const casos: [string, unknown[]][] = [
      ["insert into public.tasks (user_id, title) values ($1, '   ')", [ana]],
      ["insert into public.tasks (user_id, title, priority) values ($1, 'x', 4)", [ana]],
      ["insert into public.tasks (user_id, title, status) values ($1, 'x', 'feito')", [ana]],
      ["insert into public.tasks (user_id, title, estimate_min) values ($1, 'x', 0)", [ana]],
      ["insert into public.tasks (user_id, title, due_time) values ($1, 'x', '19:00')", [ana]],
    ];
    for (const [sql, params] of casos) {
      await expect(db.query(sql, params), sql).rejects.toThrow(/check constraint/);
    }
  });

  it("prazo com hora é aceito quando há data", async () => {
    await expect(
      db.query(
        "insert into public.tasks (user_id, title, due_on, due_time) values ($1, 'x', current_date, '19:00')",
        [ana],
      ),
    ).resolves.toBeDefined();
  });
});

describe("v_tasks: grupos calculados no fuso da pessoa", () => {
  let carla: string;

  beforeAll(async () => {
    carla = await criarUsuario(db, { email: "carla@exemplo.com" });
    await db.query("update public.profiles set timezone = 'America/Sao_Paulo' where id = $1", [
      carla,
    ]);
  });

  /** Data "de hoje" no fuso informado, no formato aceito pelo Postgres. */
  async function hojeNoFuso(fuso: string): Promise<string> {
    const r = await db.query<{ d: string }>("select (now() at time zone $1)::date::text as d", [
      fuso,
    ]);
    return r.rows[0]!.d;
  }

  async function bucketsDe(usuario: string): Promise<Record<string, string>> {
    return comoUsuario(db, usuario, async (tx) => {
      const r = await tx.query<{ title: string; bucket: string }>(
        "select title, bucket from public.v_tasks",
      );
      return Object.fromEntries(r.rows.map((x) => [x.title, x.bucket]));
    });
  }

  it("classifica atrasada, hoje, sem prazo, concluída e depois", async () => {
    const hoje = await hojeNoFuso("America/Sao_Paulo");
    const dia = async (delta: number) =>
      (await db.query<{ d: string }>("select ($1::date + $2::int)::text as d", [hoje, delta]))
        .rows[0]!.d;

    await criarTarefa(carla, { title: "ontem", due_on: await dia(-1) });
    await criarTarefa(carla, { title: "hoje", due_on: hoje });
    await criarTarefa(carla, { title: "sem prazo" });
    await criarTarefa(carla, { title: "feita", status: "done", due_on: await dia(-3) });
    await criarTarefa(carla, { title: "daqui a 30 dias", due_on: await dia(30) });

    const b = await bucketsDe(carla);
    expect(b).toEqual({
      ontem: "atrasada",
      hoje: "hoje",
      "sem prazo": "sem_prazo",
      feita: "concluida",
      "daqui a 30 dias": "depois",
    });
  });

  it("'semana' vai de amanhã até o domingo (e não existe quando hoje já é domingo)", async () => {
    const info = await db.query<{ hoje: string; isodow: number; amanha: string }>(
      `select (now() at time zone 'America/Sao_Paulo')::date::text as hoje,
              extract(isodow from (now() at time zone 'America/Sao_Paulo')::date)::int as isodow,
              ((now() at time zone 'America/Sao_Paulo')::date + 1)::text as amanha`,
    );
    const { isodow, amanha } = info.rows[0]!;
    const rita = await criarUsuario(db, { email: "rita@exemplo.com" });
    await criarTarefa(rita, { title: "amanhã", due_on: amanha });
    await criarTarefa(rita, {
      title: "daqui a 8 dias",
      due_on: (
        await db.query<{ d: string }>(
          "select ((now() at time zone 'America/Sao_Paulo')::date + 8)::text as d",
        )
      ).rows[0]!.d,
    });

    const b = await bucketsDe(rita);
    expect(b["daqui a 8 dias"]).toBe("depois");
    // Domingo: amanhã já é a semana seguinte, então cai em "depois".
    expect(b["amanhã"]).toBe(isodow === 7 ? "depois" : "semana");
  });

  it("o MESMO dia é 'hoje' em um fuso e outro grupo em outro fuso", async () => {
    const leste = await criarUsuario(db, { email: "kiritimati@exemplo.com" });
    const oeste = await criarUsuario(db, { email: "pagopago@exemplo.com" });
    await db.query("update public.profiles set timezone = 'Pacific/Kiritimati' where id = $1", [
      leste,
    ]); // UTC+14
    await db.query("update public.profiles set timezone = 'Pacific/Pago_Pago' where id = $1", [
      oeste,
    ]); // UTC-11

    const diaDoLeste = await hojeNoFuso("Pacific/Kiritimati");
    await criarTarefa(leste, { title: "t", due_on: diaDoLeste });
    await criarTarefa(oeste, { title: "t", due_on: diaDoLeste });

    expect((await bucketsDe(leste)).t).toBe("hoje");
    // 25 horas de diferença: para quem está no oeste esse dia ainda não chegou.
    expect((await bucketsDe(oeste)).t).not.toBe("hoje");
  });

  it("a view NÃO vaza tarefas entre pessoas (security_invoker)", async () => {
    const r = await comoUsuario(db, bia, (tx) =>
      tx.query<{ title: string }>("select title from public.v_tasks where title = 'Só da Ana'"),
    );
    expect(r.rows).toHaveLength(0);
  });
});

describe("v_track_progress: concluídas ÷ total (só tarefas raiz)", () => {
  it("calcula o percentual por trilha, ignora subtarefas e trilha sem tarefas dá 0", async () => {
    const dana = await criarUsuario(db, { email: "dana@exemplo.com" });
    const t1 = (
      await db.query<{ id: string }>(
        "insert into public.tracks (user_id, name, monogram) values ($1, 'SQL', 'S') returning id",
        [dana],
      )
    ).rows[0]!.id;
    await db.query(
      "insert into public.tracks (user_id, name, monogram) values ($1, 'Vazia', 'V')",
      [dana],
    );

    const a = await criarTarefa(dana, { track_id: t1, status: "done" });
    await criarTarefa(dana, { track_id: t1, status: "done" });
    await criarTarefa(dana, { track_id: t1 });
    await criarTarefa(dana, { track_id: t1 });
    // subtarefa não entra na conta:
    await criarTarefa(dana, { track_id: t1, parent_id: a });

    const r = await comoUsuario(db, dana, (tx) =>
      tx.query<{ name: string; total: number; concluidas: number; percentual: number }>(
        "select name, total::int as total, concluidas::int as concluidas, percentual from public.v_track_progress order by name",
      ),
    );
    expect(r.rows).toEqual([
      { name: "SQL", total: 4, concluidas: 2, percentual: 50 },
      { name: "Vazia", total: 0, concluidas: 0, percentual: 0 },
    ]);
  });

  it("não mostra trilhas de outra pessoa nem trilhas arquivadas", async () => {
    const eva = await criarUsuario(db, { email: "eva@exemplo.com" });
    await db.query(
      "insert into public.tracks (user_id, name, monogram, archived_at) values ($1, 'Antiga', 'A', now())",
      [eva],
    );
    const dela = await comoUsuario(db, eva, (tx) =>
      tx.query("select * from public.v_track_progress"),
    );
    expect(dela.rows).toHaveLength(0);

    const daBia = await comoUsuario(db, bia, (tx) =>
      tx.query<{ track_id: string }>("select track_id from public.v_track_progress"),
    );
    expect(daBia.rows.map((x) => x.track_id)).not.toContain(trilhaDaAna);
  });
});
