import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  comoUsuario,
  comoUsuarioGravando,
  comoVisitante,
  criarBanco,
  criarUsuario,
  type Banco,
} from "./apoio";

/**
 * Testes da migration de Notas: isolamento, título único, salvar_nota (atômica, troca os
 * links), FKs compostas nos links e a view de backlinks.
 */
let db: Banco;
let ana: string;
let bia: string;

async function nota(userId: string, title: string): Promise<string> {
  const r = await db.query<{ id: string }>(
    "insert into public.notes (user_id, title) values ($1, $2) returning id",
    [userId, title],
  );
  return r.rows[0]!.id;
}

const salvar = (userId: string, id: string, titulo: string, links: string[], texto = "") =>
  comoUsuarioGravando(db, userId, (tx) =>
    tx.query("select public.salvar_nota($1, $2, $3, $4, $5)", [
      id,
      titulo,
      JSON.stringify({ type: "doc", content: [] }),
      texto,
      links,
    ]),
  );

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com" });
  bia = await criarUsuario(db, { email: "bia@exemplo.com" });
});
afterAll(async () => {
  await db.close();
});

describe("segurança", () => {
  it("visitante não acessa nada", async () => {
    for (const t of ["notes", "note_links", "v_note_backlinks"]) {
      await expect(
        comoVisitante(db, (tx) => tx.query(`select * from public.${t}`)),
      ).rejects.toThrow(/permission denied/i);
    }
  });

  it("cada pessoa só vê as próprias notas", async () => {
    await nota(ana, "Só da Ana");
    const r = await comoUsuario(db, bia, (tx) => tx.query("select * from public.notes"));
    expect(r.rows).toHaveLength(0);
  });
});

describe("título único", () => {
  it("não repete título (ignora maiúsculas e espaços nas pontas)", async () => {
    await nota(ana, "Window functions");
    await expect(nota(ana, "  window FUNCTIONS ")).rejects.toThrow(/notes_titulo_unico_idx/);
  });

  it("pessoas diferentes podem ter o mesmo título; arquivada libera o título", async () => {
    await nota(bia, "Window functions");
    const id = await nota(ana, "Rascunho");
    await db.query("update public.notes set archived_at = now() where id = $1", [id]);
    await expect(nota(ana, "Rascunho")).resolves.toBeTruthy();
  });
});

describe("salvar_nota e backlinks", () => {
  it("grava a nota e troca os links numa tacada; backlinks aparecem no destino", async () => {
    const sql = await nota(ana, "SQL");
    const joins = await nota(ana, "JOINs");
    const ctes = await nota(ana, "CTEs");

    await salvar(ana, sql, " SQL ", [joins, ctes, joins], "SQL: ver JOINs e CTEs");
    let links = await db.query<{ to_note: string }>(
      "select to_note from public.note_links where from_note = $1 order by to_note",
      [sql],
    );
    expect(links.rows.map((l) => l.to_note).sort()).toEqual([joins, ctes].sort());

    // salvar de novo SUBSTITUI os links (o de CTEs some)
    await salvar(ana, sql, "SQL", [joins]);
    links = await db.query("select to_note from public.note_links where from_note = $1", [sql]);
    expect(links.rows).toEqual([{ to_note: joins }]);

    const back = await comoUsuario(db, ana, (tx) =>
      tx.query<{ from_note: string; title: string }>(
        "select from_note, title from public.v_note_backlinks where to_note = $1",
        [joins],
      ),
    );
    expect(back.rows).toEqual([{ from_note: sql, title: "SQL" }]);
    const titulo = await db.query<{ title: string }>(
      "select title from public.notes where id = $1",
      [sql],
    );
    expect(titulo.rows[0]?.title).toBe("SQL"); // espaços nas pontas removidos
  });

  it("link para a própria nota é ignorado", async () => {
    const a = await nota(ana, "Auto");
    await salvar(ana, a, "Auto", [a]);
    const r = await db.query("select * from public.note_links where from_note = $1", [a]);
    expect(r.rows).toHaveLength(0);
  });

  it("link para nota de outra pessoa falha e não salva nada", async () => {
    const minha = await nota(ana, "Minha");
    const daBia = await nota(bia, "Da Bia");
    await expect(salvar(ana, minha, "Minha alterada", [daBia])).rejects.toThrow(/foreign key/i);
    const t = await db.query<{ title: string }>("select title from public.notes where id = $1", [
      minha,
    ]);
    expect(t.rows[0]?.title).toBe("Minha");
  });

  it("não salva nota de outra pessoa", async () => {
    const daBia = await nota(bia, "Segredo");
    await expect(salvar(ana, daBia, "Hackeada", [])).rejects.toThrow(/não encontrada/);
  });

  it("apagar a nota apaga os links dela e para ela", async () => {
    const a = await nota(ana, "Apagável A");
    const b = await nota(ana, "Apagável B");
    await salvar(ana, a, "Apagável A", [b]);
    await db.query("delete from public.notes where id = $1", [b]);
    const r = await db.query("select * from public.note_links where from_note = $1", [a]);
    expect(r.rows).toHaveLength(0);
  });

  it("backlink de nota arquivada some", async () => {
    const origem = await nota(ana, "Origem arquivável");
    const destino = await nota(ana, "Destino");
    await salvar(ana, origem, "Origem arquivável", [destino]);
    await db.query("update public.notes set archived_at = now() where id = $1", [origem]);
    const back = await comoUsuario(db, ana, (tx) =>
      tx.query("select * from public.v_note_backlinks where to_note = $1", [destino]),
    );
    expect(back.rows).toHaveLength(0);
  });
});
