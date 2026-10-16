import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Excluir mural e nota (de verdade, para sempre): o que acontece com o que estava ligado a eles.
 * Mural: itens e setas vão junto (cascade). Nota: links vão junto; os cartões de revisão criados
 * a partir dela continuam nos baralhos (viram cartões "soltos"). Só o dono consegue apagar.
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

async function contar(tabela: string, filtro = "true"): Promise<number> {
  const r = await db.query<{ n: number }>(
    `select count(*)::int as n from public.${tabela} where ${filtro}`,
  );
  return r.rows[0]!.n;
}

describe("excluir mural", () => {
  it("apaga o mural com os itens e as setas dele, e só eles", async () => {
    const mural = (
      await db.query<{ id: string }>(
        "insert into public.boards (user_id, title) values ($1, 'Plano') returning id",
        [ana],
      )
    ).rows[0]!.id;
    const outro = (
      await db.query<{ id: string }>(
        "insert into public.boards (user_id, title) values ($1, 'Outro') returning id",
        [ana],
      )
    ).rows[0]!.id;
    const item = async (b: string) =>
      (
        await db.query<{ id: string }>(
          "insert into public.board_items (user_id, board_id, kind, text) values ($1, $2, 'nota', 'x') returning id",
          [ana, b],
        )
      ).rows[0]!.id;
    const [i1, i2, i3] = [await item(mural), await item(mural), await item(outro)];
    await db.query(
      "insert into public.board_links (user_id, board_id, from_item, to_item) values ($1, $2, $3, $4)",
      [ana, mural, i1, i2],
    );

    const apagadas = await comoUsuario(
      db,
      ana,
      async (tx) =>
        (await tx.query("delete from public.boards where id = $1", [mural])).affectedRows,
    );
    expect(apagadas).toBe(1);
    // comoUsuario desfaz no fim; repete gravando para conferir o cascade de verdade:
    await db.query("delete from public.boards where id = $1", [mural]);
    expect(await contar("board_items", `board_id = '${mural}'`)).toBe(0);
    expect(await contar("board_links", `board_id = '${mural}'`)).toBe(0);
    expect(await contar("board_items", `id = '${i3}'`)).toBe(1); // o outro mural fica intacto
  });

  it("a pessoa NÃO apaga mural de outra", async () => {
    const id = (
      await db.query<{ id: string }>(
        "insert into public.boards (user_id, title) values ($1, 'Da Ana') returning id",
        [ana],
      )
    ).rows[0]!.id;
    const apagadas = await comoUsuario(
      db,
      bia,
      async (tx) => (await tx.query("delete from public.boards where id = $1", [id])).affectedRows,
    );
    expect(apagadas).toBe(0);
  });
});

describe("excluir nota", () => {
  it("apaga a nota e os links dela; cartões criados dela continuam nos baralhos", async () => {
    const nota = (
      await db.query<{ id: string }>(
        "insert into public.notes (user_id, title) values ($1, 'Nota A') returning id",
        [ana],
      )
    ).rows[0]!.id;
    const outra = (
      await db.query<{ id: string }>(
        "insert into public.notes (user_id, title) values ($1, 'Nota B') returning id",
        [ana],
      )
    ).rows[0]!.id;
    await db.query(
      "insert into public.note_links (user_id, from_note, to_note) values ($1, $2, $3), ($1, $3, $2)",
      [ana, nota, outra],
    );
    const baralho = (
      await db.query<{ id: string }>(
        "insert into public.decks (user_id, name) values ($1, 'Geral') returning id",
        [ana],
      )
    ).rows[0]!.id;
    const cartao = (
      await db.query<{ id: string }>(
        "insert into public.cards (user_id, deck_id, note_id, front, back) values ($1, $2, $3, 'P', 'R') returning id",
        [ana, baralho, nota],
      )
    ).rows[0]!.id;

    await db.query("delete from public.notes where id = $1", [nota]);

    expect(await contar("notes", `id = '${nota}'`)).toBe(0);
    expect(await contar("note_links", `from_note = '${nota}' or to_note = '${nota}'`)).toBe(0);
    const c = await db.query<{ note_id: string | null }>(
      "select note_id from public.cards where id = $1",
      [cartao],
    );
    expect(c.rows).toEqual([{ note_id: null }]); // o cartão sobrevive, sem a nota de origem
    expect(await contar("notes", `id = '${outra}'`)).toBe(1);
  });

  it("a pessoa NÃO apaga nota de outra", async () => {
    const id = (
      await db.query<{ id: string }>(
        "insert into public.notes (user_id, title) values ($1, 'Da Ana 2') returning id",
        [ana],
      )
    ).rows[0]!.id;
    const apagadas = await comoUsuario(
      db,
      bia,
      async (tx) => (await tx.query("delete from public.notes where id = $1", [id])).affectedRows,
    );
    expect(apagadas).toBe(0);
  });
});
