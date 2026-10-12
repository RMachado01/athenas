import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, comoVisitante, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Testes da migration de Murais: isolamento, FKs compostas, gatilhos (grupo do mesmo mural,
 * seta no mesmo mural, limites), cascatas e a view com a contagem de itens.
 */
let db: Banco;
let ana: string;
let bia: string;
let muralA: string;
let muralB: string;

async function mural(userId: string, title = "Mural"): Promise<string> {
  const r = await db.query<{ id: string }>(
    "insert into public.boards (user_id, title) values ($1, $2) returning id",
    [userId, title],
  );
  return r.rows[0]!.id;
}

async function item(
  userId: string,
  boardId: string,
  campos: { kind?: string; text?: string; parent_id?: string | null; task_id?: string | null } = {},
): Promise<string> {
  const r = await db.query<{ id: string }>(
    `insert into public.board_items (user_id, board_id, kind, text, parent_id, task_id)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [
      userId,
      boardId,
      campos.kind ?? "nota",
      campos.text ?? "",
      campos.parent_id ?? null,
      campos.task_id ?? null,
    ],
  );
  return r.rows[0]!.id;
}

async function seta(userId: string, boardId: string, de: string, para: string) {
  await db.query(
    "insert into public.board_links (user_id, board_id, from_item, to_item) values ($1, $2, $3, $4)",
    [userId, boardId, de, para],
  );
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com" });
  bia = await criarUsuario(db, { email: "bia@exemplo.com" });
  muralA = await mural(ana, "SQL");
  muralB = await mural(ana, "ENEM");
});
afterAll(async () => {
  await db.close();
});

describe("segurança", () => {
  it("visitante não acessa nada", async () => {
    for (const t of ["boards", "board_items", "board_links", "v_boards"]) {
      await expect(
        comoVisitante(db, (tx) => tx.query(`select * from public.${t}`)),
      ).rejects.toThrow(/permission denied/i);
    }
  });

  it("cada pessoa só vê os próprios murais e não escreve nos de outra", async () => {
    const vistos = await comoUsuario(db, bia, (tx) => tx.query("select * from public.boards"));
    expect(vistos.rows).toHaveLength(0);
    await expect(
      comoUsuario(db, bia, (tx) =>
        tx.query("insert into public.board_items (user_id, board_id) values ($1, $2)", [
          bia,
          muralA,
        ]),
      ),
    ).rejects.toThrow(/foreign key|row-level security/i);
  });

  it("a pessoa logada cria e edita itens no próprio mural", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query(
        "insert into public.board_items (user_id, board_id, text) values ($1, $2, 'oi')",
        [ana, muralA],
      );
      return tx.query<{ text: string }>("select text from public.board_items where text = 'oi'");
    });
    expect(r.rows).toHaveLength(1);
  });
});

describe("regras dos itens", () => {
  it("tarefa de outra pessoa não pode virar card (FK composta)", async () => {
    const t = await db.query<{ id: string }>(
      "insert into public.tasks (user_id, title) values ($1, 'da Bia') returning id",
      [bia],
    );
    await expect(item(ana, muralA, { kind: "tarefa", task_id: t.rows[0]!.id })).rejects.toThrow(
      /foreign key/i,
    );
  });

  it("card de tarefa exige tarefa; só cards de tarefa têm task_id", async () => {
    await expect(item(ana, muralA, { kind: "tarefa" })).rejects.toThrow(/precisa de uma tarefa/);
    const t = await db.query<{ id: string }>(
      "insert into public.tasks (user_id, title) values ($1, 'minha') returning id",
      [ana],
    );
    await expect(item(ana, muralA, { kind: "nota", task_id: t.rows[0]!.id })).rejects.toThrow(
      /tarefa_coerente/,
    );
  });

  it("apagar a tarefa mantém o card (sem tarefa)", async () => {
    const t = await db.query<{ id: string }>(
      "insert into public.tasks (user_id, title) values ($1, 'temporária') returning id",
      [ana],
    );
    const card = await item(ana, muralA, { kind: "tarefa", task_id: t.rows[0]!.id });
    await db.query("delete from public.tasks where id = $1", [t.rows[0]!.id]);
    const r = await db.query<{ task_id: string | null }>(
      "select task_id from public.board_items where id = $1",
      [card],
    );
    expect(r.rows[0]?.task_id).toBeNull();
  });

  it.each([
    ["nota", 2001],
    ["titulo", 121],
    ["grupo", 81],
  ])("limite de texto do %s", async (kind, tamanho) => {
    await expect(item(ana, muralA, { kind, text: "x".repeat(tamanho) })).rejects.toThrow(
      /tamanho_do_texto/,
    );
  });

  it("o pai precisa ser um grupo do mesmo mural; apagar o grupo solta os filhos", async () => {
    const nota = await item(ana, muralA);
    await expect(item(ana, muralA, { parent_id: nota })).rejects.toThrow(/grupo do mesmo mural/);
    const grupoDeOutroMural = await item(ana, muralB, { kind: "grupo" });
    await expect(item(ana, muralA, { parent_id: grupoDeOutroMural })).rejects.toThrow(
      /grupo do mesmo mural/,
    );

    const grupo = await item(ana, muralA, { kind: "grupo", text: "Semana 1" });
    const filho = await item(ana, muralA, { parent_id: grupo });
    await db.query("delete from public.board_items where id = $1", [grupo]);
    const r = await db.query<{ parent_id: string | null }>(
      "select parent_id from public.board_items where id = $1",
      [filho],
    );
    expect(r.rows[0]).toEqual({ parent_id: null });
  });

  it("limite de 500 itens por mural", async () => {
    const cheio = await mural(ana, "Cheio");
    await db.query(
      `insert into public.board_items (user_id, board_id)
       select $1, $2 from generate_series(1, 500)`,
      [ana, cheio],
    );
    await expect(item(ana, cheio)).rejects.toThrow(/500 itens/);
  });
});

describe("setas", () => {
  it("liga dois itens do mesmo mural; sem laço e sem seta repetida", async () => {
    const a = await item(ana, muralA);
    const b = await item(ana, muralA);
    await seta(ana, muralA, a, b);
    await expect(seta(ana, muralA, a, b)).rejects.toThrow(/board_links_unica/);
    await expect(seta(ana, muralA, a, a)).rejects.toThrow(/sem_laco/);
  });

  it("não liga itens de murais diferentes", async () => {
    const a = await item(ana, muralA);
    const b = await item(ana, muralB);
    await expect(seta(ana, muralA, a, b)).rejects.toThrow(/mesmo mural/);
  });

  it("apagar um item apaga as setas dele; apagar o mural apaga tudo", async () => {
    const m = await mural(ana, "Temporário");
    const a = await item(ana, m);
    const b = await item(ana, m);
    await seta(ana, m, a, b);
    await db.query("delete from public.board_items where id = $1", [a]);
    let setas = await db.query("select * from public.board_links where board_id = $1", [m]);
    expect(setas.rows).toHaveLength(0);

    const c = await item(ana, m);
    await seta(ana, m, b, c);
    await db.query("delete from public.boards where id = $1", [m]);
    setas = await db.query("select * from public.board_links where board_id = $1", [m]);
    const itens = await db.query("select * from public.board_items where board_id = $1", [m]);
    expect([setas.rows.length, itens.rows.length]).toEqual([0, 0]);
  });
});

describe("v_boards", () => {
  it("lista os murais ativos com a contagem de itens; arquivados somem", async () => {
    const m = await mural(ana, "Contagem");
    await item(ana, m);
    await item(ana, m);
    const ativo = await comoUsuario(db, ana, (tx) =>
      tx.query<{ itens: number }>("select itens from public.v_boards where id = $1", [m]),
    );
    expect(ativo.rows[0]?.itens).toBe(2);

    await db.query("update public.boards set archived_at = now() where id = $1", [m]);
    const arquivado = await comoUsuario(db, ana, (tx) =>
      tx.query("select * from public.v_boards where id = $1", [m]),
    );
    expect(arquivado.rows).toHaveLength(0);
  });

  it("recusa cor fora da paleta", async () => {
    await expect(
      db.query("insert into public.boards (user_id, title, color) values ($1, 'x', 'neon')", [ana]),
    ).rejects.toThrow(/boards_color_check/);
  });
});
