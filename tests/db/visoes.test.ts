import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, comoVisitante, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Visões das Tarefas: cor da trilha, data de início da tarefa e posições do Mural.
 */
let db: Banco;
let ana: string;
let bia: string;

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com", metadados: { full_name: "Ana" } });
  bia = await criarUsuario(db, { email: "bia@exemplo.com", metadados: { full_name: "Bia" } });
});

afterAll(async () => {
  await db.close();
});

async function tentar(userId: string, sql: string, params: unknown[] = []): Promise<string | null> {
  return comoUsuario(db, userId, async (tx) => {
    try {
      await tx.query(sql, params);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  });
}

describe("cor da trilha", () => {
  it("nasce azul e aceita as 8 cores do mural", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query(
        "insert into public.tracks (user_id, name, monogram) values ($1, 'SQL', 'S')",
        [ana],
      );
      const antes = await tx.query<{ color: string }>("select color from public.tracks");
      await tx.query("update public.tracks set color = 'menta'");
      const depois = await tx.query<{ color: string }>("select color from public.tracks");
      return { antes: antes.rows[0]?.color, depois: depois.rows[0]?.color };
    });
    expect(r).toEqual({ antes: "azul", depois: "menta" });
  });

  it("recusa cor fora da paleta", async () => {
    const erro = await tentar(
      ana,
      "insert into public.tracks (user_id, name, monogram, color) values ($1, 'X', 'X', 'vermelho')",
      [ana],
    );
    expect(erro).toMatch(/check constraint|tracks_color/);
  });
});

describe("tasks.start_on (Começa em)", () => {
  const nova = (extra: string) =>
    `insert into public.tasks (user_id, title, ${extra}) values ($1, 'T'`;

  it("aceita início antes ou no dia do prazo", async () => {
    expect(
      await tentar(
        ana,
        "insert into public.tasks (user_id, title, start_on, due_on) values ($1, 'T', '2026-10-13', '2026-10-17')",
        [ana],
      ),
    ).toBeNull();
    expect(
      await tentar(
        ana,
        "insert into public.tasks (user_id, title, start_on, due_on) values ($1, 'T', '2026-10-13', '2026-10-13')",
        [ana],
      ),
    ).toBeNull();
  });

  it("recusa início depois do prazo", async () => {
    const erro = await tentar(
      ana,
      "insert into public.tasks (user_id, title, start_on, due_on) values ($1, 'T', '2026-10-18', '2026-10-17')",
      [ana],
    );
    expect(erro).toMatch(/tasks_inicio/);
  });

  it("recusa início sem prazo", async () => {
    const erro = await tentar(
      ana,
      "insert into public.tasks (user_id, title, start_on) values ($1, 'T', '2026-10-13')",
      [ana],
    );
    expect(erro).toMatch(/tasks_inicio/);
    expect(nova("start_on")).toContain("start_on");
  });

  it("a view v_tasks expõe start_on", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query(
        "insert into public.tasks (user_id, title, start_on, due_on) values ($1, 'Python para Dados', '2026-10-13', '2026-10-17')",
        [ana],
      );
      return tx.query<{ start_on: string | null; bucket: string }>(
        "select start_on::text, bucket from public.v_tasks where title = 'Python para Dados'",
      );
    });
    expect(r.rows[0]?.start_on).toBe("2026-10-13");
  });
});

describe("task_positions (Mural das Tarefas)", () => {
  async function tarefaDe(userId: string): Promise<string> {
    const r = await db.query<{ id: string }>(
      "insert into public.tasks (user_id, title) values ($1, 'Post-it') returning id",
      [userId],
    );
    return r.rows[0]!.id;
  }

  it("a pessoa guarda, move e apaga a posição das próprias tarefas", async () => {
    const id = await tarefaDe(ana);
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query(
        "insert into public.task_positions (user_id, task_id, x, y) values ($1, $2, 10, 20)",
        [ana, id],
      );
      await tx.query("update public.task_positions set x = 300, y = 40 where task_id = $1", [id]);
      const lida = await tx.query<{ x: number; y: number }>(
        "select x, y from public.task_positions",
      );
      const apagadas = await tx.query("delete from public.task_positions");
      return { lida: lida.rows, apagadas: apagadas.affectedRows };
    });
    expect(r.lida).toEqual([{ x: 300, y: 40 }]);
    expect(r.apagadas).toBe(1);
  });

  it("a pessoa NÃO posiciona tarefa de outra nem vê posições alheias", async () => {
    const idDaAna = await tarefaDe(ana);
    const erro = await tentar(
      bia,
      "insert into public.task_positions (user_id, task_id, x, y) values ($1, $2, 0, 0)",
      [bia, idDaAna],
    );
    expect(erro).toMatch(/foreign key|violates/);
    const erroDono = await tentar(
      bia,
      "insert into public.task_positions (user_id, task_id, x, y) values ($1, $2, 0, 0)",
      [ana, idDaAna],
    );
    expect(erroDono).toMatch(/row-level security/);
  });

  it("apagar a tarefa apaga a posição (cascade)", async () => {
    const id = await tarefaDe(ana);
    await db.query(
      "insert into public.task_positions (user_id, task_id, x, y) values ($1, $2, 1, 1)",
      [ana, id],
    );
    await db.query("delete from public.tasks where id = $1", [id]);
    const r = await db.query("select 1 from public.task_positions where task_id = $1", [id]);
    expect(r.rows).toHaveLength(0);
  });

  it("recusa coordenada absurda e visitante não acessa", async () => {
    const id = await tarefaDe(ana);
    const erro = await tentar(
      ana,
      "insert into public.task_positions (user_id, task_id, x, y) values ($1, $2, 1e9, 0)",
      [ana, id],
    );
    expect(erro).toMatch(/check constraint|task_positions/);
    await expect(
      comoVisitante(db, (tx) => tx.query("select * from public.task_positions")),
    ).rejects.toThrow(/permission denied/);
  });
});
