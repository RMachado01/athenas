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
 * Testes da migration de Flashcards: isolamento, baralho padrão, responder/desfazer
 * (conflito entre aparelhos), cartões das notas (salvar_nota), limites, view v_decks e
 * a origem das sessões de foco.
 */
let db: Banco;
let ana: string;
let bia: string;

const uuid = () => crypto.randomUUID();

async function baralho(userId: string, name: string): Promise<string> {
  const r = await db.query<{ id: string }>(
    "insert into public.decks (user_id, name) values ($1, $2) returning id",
    [userId, name],
  );
  return r.rows[0]!.id;
}

async function cartao(userId: string, deckId: string, front = "Pergunta", back = "Resposta") {
  const r = await db.query<{ id: string }>(
    "insert into public.cards (user_id, deck_id, front, back) values ($1, $2, $3, $4) returning id",
    [userId, deckId, front, back],
  );
  return r.rows[0]!.id;
}

async function nota(userId: string, title: string): Promise<string> {
  const r = await db.query<{ id: string }>(
    "insert into public.notes (user_id, title) values ($1, $2) returning id",
    [userId, title],
  );
  return r.rows[0]!.id;
}

const novoEstado = (reps: number, extra: Record<string, unknown> = {}) => ({
  state: 1,
  due: "2026-10-12T12:10:00Z",
  stability: 0.4,
  difficulty: 6.4,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 1,
  reps,
  lapses: 0,
  last_review: "2026-10-12T12:00:00Z",
  ...extra,
});

const responder = (userId: string, card: string, repsEsperado: number, id = uuid()) =>
  comoUsuarioGravando(db, userId, (tx) =>
    tx.query("select public.responder_cartao($1, $2, $3, $4, $5::jsonb, $6)", [
      id,
      card,
      repsEsperado,
      3,
      JSON.stringify(novoEstado(repsEsperado + 1)),
      4200,
    ]),
  ).then(() => id);

const salvarNota = (
  userId: string,
  id: string,
  cartoes: { id: string; frente: string; verso: string }[],
) =>
  comoUsuarioGravando(db, userId, (tx) =>
    tx.query("select public.salvar_nota($1, $2, $3, $4, $5, $6::jsonb)", [
      id,
      `Nota ${id}`,
      JSON.stringify({ type: "doc", content: [] }),
      "",
      [],
      JSON.stringify(cartoes),
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
    for (const t of ["decks", "cards", "card_reviews", "v_decks", "v_review_cards"]) {
      await expect(
        comoVisitante(db, (tx) => tx.query(`select * from public.${t}`)),
      ).rejects.toThrow(/permission denied/i);
    }
  });

  it("cada pessoa só vê os próprios baralhos, cartões e histórico", async () => {
    const d = await baralho(ana, "Só da Ana");
    await cartao(ana, d);
    for (const t of ["decks", "cards", "card_reviews"]) {
      const r = await comoUsuario(db, bia, (tx) => tx.query(`select * from public.${t}`));
      expect(r.rows).toHaveLength(0);
    }
  });

  it("não dá para pôr cartão no baralho de outra pessoa (FK composta)", async () => {
    const d = await baralho(ana, "Privado");
    await expect(cartao(bia, d)).rejects.toThrow(/cards_deck_fk/);
  });
});

describe("baralhos", () => {
  it("nome único entre os ativos (ignora maiúsculas e espaços); arquivado libera", async () => {
    await baralho(ana, "SQL");
    await expect(baralho(ana, "  sql ")).rejects.toThrow(/decks_nome_unico_idx/);
    await db.query(
      "update public.decks set archived_at = now() where user_id = $1 and name = 'SQL'",
      [ana],
    );
    await expect(baralho(ana, "SQL")).resolves.toBeTruthy();
  });

  it("baralho_padrao cria 'Geral' uma vez só e reaproveita", async () => {
    const um = await comoUsuarioGravando(db, bia, (tx) =>
      tx.query<{ id: string }>("select public.baralho_padrao() as id"),
    );
    const dois = await comoUsuarioGravando(db, bia, (tx) =>
      tx.query<{ id: string }>("select public.baralho_padrao() as id"),
    );
    expect(um.rows[0]!.id).toBe(dois.rows[0]!.id);
    const r = await db.query(
      "select name, is_default from public.decks where user_id = $1 and is_default",
      [bia],
    );
    expect(r.rows).toEqual([{ name: "Geral", is_default: true }]);
  });

  it("baralho padrão não pode ser arquivado", async () => {
    await expect(
      db.query("update public.decks set archived_at = now() where user_id = $1 and is_default", [
        bia,
      ]),
    ).rejects.toThrow(/decks_padrao_ativo/);
  });
});

describe("responder e desfazer", () => {
  it("grava o histórico com o estado anterior e atualiza o cartão", async () => {
    const d = await baralho(ana, "Revisão");
    const c = await cartao(ana, d);
    const review = await responder(ana, c, 0);
    const card = await db.query<{ reps: number; state: number }>(
      "select reps, state from public.cards where id = $1",
      [c],
    );
    expect(card.rows[0]).toEqual({ reps: 1, state: 1 });
    const h = await db.query<{ state_before: number; rating: number; duration_ms: number }>(
      "select state_before, rating, duration_ms from public.card_reviews where id = $1",
      [review],
    );
    expect(h.rows[0]).toEqual({ state_before: 0, rating: 3, duration_ms: 4200 });
  });

  it("recusa resposta de outro aparelho (reps desatualizado)", async () => {
    const d = await baralho(ana, "Conflito");
    const c = await cartao(ana, d);
    await responder(ana, c, 0);
    await expect(responder(ana, c, 0)).rejects.toThrow(/conflito/);
  });

  it("recusa estado novo incoerente (reps precisa subir 1)", async () => {
    const d = await baralho(ana, "Coerência");
    const c = await cartao(ana, d);
    await expect(
      comoUsuarioGravando(db, ana, (tx) =>
        tx.query("select public.responder_cartao($1, $2, $3, $4, $5::jsonb, $6)", [
          uuid(),
          c,
          0,
          3,
          JSON.stringify(novoEstado(5)),
          0,
        ]),
      ),
    ).rejects.toThrow(/estado inválido/);
  });

  it("desfazer restaura o estado anterior e apaga a linha do histórico", async () => {
    const d = await baralho(ana, "Desfazer");
    const c = await cartao(ana, d);
    const review = await responder(ana, c, 0);
    await comoUsuarioGravando(db, ana, (tx) =>
      tx.query("select public.desfazer_resposta($1)", [review]),
    );
    const card = await db.query<{ reps: number; state: number; last_review: string | null }>(
      "select reps, state, last_review from public.cards where id = $1",
      [c],
    );
    expect(card.rows[0]).toEqual({ reps: 0, state: 0, last_review: null });
    const h = await db.query("select 1 from public.card_reviews where id = $1", [review]);
    expect(h.rows).toHaveLength(0);
  });

  it("só desfaz a última resposta do cartão", async () => {
    const d = await baralho(ana, "Última");
    const c = await cartao(ana, d);
    const primeira = await responder(ana, c, 0);
    await responder(ana, c, 1);
    await expect(
      comoUsuarioGravando(db, ana, (tx) =>
        tx.query("select public.desfazer_resposta($1)", [primeira]),
      ),
    ).rejects.toThrow(/última resposta/);
  });

  it("não responde cartão de outra pessoa", async () => {
    const d = await baralho(ana, "Alheio");
    const c = await cartao(ana, d);
    await expect(responder(bia, c, 0)).rejects.toThrow(/não encontrado/);
  });
});

describe("cartões das notas (salvar_nota)", () => {
  it("cria no baralho padrão, edita sem perder o agendamento, arquiva e desarquiva", async () => {
    const n = await nota(ana, "Com cartões");
    const id = uuid();
    await salvarNota(ana, n, [{ id, frente: "O que é JOIN?", verso: "Une tabelas" }]);
    const criado = await db.query<{ deck: string; is_default: boolean }>(
      "select d.name as deck, d.is_default from public.cards c join public.decks d on d.id = c.deck_id where c.id = $1",
      [id],
    );
    expect(criado.rows[0]).toEqual({ deck: "Geral", is_default: true });

    await responder(ana, id, 0);
    await salvarNota(ana, n, [{ id, frente: "O que é um JOIN?", verso: "Une tabelas" }]);
    const editado = await db.query<{ front: string; reps: number }>(
      "select front, reps from public.cards where id = $1",
      [id],
    );
    expect(editado.rows[0]).toEqual({ front: "O que é um JOIN?", reps: 1 });

    await salvarNota(ana, n, []);
    const arquivado = await db.query<{ archived: boolean }>(
      "select archived_at is not null as archived from public.cards where id = $1",
      [id],
    );
    expect(arquivado.rows[0]!.archived).toBe(true);

    await salvarNota(ana, n, [{ id, frente: "O que é um JOIN?", verso: "Une tabelas" }]);
    const devolta = await db.query<{ archived: boolean; reps: number }>(
      "select archived_at is not null as archived, reps from public.cards where id = $1",
      [id],
    );
    expect(devolta.rows[0]).toEqual({ archived: false, reps: 1 });
  });

  it("usa o baralho escolhido para a nota (e move os cartões ao trocar)", async () => {
    const n = await nota(ana, "Com baralho");
    const d = await baralho(ana, "Banco de dados");
    await comoUsuarioGravando(db, ana, (tx) =>
      tx.query("select public.definir_baralho_da_nota($1, $2)", [n, d]),
    );
    const id = uuid();
    await salvarNota(ana, n, [{ id, frente: "Índice?", verso: "Estrutura de busca" }]);
    const r1 = await db.query<{ deck_id: string }>(
      "select deck_id from public.cards where id = $1",
      [id],
    );
    expect(r1.rows[0]!.deck_id).toBe(d);

    const outro = await baralho(ana, "Outro baralho");
    await comoUsuarioGravando(db, ana, (tx) =>
      tx.query("select public.definir_baralho_da_nota($1, $2)", [n, outro]),
    );
    const r2 = await db.query<{ deck_id: string }>(
      "select deck_id from public.cards where id = $1",
      [id],
    );
    expect(r2.rows[0]!.deck_id).toBe(outro);
  });

  it("baralho arquivado da nota cai no padrão", async () => {
    const n = await nota(ana, "Baralho arquivado");
    const d = await baralho(ana, "Vai arquivar");
    await comoUsuarioGravando(db, ana, (tx) =>
      tx.query("select public.definir_baralho_da_nota($1, $2)", [n, d]),
    );
    await db.query("update public.decks set archived_at = now() where id = $1", [d]);
    const id = uuid();
    await salvarNota(ana, n, [{ id, frente: "F", verso: "V" }]);
    const r = await db.query<{ is_default: boolean }>(
      "select d.is_default from public.cards c join public.decks d on d.id = c.deck_id where c.id = $1",
      [id],
    );
    expect(r.rows[0]!.is_default).toBe(true);
  });

  it("mais de 200 cartões numa nota falha inteira (texto não salva)", async () => {
    const n = await nota(ana, "Gigante");
    const muitos = Array.from({ length: 201 }, (_, i) => ({
      id: uuid(),
      frente: `F${i}`,
      verso: "V",
    }));
    await expect(salvarNota(ana, n, muitos)).rejects.toThrow(/200 cartões/);
    const r = await db.query("select 1 from public.cards where note_id = $1", [n]);
    expect(r.rows).toHaveLength(0);
  });

  it("nota apagada arquiva os cartões (o histórico fica)", async () => {
    const n = await nota(ana, "Será apagada");
    const id = uuid();
    await salvarNota(ana, n, [{ id, frente: "F", verso: "V" }]);
    await db.query("delete from public.notes where id = $1", [n]);
    const r = await db.query<{ archived: boolean; note_id: string | null }>(
      "select archived_at is not null as archived, note_id from public.cards where id = $1",
      [id],
    );
    expect(r.rows[0]).toEqual({ archived: true, note_id: null });
  });
});

describe("views", () => {
  it("v_review_cards esconde suspensos, arquivados, de baralho arquivado e de nota arquivada", async () => {
    const u = await criarUsuario(db, { email: "cris@exemplo.com" });
    const d = await baralho(u, "Visível");
    const ok = await cartao(u, d, "ok");
    const susp = await cartao(u, d, "suspenso");
    await db.query("update public.cards set suspended = true where id = $1", [susp]);
    const n = await nota(u, "Arquivada");
    const daNota = uuid();
    await salvarNota(u, n, [{ id: daNota, frente: "da nota", verso: "v" }]);
    await db.query("update public.notes set archived_at = now() where id = $1", [n]);
    const r = await comoUsuario(db, u, (tx) =>
      tx.query<{ id: string }>("select id from public.v_review_cards"),
    );
    expect(r.rows.map((x) => x.id)).toEqual([ok]);
  });

  it("v_decks conta novos, para hoje e atrasados no fuso da pessoa", async () => {
    const u = await criarUsuario(db, { email: "duda@exemplo.com" });
    const d = await baralho(u, "Contas");
    await cartao(u, d, "novo");
    const venceHoje = await cartao(u, d, "hoje");
    const atrasado = await cartao(u, d, "atrasado");
    const futuro = await cartao(u, d, "futuro");
    await db.query("update public.cards set state = 2, due = now() where id = $1", [venceHoje]);
    await db.query(
      "update public.cards set state = 2, due = now() - interval '3 days' where id = $1",
      [atrasado],
    );
    await db.query(
      "update public.cards set state = 2, due = now() + interval '5 days' where id = $1",
      [futuro],
    );
    const r = await comoUsuario(db, u, (tx) =>
      tx.query("select total, novos, para_hoje, atrasados from public.v_decks where id = $1", [d]),
    );
    expect(r.rows[0]).toEqual({ total: 4, novos: 1, para_hoje: 2, atrasados: 1 });
  });
});

describe("limites e colunas novas", () => {
  it("novos por dia: padrão 10, entre 0 e 100", async () => {
    const r = await db.query<{ n: number }>(
      "select new_cards_per_day as n from public.profiles where id = $1",
      [ana],
    );
    expect(r.rows[0]!.n).toBe(10);
    await expect(
      db.query("update public.profiles set new_cards_per_day = 101 where id = $1", [ana]),
    ).rejects.toThrow(/check/);
  });

  it("sessão de foco aceita origem 'revisao' e recusa outras", async () => {
    const base =
      "insert into public.focus_sessions (user_id, planned_min, started_at, ended_at, origin) values ($1, 5, now() - interval '5 minutes', now(), $2)";
    await expect(db.query(base, [ana, "revisao"])).resolves.toBeTruthy();
    await expect(db.query(base, [ana, "outra"])).rejects.toThrow(/check/);
  });

  it("frente vazia é recusada", async () => {
    const d = await baralho(ana, "Validação");
    await expect(cartao(ana, d, "   ")).rejects.toThrow(/check/);
  });
});
