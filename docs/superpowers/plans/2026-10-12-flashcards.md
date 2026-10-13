# Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flashcards com repetição espaçada (FSRS) no Athenas: baralhos, cartões à mão e dentro das notas (`pergunta :: resposta`), sessão de revisão com 4 botões, card no Início e tempo contando no Foco.

**Architecture:** O agendamento roda no aparelho (ts-fsrs, isolado em `features/flashcards/agendador.ts`); o banco grava estado + histórico numa transação (`responder_cartao`, SECURITY INVOKER, RLS valendo). Cartões das notas são parágrafos com um `cardId` estável no documento do Tiptap; `salvar_nota` sincroniza texto, links e cartões atomicamente. Regras de fila, extração e tempo são funções puras testadas com Vitest.

**Tech Stack:** Next.js 16 App Router (Cache Components), React 19.3, TypeScript strict, Tailwind v4, motion 14, TanStack Query 5, Radix, Tiptap 3.31.3, Supabase (Postgres + RLS), ts-fsrs 5.4.2, Vitest + PGlite, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-10-12-flashcards-design.md`

## Global Constraints

- Português (Brasil) em toda a interface e nos comentários; comentários didáticos; commits pequenos com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `ts-fsrs` exatamente `5.4.2` (MIT); instalar pelo workflow `.github/workflows/dependencias.yml` (pnpm é bloqueado localmente) e depois copiar o pacote para `node_modules` local via npm numa pasta temporária.
- Ferramentas locais via `.\node_modules\.bin\*.cmd` (vitest, tsc, eslint, prettier, playwright). `prettier --check` antes de cada commit.
- Parâmetros FSRS: `request_retention = 0.9`, `maximum_interval = 36500`, `enable_fuzz = true`, passos padrão.
- Limites: frente/verso 1–2000; nome do baralho 1–80; 5.000 cartões por pessoa; 200 por nota; 100 baralhos ativos; `new_cards_per_day` 0–100, padrão **10**; pausa de novos com **mais de 50 atrasados**; aprendizagem antecipada de **20 min**; pausa que corta o tempo de estudo: **5 min**; trecho mínimo gravado: **1 min**; `duration_ms` 0–600000.
- Paleta de baralhos = a do mural: `amarelo, rosa, verde, azul, roxo, laranja, cinza, menta` (padrão `azul`).
- RLS forçada por dono em tudo; `anon` sem acesso; funções `SECURITY INVOKER` com `set search_path = ''`, EXECUTE revogado de `public, anon` e concedido a `authenticated`.
- "Hoje" usa `profiles.timezone` (padrão `America/Sao_Paulo`), igual ao Foco.
- Dados dinâmicos (`params`, `searchParams`, `usePathname`, `new Date()`) dentro de `<Suspense>` (Cache Components).
- Animações respeitam `data-motion`/reduced motion (`useReducedMotionConfig`, `useEntrada`); alvos de toque ≥ 44 px (botões da revisão ≥ 48 px).
- Acessibilidade: axe WCAG 2.2 AA nos 8 temas (ponderosa, burgundy, camel, amethyst, volt, mono, amber, auto).
- Migration só vai ao Supabase `ecclywrnrdnzcpggvhcm` com aprovação explícita do Renan.

## Review Focus

1. **Responder rápido duas vezes / dois aparelhos:** respostas seguidas do mesmo cartão em aprendizagem não podem gerar "conflito" falso — as mutações rodam em série (`scope`), e um conflito real tira o cartão da sessão sem perder as outras respostas. (Teste: Task 9 Step 1, "duas respostas seguidas do mesmo cartão gravam em ordem"; Task 1 "recusa resposta de outro aparelho".)
2. **Colar parágrafo-cartão duplicado na nota:** o segundo ganha id novo; nunca dois cartões com o mesmo id nem um sobrescrevendo o outro. (Teste: Task 4, `garantirIdsDeCartao` com ids repetidos; Task 2 `extrairCartoes` ignora o repetido.)
3. **Virada do dia/fuso:** cartões de revisão vencendo mais tarde hoje contam para hoje; "atrasados" são os de antes da meia-noite no fuso da pessoa, não do UTC. (Teste: Task 3 `inicioDoDiaNoFuso` com São Paulo às 23h30 e 00h30 UTC.)
4. **Código com `::` na nota** (`std::vector`, `a::b` em código inline, blocos de código) não vira cartão. (Teste: Task 2.)
5. **Limite de cartões numa nota** (201ª linha): a nota inteira não salva, o aviso explica e o texto fica no editor. (Teste: Task 1 "mais de 200 cartões numa nota falha inteira"; mensagem no `useSalvarNota` na Task 4 Step 5; o falso recusa antes de alterar na Task 8 Step 3.)

---

## File Structure

**Criar**
- `supabase/migrations/20261015120000_flashcards.sql` — decks, cards, card_reviews, colunas novas, funções, views.
- `tests/db/flashcards.test.ts` — testes de banco.
- `features/flashcards/agendador.ts` — ponte com ts-fsrs (estado ↔ Card, prévia, responder, rótulo de intervalo).
- `features/flashcards/fila.ts` — início do dia no fuso, montagem da fila, reinserção, trechos de estudo.
- `features/flashcards/queries.ts` — hooks TanStack (baralhos, cartões, fila, responder, desfazer, CRUD).
- `features/flashcards/components/flashcards-view.tsx` — `/flashcards`.
- `features/flashcards/components/baralho-view.tsx` — `/flashcards/[id]`.
- `features/flashcards/components/formulario-de-baralho.tsx` — folha novo/editar baralho.
- `features/flashcards/components/formulario-de-cartao.tsx` — folha novo/editar cartão.
- `features/flashcards/components/revisao-view.tsx` — sessão de revisão.
- `features/flashcards/components/cartao-da-revisao.tsx` — cartão que vira.
- `features/flashcards/components/revisar-hoje.tsx` — card do Início.
- `features/notes/components/cartoes-na-nota.ts` — extensão Tiptap (`cardId`, decoração, ids únicos).
- `features/notes/components/baralho-da-nota.tsx` — pílula "N cartões · Baralho X" + folha de escolha.
- `app/(app)/flashcards/page.tsx`, `app/(app)/flashcards/[id]/page.tsx`, `app/(app)/flashcards/revisar/page.tsx` e espelhos em `app/dev/flashcards/...`.
- `tests/unit/agendador-flashcards.test.ts`, `tests/unit/fila-flashcards.test.ts`, `tests/unit/cartoes-nas-notas.test.ts`.
- `tests/e2e/flashcards.spec.ts`, `tests/a11y/flashcards.spec.ts`.

**Modificar**
- `features/notes/documento.ts` (+ `separarCartao`, `extrairCartoes`).
- `features/notes/queries.ts` (`deck_id`, `p_cartoes`, erro de limite).
- `features/notes/components/editor-de-nota.tsx`, `nota-view.tsx`.
- `features/focus/queries.ts` (`origem`).
- `features/dashboard/components/inicio-view.tsx` (card + item de menu).
- `features/settings/components/personalizacao-view.tsx` (novos por dia).
- `lib/perfil.ts`, `lib/chaves-de-consulta.ts`, `lib/database.types.ts`.
- `app/globals.css` (`.cartao-na-nota`, virada 3D, `.tocavel`).
- `tests/e2e/apoio-supabase-falso.ts` (tabelas e RPCs novas).
- `docs/adr/ADR-002-modelo-de-dados-e-rls.md` (emenda), `CHANGELOG.md`, `docs/roadmap.md`.

---

### Task 1: Banco — migration e testes

**Files:**
- Create: `supabase/migrations/20261015120000_flashcards.sql`
- Test: `tests/db/flashcards.test.ts`

**Interfaces:**
- Produces (SQL):
  - tabelas `decks(id, user_id, track_id, name, color, is_default, archived_at, created_at, updated_at)`, `cards(id, user_id, deck_id, note_id, front, back, state, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review, suspended, archived_at, created_at, updated_at)`, `card_reviews(id, user_id, card_id, rating, state_before, antes, state, due, stability, difficulty, scheduled_days, duration_ms, reviewed_at)`.
  - colunas `notes.deck_id`, `profiles.new_cards_per_day`, `focus_sessions.origin`.
  - `public.baralho_padrao() returns uuid`
  - `public.responder_cartao(p_id uuid, p_card uuid, p_reps_esperado integer, p_rating smallint, p_novo jsonb, p_duracao_ms integer) returns void`
  - `public.desfazer_resposta(p_review uuid) returns void`
  - `public.salvar_nota(p_id uuid, p_titulo text, p_conteudo jsonb, p_texto text, p_links uuid[], p_cartoes jsonb default '[]') returns void` (`p_cartoes = [{id, frente, verso}]`)
  - `public.definir_baralho_da_nota(p_nota uuid, p_deck uuid) returns void`
  - views `v_review_cards` (cartões revisáveis) e `v_decks(id, user_id, name, color, track_id, is_default, created_at, updated_at, total, novos, para_hoje, atrasados)`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/db/flashcards.test.ts
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
      "Nota",
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
    await db.query("update public.decks set archived_at = now() where user_id = $1 and name = 'SQL'", [ana]);
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
    const r = await db.query("select name, is_default from public.decks where user_id = $1 and is_default", [bia]);
    expect(r.rows).toEqual([{ name: "Geral", is_default: true }]);
  });

  it("baralho padrão não pode ser arquivado", async () => {
    await expect(
      db.query("update public.decks set archived_at = now() where user_id = $1 and is_default", [bia]),
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
          uuid(), c, 0, 3, JSON.stringify(novoEstado(5)), 0,
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
      comoUsuarioGravando(db, ana, (tx) => tx.query("select public.desfazer_resposta($1)", [primeira])),
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
    const r1 = await db.query<{ deck_id: string }>("select deck_id from public.cards where id = $1", [id]);
    expect(r1.rows[0]!.deck_id).toBe(d);

    const outro = await baralho(ana, "Outro baralho");
    await comoUsuarioGravando(db, ana, (tx) =>
      tx.query("select public.definir_baralho_da_nota($1, $2)", [n, outro]),
    );
    const r2 = await db.query<{ deck_id: string }>("select deck_id from public.cards where id = $1", [id]);
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
    const muitos = Array.from({ length: 201 }, (_, i) => ({ id: uuid(), frente: `F${i}`, verso: "V" }));
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
    await db.query("update public.cards set state = 2, due = now() - interval '3 days' where id = $1", [atrasado]);
    await db.query("update public.cards set state = 2, due = now() + interval '5 days' where id = $1", [futuro]);
    const r = await comoUsuario(db, u, (tx) =>
      tx.query("select total, novos, para_hoje, atrasados from public.v_decks where id = $1", [d]),
    );
    expect(r.rows[0]).toEqual({ total: 4, novos: 1, para_hoje: 2, atrasados: 1 });
  });
});

describe("limites e colunas novas", () => {
  it("novos por dia: padrão 10, entre 0 e 100", async () => {
    const r = await db.query<{ n: number }>("select new_cards_per_day as n from public.profiles where id = $1", [ana]);
    expect(r.rows[0]!.n).toBe(10);
    await expect(
      db.query("update public.profiles set new_cards_per_day = 101 where id = $1", [ana]),
    ).rejects.toThrow(/check/);
  });

  it("sessão de foco aceita origem 'revisao' e recusa outras", async () => {
    const base = "insert into public.focus_sessions (user_id, planned_min, started_at, ended_at, origin) values ($1, 5, now() - interval '5 minutes', now(), $2)";
    await expect(db.query(base, [ana, "revisao"])).resolves.toBeTruthy();
    await expect(db.query(base, [ana, "outra"])).rejects.toThrow(/check/);
  });

  it("frente vazia é recusada", async () => {
    const d = await baralho(ana, "Validação");
    await expect(cartao(ana, d, "   ")).rejects.toThrow(/check/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.\node_modules\.bin\vitest.cmd run tests/db/flashcards.test.ts`
Expected: FAIL (`relation "public.decks" does not exist`).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20261015120000_flashcards.sql
-- =============================================================================
-- Migration 0010 — Flashcards com repetição espaçada (FSRS)
--
-- Peças:
--  * decks: baralhos (opcionalmente ligados a uma trilha). "Geral" é o baralho padrão,
--    criado sob demanda por baralho_padrao().
--  * cards: frente/verso + o estado do agendamento FSRS em colunas (busca "o que vence hoje"
--    rápida). Cartão com note_id nasceu de uma linha "pergunta :: resposta" de uma nota.
--  * card_reviews: histórico (uma linha por resposta) com o estado ANTERIOR, para desfazer,
--    estatísticas e, no futuro, calibrar o FSRS de cada pessoa.
--  * Quem calcula o agendamento é o app (biblioteca ts-fsrs); o banco grava estado + histórico
--    numa transação só (responder_cartao) e recusa respostas de um aparelho desatualizado.
-- Tudo roda como a própria pessoa (SECURITY INVOKER): a RLS vale normalmente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Baralhos
-- -----------------------------------------------------------------------------
create table public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  track_id    uuid,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  color       text not null default 'azul'
                check (color in ('amarelo', 'rosa', 'verde', 'azul', 'roxo', 'laranja', 'cinza', 'menta')),
  is_default  boolean not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint decks_user_id_id_key unique (user_id, id),
  constraint decks_track_fk foreign key (user_id, track_id)
    references public.tracks (user_id, id) on delete set null (track_id),
  -- O baralho padrão recebe os cartões das notas sem baralho: ele nunca é arquivado.
  constraint decks_padrao_ativo check (not (is_default and archived_at is not null))
);

comment on table public.decks is 'Baralhos de flashcards. is_default = "Geral" (cartões de notas sem baralho).';

create unique index decks_nome_unico_idx
  on public.decks (user_id, lower(btrim(name)))
  where archived_at is null;
create unique index decks_um_padrao_idx on public.decks (user_id) where is_default;

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function private.set_updated_at();

-- Limite de 100 baralhos ativos por pessoa.
create function private.limitar_baralhos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.decks where user_id = new.user_id and archived_at is null) >= 100 then
    raise exception 'Você chegou ao limite de 100 baralhos' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger decks_limite
  before insert on public.decks
  for each row execute function private.limitar_baralhos();

-- -----------------------------------------------------------------------------
-- Colunas novas em tabelas existentes
-- -----------------------------------------------------------------------------
alter table public.notes add column deck_id uuid;
alter table public.notes add constraint notes_deck_fk foreign key (user_id, deck_id)
  references public.decks (user_id, id) on delete set null (deck_id);

alter table public.profiles add column new_cards_per_day smallint not null default 10
  check (new_cards_per_day between 0 and 100);

alter table public.focus_sessions add column origin text not null default 'foco'
  check (origin in ('foco', 'revisao'));

-- -----------------------------------------------------------------------------
-- Cartões
-- -----------------------------------------------------------------------------
create table public.cards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  deck_id        uuid not null,
  note_id        uuid,
  front          text not null check (char_length(btrim(front)) between 1 and 2000),
  back           text not null check (char_length(btrim(back)) between 1 and 2000),
  -- Estado FSRS (mesmos nomes da biblioteca ts-fsrs). state: 0 novo, 1 aprendendo,
  -- 2 revisão, 3 reaprendendo.
  state          smallint not null default 0 check (state between 0 and 3),
  due            timestamptz not null default now(),
  stability      double precision not null default 0 check (stability >= 0),
  difficulty     double precision not null default 0 check (difficulty between 0 and 10),
  elapsed_days   integer not null default 0 check (elapsed_days >= 0),
  scheduled_days integer not null default 0 check (scheduled_days >= 0),
  learning_steps integer not null default 0 check (learning_steps >= 0),
  reps           integer not null default 0 check (reps >= 0),
  lapses         integer not null default 0 check (lapses >= 0),
  last_review    timestamptz,
  suspended      boolean not null default false,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint cards_user_id_id_key unique (user_id, id),
  constraint cards_deck_fk foreign key (user_id, deck_id)
    references public.decks (user_id, id) on delete cascade,
  constraint cards_note_fk foreign key (user_id, note_id)
    references public.notes (user_id, id) on delete set null (note_id)
);

comment on table public.cards is 'Flashcards (frente/verso) com o estado do agendamento FSRS.';

create index cards_revisao_idx on public.cards (user_id, due)
  where archived_at is null and not suspended;
create index cards_baralho_idx on public.cards (deck_id);
create index cards_nota_idx on public.cards (note_id);

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function private.set_updated_at();

-- Limite de 5.000 cartões ativos por pessoa (um "upsert" de cartão que já existe não conta).
create function private.limitar_cartoes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.cards where id = new.id) then
    return new;
  end if;
  if (select count(*) from public.cards where user_id = new.user_id and archived_at is null) >= 5000 then
    raise exception 'Você chegou ao limite de 5.000 cartões' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger cards_limite
  before insert on public.cards
  for each row execute function private.limitar_cartoes();

-- Nota apagada: os cartões dela são arquivados (o histórico de revisão continua).
-- BEFORE DELETE: roda antes da FK zerar o note_id.
create function private.arquivar_cartoes_da_nota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.cards set archived_at = coalesce(archived_at, now()) where note_id = old.id;
  return old;
end;
$$;

create trigger notes_arquiva_cartoes
  before delete on public.notes
  for each row execute function private.arquivar_cartoes_da_nota();

-- -----------------------------------------------------------------------------
-- Histórico de respostas
-- -----------------------------------------------------------------------------
create table public.card_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  card_id        uuid not null,
  rating         smallint not null check (rating between 1 and 4),
  state_before   smallint not null check (state_before between 0 and 3),
  -- Estado completo do cartão ANTES da resposta (para desfazer com exatidão).
  antes          jsonb not null check (jsonb_typeof(antes) = 'object'),
  state          smallint not null check (state between 0 and 3),
  due            timestamptz not null,
  stability      double precision not null,
  difficulty     double precision not null,
  scheduled_days integer not null,
  duration_ms    integer not null default 0 check (duration_ms between 0 and 600000),
  reviewed_at    timestamptz not null default now(),

  constraint card_reviews_card_fk foreign key (user_id, card_id)
    references public.cards (user_id, id) on delete cascade
);

comment on table public.card_reviews is 'Uma linha por resposta de flashcard (com o estado anterior).';

create index card_reviews_user_dia_idx on public.card_reviews (user_id, reviewed_at desc);
create index card_reviews_cartao_idx on public.card_reviews (card_id, reviewed_at desc);

-- -----------------------------------------------------------------------------
-- RLS: só o dono.
-- -----------------------------------------------------------------------------
alter table public.decks enable row level security;
alter table public.decks force row level security;
alter table public.cards enable row level security;
alter table public.cards force row level security;
alter table public.card_reviews enable row level security;
alter table public.card_reviews force row level security;

revoke all on public.decks, public.cards, public.card_reviews from anon, authenticated;
grant select, insert, update, delete on public.decks, public.cards to authenticated;
grant select, insert, delete on public.card_reviews to authenticated;

create policy "decks_proprios" on public.decks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "cards_proprios" on public.cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "card_reviews_proprios" on public.card_reviews
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- baralho_padrao: devolve (criando se preciso) o baralho "Geral" da pessoa.
-- Se ela já tem um baralho ativo chamado "Geral", ele vira o padrão.
-- -----------------------------------------------------------------------------
create function public.baralho_padrao()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id   uuid;
begin
  select id into v_id from public.decks where user_id = v_user and is_default;
  if v_id is not null then
    return v_id;
  end if;

  update public.decks set is_default = true
   where user_id = v_user and archived_at is null and lower(btrim(name)) = 'geral'
  returning id into v_id;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.decks (user_id, name, is_default) values (v_user, 'Geral', true)
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- responder_cartao: grava a resposta (histórico) e o novo estado numa transação.
-- p_reps_esperado = reps que o aparelho viu; se o banco já tem outro número, outra resposta
-- chegou antes (outro aparelho) e esta é recusada com "conflito".
-- -----------------------------------------------------------------------------
create function public.responder_cartao(
  p_id uuid,
  p_card uuid,
  p_reps_esperado integer,
  p_rating smallint,
  p_novo jsonb,
  p_duracao_ms integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user  uuid := (select auth.uid());
  v_antes public.cards;
begin
  select * into v_antes from public.cards
   where id = p_card and user_id = v_user
   for update;
  if not found then
    raise exception 'Cartão não encontrado' using errcode = 'no_data_found';
  end if;
  if v_antes.reps <> p_reps_esperado then
    raise exception 'conflito: o cartão já foi respondido em outro aparelho';
  end if;
  if coalesce((p_novo->>'reps')::integer, -1) <> p_reps_esperado + 1 then
    raise exception 'estado inválido: reps precisa subir 1' using errcode = 'check_violation';
  end if;

  insert into public.card_reviews (
    id, user_id, card_id, rating, state_before, antes,
    state, due, stability, difficulty, scheduled_days, duration_ms
  ) values (
    p_id, v_user, p_card, p_rating, v_antes.state,
    jsonb_build_object(
      'state', v_antes.state, 'due', v_antes.due, 'stability', v_antes.stability,
      'difficulty', v_antes.difficulty, 'elapsed_days', v_antes.elapsed_days,
      'scheduled_days', v_antes.scheduled_days, 'learning_steps', v_antes.learning_steps,
      'reps', v_antes.reps, 'lapses', v_antes.lapses, 'last_review', v_antes.last_review
    ),
    (p_novo->>'state')::smallint, (p_novo->>'due')::timestamptz,
    (p_novo->>'stability')::double precision, (p_novo->>'difficulty')::double precision,
    (p_novo->>'scheduled_days')::integer,
    least(greatest(coalesce(p_duracao_ms, 0), 0), 600000)
  );

  update public.cards set
    state          = (p_novo->>'state')::smallint,
    due            = (p_novo->>'due')::timestamptz,
    stability      = (p_novo->>'stability')::double precision,
    difficulty     = (p_novo->>'difficulty')::double precision,
    elapsed_days   = (p_novo->>'elapsed_days')::integer,
    scheduled_days = (p_novo->>'scheduled_days')::integer,
    learning_steps = (p_novo->>'learning_steps')::integer,
    reps           = (p_novo->>'reps')::integer,
    lapses         = (p_novo->>'lapses')::integer,
    last_review    = (p_novo->>'last_review')::timestamptz
  where id = p_card;
end;
$$;

-- -----------------------------------------------------------------------------
-- desfazer_resposta: volta o cartão ao estado anterior (só a ÚLTIMA resposta dele).
-- -----------------------------------------------------------------------------
create function public.desfazer_resposta(p_review uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_r    public.card_reviews;
begin
  select * into v_r from public.card_reviews where id = p_review and user_id = v_user;
  if not found then
    raise exception 'Resposta não encontrada' using errcode = 'no_data_found';
  end if;
  if exists (
    select 1 from public.card_reviews
     where card_id = v_r.card_id and reviewed_at > v_r.reviewed_at
  ) then
    raise exception 'Só dá para desfazer a última resposta do cartão' using errcode = 'check_violation';
  end if;

  update public.cards set
    state          = (v_r.antes->>'state')::smallint,
    due            = (v_r.antes->>'due')::timestamptz,
    stability      = (v_r.antes->>'stability')::double precision,
    difficulty     = (v_r.antes->>'difficulty')::double precision,
    elapsed_days   = (v_r.antes->>'elapsed_days')::integer,
    scheduled_days = (v_r.antes->>'scheduled_days')::integer,
    learning_steps = (v_r.antes->>'learning_steps')::integer,
    reps           = (v_r.antes->>'reps')::integer,
    lapses         = (v_r.antes->>'lapses')::integer,
    last_review    = (v_r.antes->>'last_review')::timestamptz
  where id = v_r.card_id and user_id = v_user;

  delete from public.card_reviews where id = p_review;
end;
$$;

-- -----------------------------------------------------------------------------
-- salvar_nota (nova versão): texto + links + cartões da nota numa transação.
-- p_cartoes = [{"id": uuid, "frente": text, "verso": text}] (as linhas "pergunta :: resposta").
-- Cria os novos, atualiza frente/verso dos existentes SEM mexer no agendamento, arquiva os que
-- saíram do texto e desarquiva os que voltaram. Todos ficam no baralho da nota (ou no padrão).
-- -----------------------------------------------------------------------------
drop function public.salvar_nota(uuid, text, jsonb, text, uuid[]);

create function public.salvar_nota(
  p_id uuid,
  p_titulo text,
  p_conteudo jsonb,
  p_texto text,
  p_links uuid[],
  p_cartoes jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user    uuid := (select auth.uid());
  v_deck    uuid;
  v_cartoes jsonb := coalesce(p_cartoes, '[]'::jsonb);
begin
  update public.notes
     set title = btrim(p_titulo), content = p_conteudo, plain_text = coalesce(p_texto, '')
   where id = p_id and user_id = v_user
  returning deck_id into v_deck;
  if not found then
    raise exception 'Nota não encontrada' using errcode = 'no_data_found';
  end if;

  delete from public.note_links where from_note = p_id;
  insert into public.note_links (user_id, from_note, to_note)
  select v_user, p_id, destino
  from (select distinct unnest(coalesce(p_links, '{}')) as destino) d
  where destino <> p_id;

  if jsonb_typeof(v_cartoes) <> 'array' then
    raise exception 'Cartões inválidos' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(v_cartoes) > 200 then
    raise exception 'Uma nota pode ter até 200 cartões' using errcode = 'check_violation';
  end if;

  -- Cartões que saíram do texto: arquivados (o histórico fica).
  update public.cards set archived_at = now()
   where note_id = p_id and user_id = v_user and archived_at is null
     and id not in (select (c->>'id')::uuid from jsonb_array_elements(v_cartoes) c);

  if jsonb_array_length(v_cartoes) = 0 then
    return;
  end if;

  -- Baralho da nota; se não tem (ou foi arquivado), o padrão "Geral".
  if v_deck is not null
     and exists (select 1 from public.decks where id = v_deck and archived_at is not null) then
    v_deck := null;
  end if;
  v_deck := coalesce(v_deck, public.baralho_padrao());

  insert into public.cards (id, user_id, deck_id, note_id, front, back)
  select (c->>'id')::uuid, v_user, v_deck, p_id, btrim(c->>'frente'), btrim(c->>'verso')
  from jsonb_array_elements(v_cartoes) c
  on conflict (id) do update
    set front = excluded.front,
        back = excluded.back,
        deck_id = excluded.deck_id,
        archived_at = null
    where public.cards.note_id = p_id and public.cards.user_id = v_user;
end;
$$;

-- -----------------------------------------------------------------------------
-- definir_baralho_da_nota: escolhe o baralho da nota e leva os cartões dela junto.
-- p_deck null = "Geral".
-- -----------------------------------------------------------------------------
create function public.definir_baralho_da_nota(p_nota uuid, p_deck uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  update public.notes set deck_id = p_deck where id = p_nota and user_id = v_user;
  if not found then
    raise exception 'Nota não encontrada' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.cards where note_id = p_nota and archived_at is null) then
    update public.cards set deck_id = coalesce(p_deck, public.baralho_padrao())
     where note_id = p_nota and user_id = v_user and archived_at is null;
  end if;
end;
$$;

revoke all on function public.baralho_padrao() from public, anon;
revoke all on function public.responder_cartao(uuid, uuid, integer, smallint, jsonb, integer) from public, anon;
revoke all on function public.desfazer_resposta(uuid) from public, anon;
revoke all on function public.salvar_nota(uuid, text, jsonb, text, uuid[], jsonb) from public, anon;
revoke all on function public.definir_baralho_da_nota(uuid, uuid) from public, anon;
grant execute on function public.baralho_padrao() to authenticated;
grant execute on function public.responder_cartao(uuid, uuid, integer, smallint, jsonb, integer) to authenticated;
grant execute on function public.desfazer_resposta(uuid) to authenticated;
grant execute on function public.salvar_nota(uuid, text, jsonb, text, uuid[], jsonb) to authenticated;
grant execute on function public.definir_baralho_da_nota(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- v_review_cards: cartões que podem entrar na revisão (ativos, não suspensos, baralho ativo,
-- nota de origem ativa).
-- -----------------------------------------------------------------------------
create view public.v_review_cards
  with (security_invoker = true) as
select c.*
from public.cards c
join public.decks d on d.id = c.deck_id
left join public.notes n on n.id = c.note_id
where c.archived_at is null
  and not c.suspended
  and d.archived_at is null
  and (c.note_id is null or n.archived_at is null);

-- -----------------------------------------------------------------------------
-- v_decks: por baralho ativo, total, novos, para hoje (revisões que vencem até o fim do dia
-- no fuso da pessoa) e atrasados (venceram antes de hoje).
-- -----------------------------------------------------------------------------
create view public.v_decks
  with (security_invoker = true) as
with dia as (
  select
    p.id as user_id,
    (date_trunc('day', now() at time zone p.timezone)) at time zone p.timezone as inicio,
    (date_trunc('day', now() at time zone p.timezone) + interval '1 day') at time zone p.timezone as fim
  from public.profiles p
)
select
  d.id, d.user_id, d.name, d.color, d.track_id, d.is_default, d.created_at, d.updated_at,
  count(c.id)::integer as total,
  (count(c.id) filter (where c.state = 0))::integer as novos,
  (count(c.id) filter (where c.state <> 0 and c.due < dia.fim))::integer as para_hoje,
  (count(c.id) filter (where c.state <> 0 and c.due < dia.inicio))::integer as atrasados
from public.decks d
join dia on dia.user_id = d.user_id
left join public.v_review_cards c on c.deck_id = d.id
where d.archived_at is null
group by d.id, dia.inicio, dia.fim;

revoke all on public.v_review_cards, public.v_decks from anon, authenticated;
grant select on public.v_review_cards, public.v_decks to authenticated;
```

- [ ] **Step 4: Run tests to verify they pass (and the old ones still do)**

Run: `.\node_modules\.bin\vitest.cmd run tests/db`
Expected: PASS. `tests/db/notas.test.ts` chama `salvar_nota` com 5 argumentos — continua funcionando por causa do `default` de `p_cartoes`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261015120000_flashcards.sql tests/db/flashcards.test.ts
git commit -m "feat(flashcards): banco — baralhos, cartões FSRS, histórico, cartões das notas e views"
```

---

### Task 2: Regras puras dos cartões nas notas

**Files:**
- Modify: `features/notes/documento.ts`
- Test: `tests/unit/cartoes-nas-notas.test.ts`

**Interfaces:**
- Produces:
  - `interface SegmentoDeTexto { texto: string; codigo: boolean }`
  - `separarCartao(segmentos: SegmentoDeTexto[]): { frente: string; verso: string } | null`
  - `segmentosDoParagrafo(no: NoDoDocumento): SegmentoDeTexto[]`
  - `interface CartaoDaNota { id: string; frente: string; verso: string }`
  - `extrairCartoes(doc: NoDoDocumento | null | undefined): CartaoDaNota[]`
  - `const ATRIBUTO_DO_CARTAO = "cardId"`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/cartoes-nas-notas.test.ts
import { describe, expect, it } from "vitest";
import {
  extrairCartoes,
  separarCartao,
  type NoDoDocumento,
} from "@/features/notes/documento";

const p = (texto: string, cardId?: string): NoDoDocumento => ({
  type: "paragraph",
  attrs: cardId ? { cardId } : {},
  content: [{ type: "text", text: texto }],
});
const doc = (...content: NoDoDocumento[]): NoDoDocumento => ({ type: "doc", content });

describe("separarCartao", () => {
  it("divide no primeiro :: e apara os lados", () => {
    expect(separarCartao([{ texto: "  O que é JOIN? :: Une tabelas ", codigo: false }])).toEqual({
      frente: "O que é JOIN?",
      verso: "Une tabelas",
    });
  });

  it("verso pode conter :: depois do primeiro", () => {
    expect(separarCartao([{ texto: "a :: b :: c", codigo: false }])).toEqual({
      frente: "a",
      verso: "b :: c",
    });
  });

  it("ignora :: dentro de código inline", () => {
    expect(
      separarCartao([
        { texto: "Use ", codigo: false },
        { texto: "std::vector", codigo: true },
        { texto: " para listas", codigo: false },
      ]),
    ).toBeNull();
  });

  it("código inline pode estar na frente de um cartão de verdade", () => {
    expect(
      separarCartao([
        { texto: "O que faz ", codigo: false },
        { texto: "a::b", codigo: true },
        { texto: "? :: Acessa b", codigo: false },
      ]),
    ).toEqual({ frente: "O que faz a::b?", verso: "Acessa b" });
  });

  it("::: (reservado para ida e volta) não vira cartão nesta versão", () => {
    expect(separarCartao([{ texto: "cão ::: dog", codigo: false }])).toBeNull();
  });

  it("lado vazio ou maior que 2000 não vira cartão", () => {
    expect(separarCartao([{ texto: ":: só verso", codigo: false }])).toBeNull();
    expect(separarCartao([{ texto: "só frente ::   ", codigo: false }])).toBeNull();
    expect(separarCartao([{ texto: `${"x".repeat(2001)} :: v`, codigo: false }])).toBeNull();
  });
});

describe("extrairCartoes", () => {
  it("acha parágrafos com id, inclusive dentro de listas", () => {
    const d = doc(
      p("Texto comum"),
      p("Pergunta 1 :: Resposta 1", "c1"),
      {
        type: "bulletList",
        content: [{ type: "listItem", content: [p("P2 :: R2", "c2")] }],
      },
    );
    expect(extrairCartoes(d)).toEqual([
      { id: "c1", frente: "Pergunta 1", verso: "Resposta 1" },
      { id: "c2", frente: "P2", verso: "R2" },
    ]);
  });

  it("parágrafo-cartão sem id ainda não entra (o editor dá o id antes de salvar)", () => {
    expect(extrairCartoes(doc(p("P :: R")))).toEqual([]);
  });

  it("id repetido (parágrafo colado) entra uma vez só", () => {
    expect(extrairCartoes(doc(p("A :: 1", "x"), p("B :: 2", "x")))).toEqual([
      { id: "x", frente: "A", verso: "1" },
    ]);
  });

  it("bloco de código nunca vira cartão", () => {
    const bloco: NoDoDocumento = {
      type: "codeBlock",
      content: [{ type: "text", text: "a :: b" }],
    };
    expect(extrairCartoes(doc(bloco))).toEqual([]);
  });

  it("quebra de linha vira \\n no texto do cartão", () => {
    const comQuebra: NoDoDocumento = {
      type: "paragraph",
      attrs: { cardId: "q" },
      content: [
        { type: "text", text: "Linha 1" },
        { type: "hardBreak" },
        { type: "text", text: "linha 2 :: R" },
      ],
    };
    expect(extrairCartoes(doc(comQuebra))).toEqual([{ id: "q", frente: "Linha 1\nlinha 2", verso: "R" }]);
  });

  it("código inline marcado no documento é respeitado", () => {
    const comCodigo: NoDoDocumento = {
      type: "paragraph",
      attrs: { cardId: "k" },
      content: [{ type: "text", text: "std::vector", marks: [{ type: "code" }] } as NoDoDocumento],
    };
    expect(extrairCartoes(doc(comCodigo))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.\node_modules\.bin\vitest.cmd run tests/unit/cartoes-nas-notas.test.ts`
Expected: FAIL (`separarCartao is not a function`).

- [ ] **Step 3: Implement in `features/notes/documento.ts`**

Adicionar `marks?: { type: string }[]` em `NoDoDocumento` e, no fim do arquivo:

```ts
// ---------------------------------------------------------------------------
// Cartões dentro das notas (sintaxe do Obsidian: "pergunta :: resposta")
// ---------------------------------------------------------------------------

/** Atributo invisível do parágrafo que guarda o id do cartão (identidade estável). */
export const ATRIBUTO_DO_CARTAO = "cardId";

/** Pedaço de texto de um parágrafo; `codigo` = está dentro de `código inline`. */
export interface SegmentoDeTexto {
  texto: string;
  codigo: boolean;
}

export interface CartaoDaNota {
  id: string;
  frente: string;
  verso: string;
}

const MAX_LADO = 2000;

/**
 * Decide se um parágrafo é um cartão e separa frente/verso.
 * Regras: o primeiro "::" FORA de código inline divide; ":::" (ida e volta, versão futura)
 * não vira cartão; os dois lados aparados precisam ter de 1 a 2000 caracteres.
 */
export function separarCartao(segmentos: SegmentoDeTexto[]): { frente: string; verso: string } | null {
  const texto = segmentos.map((s) => s.texto).join("");
  // Máscara: o mesmo texto, mas com o código inline trocado por espaços (o "::" de
  // `std::vector` não conta), mantendo as posições iguais às do texto original.
  const mascara = segmentos.map((s) => (s.codigo ? " ".repeat(s.texto.length) : s.texto)).join("");
  if (mascara.includes(":::")) return null;
  const i = mascara.indexOf("::");
  if (i < 0) return null;
  const frente = texto.slice(0, i).trim();
  const verso = texto.slice(i + 2).trim();
  if (!frente || !verso || frente.length > MAX_LADO || verso.length > MAX_LADO) return null;
  return { frente, verso };
}

/** Texto de um parágrafo do documento em segmentos (quebra de linha vira "\n"). */
export function segmentosDoParagrafo(no: NoDoDocumento): SegmentoDeTexto[] {
  return (no.content ?? []).map((filho) => {
    if (filho.type === "hardBreak") return { texto: "\n", codigo: false };
    return {
      texto: filho.text ?? "",
      codigo: (filho.marks ?? []).some((m) => m.type === "code"),
    };
  });
}

/**
 * Todos os cartões da nota, na ordem do texto. Só entram parágrafos que já têm id (o editor
 * dá o id assim que a linha vira cartão) e cada id entra uma vez só.
 */
export function extrairCartoes(doc: NoDoDocumento | null | undefined): CartaoDaNota[] {
  const cartoes: CartaoDaNota[] = [];
  const vistos = new Set<string>();
  const visitar = (no: NoDoDocumento) => {
    if (no.type === "codeBlock") return;
    if (no.type === "paragraph") {
      const id = no.attrs?.[ATRIBUTO_DO_CARTAO];
      const lados = separarCartao(segmentosDoParagrafo(no));
      if (lados && typeof id === "string" && id && !vistos.has(id)) {
        vistos.add(id);
        cartoes.push({ id, ...lados });
      }
      return;
    }
    no.content?.forEach(visitar);
  };
  if (doc) visitar(doc);
  return cartoes;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.\node_modules\.bin\vitest.cmd run tests/unit/cartoes-nas-notas.test.ts tests/unit/documento-notas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/notes/documento.ts tests/unit/cartoes-nas-notas.test.ts
git commit -m "feat(notas): regras puras dos cartões dentro das notas (sintaxe ::)"
```

---

### Task 3: Agendador (ts-fsrs) e regras da fila

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (via workflow)
- Create: `features/flashcards/agendador.ts`, `features/flashcards/fila.ts`
- Test: `tests/unit/agendador-flashcards.test.ts`, `tests/unit/fila-flashcards.test.ts`

**Interfaces:**
- Produces (`agendador.ts`):
  - `type Avaliacao = 1 | 2 | 3 | 4` (Errei, Difícil, Bom, Fácil)
  - `const AVALIACOES: readonly { valor: Avaliacao; rotulo: string; tom: "danger" | "warning" | "accent" | "success" }[]`
  - `interface EstadoDoCartao { state: 0|1|2|3; due: string; stability: number; difficulty: number; elapsed_days: number; scheduled_days: number; learning_steps: number; reps: number; lapses: number; last_review: string | null }`
  - `estadoNovo(agora: Date): EstadoDoCartao`
  - `previa(estado: EstadoDoCartao, agora: Date): Record<Avaliacao, { estado: EstadoDoCartao; intervalo: string }>`
  - `responder(estado: EstadoDoCartao, avaliacao: Avaliacao, agora: Date): EstadoDoCartao`
  - `rotuloDoIntervalo(de: Date, ate: Date): string`
- Produces (`fila.ts`):
  - `inicioDoDiaNoFuso(fuso: string, agora: Date): Date`
  - `interface CartaoDaFila { id: string; frente: string; verso: string; deckId: string; noteId: string | null; estado: EstadoDoCartao }`
  - `const LIMITE_DE_ATRASADOS = 50; const ANTECIPACAO_MS = 20 * 60_000`
  - `montarFila(e: { revisoes: CartaoDaFila[]; novos: CartaoDaFila[]; agora: Date; inicioDoDia: Date; novosJaHoje: number; limiteDeNovos: number }): { fila: CartaoDaFila[]; atrasados: number; novosPausados: boolean }`
  - `proximoDaFila(fila: CartaoDaFila[], agora: Date): CartaoDaFila | null`
  - `reinserir(fila: CartaoDaFila[], cartao: CartaoDaFila, agora: Date): CartaoDaFila[]`
  - `trechosDeEstudo(momentos: Date[], pausaMaximaMs?: number, minimoMs?: number): { inicio: Date; fim: Date }[]`

- [ ] **Step 1: Instalar ts-fsrs pelo workflow**

```bash
git push -u origin feat/flashcards
gh workflow run dependencias.yml --ref feat/flashcards -f pacotes="ts-fsrs@5.4.2" -f dev=false
gh run watch "$(gh run list --workflow=dependencias.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
git pull
```
Depois copiar o pacote para o `node_modules` local (pnpm bloqueado):
```powershell
$tmp = Join-Path $env:TEMP "fsrs-$(Get-Random)"; New-Item -ItemType Directory $tmp | Out-Null
npm install --prefix $tmp ts-fsrs@5.4.2 --no-save --ignore-scripts
Copy-Item -Recurse -LiteralPath (Join-Path $tmp "node_modules\ts-fsrs") -Destination "C:\dev\athenas\node_modules\ts-fsrs"
```
Expected: `package.json` com `"ts-fsrs": "5.4.2"` e `node_modules/ts-fsrs/package.json` versão 5.4.2.

- [ ] **Step 2: Write the failing tests**

```ts
// tests/unit/agendador-flashcards.test.ts
import { describe, expect, it } from "vitest";
import { estadoNovo, previa, responder, rotuloDoIntervalo } from "@/features/flashcards/agendador";

const agora = new Date("2026-10-12T12:00:00Z");

describe("agendador FSRS", () => {
  it("cartão novo: estado 0, vence agora, sem revisões", () => {
    expect(estadoNovo(agora)).toMatchObject({ state: 0, reps: 0, lapses: 0, last_review: null, due: agora.toISOString() });
  });

  it("prévia dá intervalos crescentes de Errei a Fácil", () => {
    const p = previa(estadoNovo(agora), agora);
    const due = (n: 1 | 2 | 3 | 4) => Date.parse(p[n].estado.due);
    expect(due(1)).toBeLessThanOrEqual(due(2));
    expect(due(2)).toBeLessThanOrEqual(due(3));
    expect(due(3)).toBeLessThan(due(4));
    expect(p[1].intervalo).toMatch(/min$/);
  });

  it("responder é igual à prévia (o botão mostra o que vai acontecer)", () => {
    const e = estadoNovo(agora);
    expect(responder(e, 3, agora)).toEqual(previa(e, agora)[3].estado);
  });

  it("responder sobe reps em 1 e grava last_review", () => {
    const depois = responder(estadoNovo(agora), 3, agora);
    expect(depois.reps).toBe(1);
    expect(depois.last_review).toBe(agora.toISOString());
  });

  it("ida e volta com o formato do banco (strings ISO) não perde nada", () => {
    const um = responder(estadoNovo(agora), 4, agora);
    const dias = new Date(Date.parse(um.due) + 60_000);
    const dois = responder(JSON.parse(JSON.stringify(um)), 3, dias);
    expect(dois.reps).toBe(2);
    expect(dois.state).toBe(2);
  });

  it("rótulos curtos dos intervalos", () => {
    const m = (ms: number) => rotuloDoIntervalo(agora, new Date(agora.getTime() + ms));
    expect(m(30_000)).toBe("<1 min");
    expect(m(10 * 60_000)).toBe("10 min");
    expect(m(3 * 3_600_000)).toBe("3 h");
    expect(m(4 * 86_400_000)).toBe("4 d");
    expect(m(45 * 86_400_000)).toBe("1,5 m");
    expect(m(400 * 86_400_000)).toBe("1,1 a");
  });
});
```

```ts
// tests/unit/fila-flashcards.test.ts
import { describe, expect, it } from "vitest";
import { estadoNovo, type EstadoDoCartao } from "@/features/flashcards/agendador";
import {
  inicioDoDiaNoFuso,
  montarFila,
  proximoDaFila,
  reinserir,
  trechosDeEstudo,
  type CartaoDaFila,
} from "@/features/flashcards/fila";

const agora = new Date("2026-10-12T15:00:00Z"); // 12:00 em São Paulo
const inicioDoDia = new Date("2026-10-12T03:00:00Z");

function c(id: string, estado: Partial<EstadoDoCartao> = {}): CartaoDaFila {
  return { id, frente: id, verso: "v", deckId: "d", noteId: null, estado: { ...estadoNovo(agora), ...estado } };
}
const min = (n: number) => new Date(agora.getTime() + n * 60_000).toISOString();

describe("inicioDoDiaNoFuso", () => {
  it("meia-noite de São Paulo em UTC", () => {
    expect(inicioDoDiaNoFuso("America/Sao_Paulo", agora).toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });
  it("23h30 em São Paulo ainda é o mesmo dia (02h30 UTC do dia seguinte)", () => {
    expect(inicioDoDiaNoFuso("America/Sao_Paulo", new Date("2026-10-13T02:30:00Z")).toISOString()).toBe(
      "2026-10-12T03:00:00.000Z",
    );
  });
  it("fuso inválido cai em São Paulo", () => {
    expect(inicioDoDiaNoFuso("Lugar/Nenhum", agora).toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });
});

describe("montarFila", () => {
  it("ordem: aprendendo vencidos → revisões → novos até o limite", () => {
    const r = montarFila({
      revisoes: [c("rev", { state: 2, due: min(-60) }), c("apr", { state: 1, due: min(-1) })],
      novos: [c("n1"), c("n2"), c("n3")],
      agora,
      inicioDoDia,
      novosJaHoje: 8,
      limiteDeNovos: 10,
    });
    expect(r.fila.map((x) => x.id)).toEqual(["apr", "rev", "n1", "n2"]);
    expect(r.novosPausados).toBe(false);
  });

  it("aprendizagem que vence em até 20 min entra; depois disso, não", () => {
    const r = montarFila({
      revisoes: [c("logo", { state: 1, due: min(15) }), c("tarde", { state: 3, due: min(40) })],
      novos: [],
      agora,
      inicioDoDia,
      novosJaHoje: 0,
      limiteDeNovos: 10,
    });
    expect(r.fila.map((x) => x.id)).toEqual(["logo"]);
  });

  it("mais de 50 atrasados pausa os novos", () => {
    const atrasados = Array.from({ length: 51 }, (_, i) => c(`a${i}`, { state: 2, due: "2026-10-01T12:00:00Z" }));
    const r = montarFila({ revisoes: atrasados, novos: [c("n")], agora, inicioDoDia, novosJaHoje: 0, limiteDeNovos: 10 });
    expect(r.atrasados).toBe(51);
    expect(r.novosPausados).toBe(true);
    expect(r.fila.some((x) => x.id === "n")).toBe(false);
  });

  it("limite zero ou já atingido: nenhum novo", () => {
    const r = montarFila({ revisoes: [], novos: [c("n")], agora, inicioDoDia, novosJaHoje: 10, limiteDeNovos: 10 });
    expect(r.fila).toEqual([]);
  });
});

describe("proximoDaFila e reinserir", () => {
  it("pega o primeiro vencido; se nenhum venceu, antecipa o que vence em até 20 min", () => {
    expect(proximoDaFila([c("a", { state: 1, due: min(5) })], agora)?.id).toBe("a");
    expect(proximoDaFila([c("b", { state: 1, due: min(30) })], agora)).toBeNull();
    expect(proximoDaFila([], agora)).toBeNull();
  });

  it("cartão em aprendizagem volta para a fila na posição do vencimento", () => {
    const fila = [c("x", { state: 2, due: min(-5) }), c("y")];
    const voltou = c("apr", { state: 1, due: min(10) });
    expect(reinserir(fila, voltou, agora).map((x) => x.id)).toEqual(["x", "y", "apr"]);
  });

  it("cartão que só vence daqui a dias não volta", () => {
    const fila = [c("x")];
    expect(reinserir(fila, c("rev", { state: 2, due: min(60 * 24 * 3) }), agora).map((x) => x.id)).toEqual(["x"]);
  });
});

describe("trechosDeEstudo", () => {
  const t = (minutos: number) => new Date(agora.getTime() + minutos * 60_000);
  it("um trecho contínuo", () => {
    expect(trechosDeEstudo([t(0), t(1), t(3), t(4)])).toEqual([{ inicio: t(0), fim: t(4) }]);
  });
  it("pausa de mais de 5 min corta; trecho com menos de 1 min é descartado", () => {
    expect(trechosDeEstudo([t(0), t(2), t(10), t(10.5), t(30), t(33)])).toEqual([
      { inicio: t(0), fim: t(2) },
      { inicio: t(30), fim: t(33) },
    ]);
  });
  it("vazio ou um momento só: nada", () => {
    expect(trechosDeEstudo([])).toEqual([]);
    expect(trechosDeEstudo([t(0)])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `.\node_modules\.bin\vitest.cmd run tests/unit/agendador-flashcards.test.ts tests/unit/fila-flashcards.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 4: Implement `features/flashcards/agendador.ts`**

```ts
import { fsrs, generatorParameters, type Card, type Grade } from "ts-fsrs";

/**
 * Ponte entre o Athenas e a biblioteca ts-fsrs (algoritmo FSRS, o mesmo do Anki atual).
 * Só este arquivo conhece a biblioteca: trocar de versão ou de parâmetros mexe só aqui.
 *
 * O banco guarda o estado em colunas com os mesmos nomes da biblioteca, mas com datas em
 * texto ISO (é o que chega pela API). Aqui convertemos nos dois sentidos.
 */

/** 1 Errei · 2 Difícil · 3 Bom · 4 Fácil (mesma numeração do FSRS). */
export type Avaliacao = 1 | 2 | 3 | 4;

export const AVALIACOES = [
  { valor: 1, rotulo: "Errei", tom: "danger" },
  { valor: 2, rotulo: "Difícil", tom: "warning" },
  { valor: 3, rotulo: "Bom", tom: "accent" },
  { valor: 4, rotulo: "Fácil", tom: "success" },
] as const satisfies readonly { valor: Avaliacao; rotulo: string; tom: string }[];

export interface EstadoDoCartao {
  state: 0 | 1 | 2 | 3;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: string | null;
}

// Retenção desejada de 90% (recomendação do manual do Anki); intervalo máximo de 100 anos;
// "fuzz" espalha um pouco as datas para os cartões não vencerem todos no mesmo dia.
const agendador = fsrs(
  generatorParameters({ request_retention: 0.9, maximum_interval: 36500, enable_fuzz: true }),
);

function paraCard(e: EstadoDoCartao): Card {
  return {
    due: new Date(e.due),
    stability: e.stability,
    difficulty: e.difficulty,
    elapsed_days: e.elapsed_days,
    scheduled_days: e.scheduled_days,
    learning_steps: e.learning_steps,
    reps: e.reps,
    lapses: e.lapses,
    state: e.state,
    last_review: e.last_review ? new Date(e.last_review) : undefined,
  };
}

function deCard(c: Card): EstadoDoCartao {
  return {
    state: c.state as EstadoDoCartao["state"],
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    last_review: c.last_review ? c.last_review.toISOString() : null,
  };
}

/** Estado de um cartão que nunca foi revisado (vence agora). */
export function estadoNovo(agora: Date): EstadoDoCartao {
  return {
    state: 0,
    due: agora.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
  };
}

/** O que cada botão faria agora (para mostrar "10 min · 1 d · 4 d" nos botões). */
export function previa(
  estado: EstadoDoCartao,
  agora: Date,
): Record<Avaliacao, { estado: EstadoDoCartao; intervalo: string }> {
  const resultado = {} as Record<Avaliacao, { estado: EstadoDoCartao; intervalo: string }>;
  for (const { valor } of AVALIACOES) {
    const { card } = agendador.next(paraCard(estado), agora, valor as Grade);
    resultado[valor] = { estado: deCard(card), intervalo: rotuloDoIntervalo(agora, card.due) };
  }
  return resultado;
}

/** Novo estado depois da resposta. */
export function responder(estado: EstadoDoCartao, avaliacao: Avaliacao, agora: Date): EstadoDoCartao {
  return deCard(agendador.next(paraCard(estado), agora, avaliacao as Grade).card);
}

const UMA_CASA = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** "<1 min", "10 min", "3 h", "4 d", "1,5 m", "1,1 a". */
export function rotuloDoIntervalo(de: Date, ate: Date): string {
  const minutos = (ate.getTime() - de.getTime()) / 60_000;
  if (minutos < 1) return "<1 min";
  if (minutos < 60) return `${Math.round(minutos)} min`;
  const horas = minutos / 60;
  if (horas < 24) return `${Math.round(horas)} h`;
  const dias = horas / 24;
  if (dias < 30) return `${Math.round(dias)} d`;
  if (dias < 365) return `${UMA_CASA.format(dias / 30)} m`;
  return `${UMA_CASA.format(dias / 365)} a`;
}
```

Observação para quem implementa: na ts-fsrs 5, `next(card, agora, grade)` é determinístico para o mesmo cartão e a mesma data (o "fuzz" usa uma semente derivada do cartão), por isso `previa` e `responder` coincidem. Se o teste "responder é igual à prévia" falhar, conferir a documentação da 5.4.2 (`node_modules/ts-fsrs/README.md`) e ajustar a conversão — não desligar o fuzz sem falar com o Renan.

- [ ] **Step 5: Implement `features/flashcards/fila.ts`**

```ts
import type { EstadoDoCartao } from "./agendador";

/**
 * Regras da sessão de revisão (puras, sem banco e sem tela):
 *  - o "hoje" é o da pessoa (fuso do perfil), igual ao Foco;
 *  - ordem: cartões em aprendizagem vencidos → revisões de hoje → novos até o limite do dia;
 *  - com muitos atrasados (> 50), os novos ficam pausados: primeiro pôr em dia;
 *  - aprendizagem que vence em até 20 min pode ser antecipada (como no Anki).
 */

export interface CartaoDaFila {
  id: string;
  frente: string;
  verso: string;
  deckId: string;
  noteId: string | null;
  estado: EstadoDoCartao;
}

export const LIMITE_DE_ATRASADOS = 50;
export const ANTECIPACAO_MS = 20 * 60_000;
const FUSO_PADRAO = "America/Sao_Paulo";

/** Instante (UTC) da meia-noite de hoje no fuso informado. */
export function inicioDoDiaNoFuso(fuso: string, agora: Date): Date {
  const calcular = (tz: string) => {
    const partes = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(agora)
        .map((p) => [p.type, p.value]),
    );
    // Diferença entre o relógio local e o UTC neste instante = deslocamento do fuso.
    const localComoUtc = Date.UTC(
      Number(partes.year), Number(partes.month) - 1, Number(partes.day),
      Number(partes.hour), Number(partes.minute), Number(partes.second),
    );
    const deslocamento = localComoUtc - Math.floor(agora.getTime() / 1000) * 1000;
    const meiaNoiteLocalComoUtc = Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day));
    return new Date(meiaNoiteLocalComoUtc - deslocamento);
  };
  try {
    return calcular(fuso);
  } catch {
    return calcular(FUSO_PADRAO);
  }
}

const venc = (c: CartaoDaFila) => Date.parse(c.estado.due);
const porVencimento = (a: CartaoDaFila, b: CartaoDaFila) => venc(a) - venc(b);
const emAprendizagem = (c: CartaoDaFila) => c.estado.state === 1 || c.estado.state === 3;

export function montarFila(e: {
  revisoes: CartaoDaFila[];
  novos: CartaoDaFila[];
  agora: Date;
  inicioDoDia: Date;
  novosJaHoje: number;
  limiteDeNovos: number;
}): { fila: CartaoDaFila[]; atrasados: number; novosPausados: boolean } {
  const agora = e.agora.getTime();
  const fimDoDia = e.inicioDoDia.getTime() + 86_400_000;

  const aprendendo = e.revisoes
    .filter((c) => emAprendizagem(c) && venc(c) <= agora + ANTECIPACAO_MS)
    .sort(porVencimento);
  const revisoes = e.revisoes
    .filter((c) => c.estado.state === 2 && venc(c) < fimDoDia)
    .sort(porVencimento);
  const atrasados = revisoes.filter((c) => venc(c) < e.inicioDoDia.getTime()).length;
  const novosPausados = atrasados > LIMITE_DE_ATRASADOS;
  const vagas = novosPausados ? 0 : Math.max(0, e.limiteDeNovos - e.novosJaHoje);

  return {
    fila: [...aprendendo, ...revisoes, ...e.novos.slice(0, vagas)],
    atrasados,
    novosPausados,
  };
}

/** Próximo cartão a mostrar: o primeiro já vencido, ou um que vence em até 20 min. */
export function proximoDaFila(fila: CartaoDaFila[], agora: Date): CartaoDaFila | null {
  const limite = agora.getTime() + ANTECIPACAO_MS;
  return fila.find((c) => c.estado.state === 0 || venc(c) <= limite) ?? null;
}

/**
 * Depois de responder: se o cartão continua em aprendizagem e vence em até 20 min, volta para
 * a fila na posição do vencimento (atrás de quem vence antes). Senão, sai da sessão.
 */
export function reinserir(fila: CartaoDaFila[], cartao: CartaoDaFila, agora: Date): CartaoDaFila[] {
  const semEle = fila.filter((c) => c.id !== cartao.id);
  if (!emAprendizagem(cartao) || venc(cartao) > agora.getTime() + ANTECIPACAO_MS) return semEle;
  const i = semEle.findIndex((c) => c.estado.state !== 0 && venc(c) > venc(cartao));
  const pos = i < 0 ? semEle.length : i;
  return [...semEle.slice(0, pos), cartao, ...semEle.slice(pos)];
}

/**
 * Tempo de estudo da sessão em trechos: momentos = início da sessão + cada resposta.
 * Uma pausa maior que 5 min corta o trecho; trechos com menos de 1 min não contam.
 */
export function trechosDeEstudo(
  momentos: Date[],
  pausaMaximaMs = 5 * 60_000,
  minimoMs = 60_000,
): { inicio: Date; fim: Date }[] {
  const ordenados = [...momentos].sort((a, b) => a.getTime() - b.getTime());
  const trechos: { inicio: Date; fim: Date }[] = [];
  let atual: { inicio: Date; fim: Date } | null = null;
  for (const m of ordenados) {
    if (atual && m.getTime() - atual.fim.getTime() <= pausaMaximaMs) {
      atual.fim = m;
    } else {
      if (atual) trechos.push(atual);
      atual = { inicio: m, fim: m };
    }
  }
  if (atual) trechos.push(atual);
  return trechos.filter((t) => t.fim.getTime() - t.inicio.getTime() >= minimoMs);
}
```

Nota: no teste "ordem", a fila vem `["apr", "rev", "n1", "n2"]` porque `novosJaHoje = 8` e o limite é 10 (sobram 2 vagas).

- [ ] **Step 6: Run tests to verify they pass**

Run: `.\node_modules\.bin\vitest.cmd run tests/unit/agendador-flashcards.test.ts tests/unit/fila-flashcards.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add features/flashcards/agendador.ts features/flashcards/fila.ts tests/unit/agendador-flashcards.test.ts tests/unit/fila-flashcards.test.ts
git commit -m "feat(flashcards): agendador FSRS (ts-fsrs) e regras puras da fila e do tempo de estudo"
```

---

### Task 4: Editor — cartões dentro das notas

**Files:**
- Create: `features/notes/components/cartoes-na-nota.ts`, `features/notes/components/baralho-da-nota.tsx`
- Modify: `features/notes/components/editor-de-nota.tsx`, `features/notes/components/nota-view.tsx`, `features/notes/queries.ts`, `app/globals.css`
- Test: `tests/unit/cartoes-nas-notas.test.ts` (acrescentar), e2e na Task 9

**Interfaces:**
- Consumes: `separarCartao`, `segmentosDoParagrafo`, `extrairCartoes`, `ATRIBUTO_DO_CARTAO` (Task 2); `salvar_nota(..., p_cartoes)` e `definir_baralho_da_nota` (Task 1); `useBaralhos()` (Task 5 — esta task cria só o que a pílula precisa e a Task 5 completa os hooks; ver Step 5).
- Produces:
  - `CartoesNaNota` (extensão Tiptap) e a função pura `garantirIdsDeCartao(paragrafos: { pos: number; id: string | null; ehCartao: boolean }[], novoId: () => string): { pos: number; id: string }[]` (lista de mudanças).
  - `NotaParaSalvar.cartoes: CartaoDaNota[]`; `Nota.baralhoId: string | null`.
  - `useDefinirBaralhoDaNota()` em `features/notes/queries.ts`.

- [ ] **Step 1: Write the failing test (função pura dos ids)**

Acrescentar em `tests/unit/cartoes-nas-notas.test.ts`:

```ts
import { garantirIdsDeCartao } from "@/features/notes/components/cartoes-na-nota";

describe("garantirIdsDeCartao", () => {
  let n = 0;
  const novoId = () => `novo-${++n}`;

  it("dá id a cartão sem id e troca id repetido (parágrafo colado)", () => {
    n = 0;
    expect(
      garantirIdsDeCartao(
        [
          { pos: 0, id: null, ehCartao: true },
          { pos: 10, id: "a", ehCartao: true },
          { pos: 20, id: "a", ehCartao: true },
          { pos: 30, id: null, ehCartao: false },
        ],
        novoId,
      ),
    ).toEqual([
      { pos: 0, id: "novo-1" },
      { pos: 20, id: "novo-2" },
    ]);
  });

  it("parágrafo comum com id antigo mantém o id (se voltar a ser cartão, recupera o histórico)", () => {
    expect(garantirIdsDeCartao([{ pos: 0, id: "velho", ehCartao: false }], novoId)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `.\node_modules\.bin\vitest.cmd run tests/unit/cartoes-nas-notas.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement `features/notes/components/cartoes-na-nota.ts`**

```ts
import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as NoProseMirror } from "@tiptap/pm/model";
import { ATRIBUTO_DO_CARTAO, separarCartao, type SegmentoDeTexto } from "../documento";

/**
 * Cartões dentro das notas:
 *  - todo parágrafo ganha o atributo invisível `cardId` (vai para o JSON salvo);
 *  - quando um parágrafo vira cartão ("pergunta :: resposta"), recebe um id novo — e quem colou
 *    um parágrafo repetido ganha outro id (dois cartões nunca dividem o mesmo id);
 *  - parágrafos-cartão ganham um leve destaque (decoração: não muda o texto).
 */

/** Regra pura: quais parágrafos precisam de id novo. */
export function garantirIdsDeCartao(
  paragrafos: { pos: number; id: string | null; ehCartao: boolean }[],
  novoId: () => string,
): { pos: number; id: string }[] {
  const vistos = new Set<string>();
  const mudancas: { pos: number; id: string }[] = [];
  for (const p of paragrafos) {
    if (!p.ehCartao) {
      if (p.id) vistos.add(p.id);
      continue;
    }
    if (!p.id || vistos.has(p.id)) {
      const id = novoId();
      vistos.add(id);
      mudancas.push({ pos: p.pos, id });
    } else {
      vistos.add(p.id);
    }
  }
  return mudancas;
}

function segmentos(no: NoProseMirror): SegmentoDeTexto[] {
  const lista: SegmentoDeTexto[] = [];
  no.forEach((filho) => {
    if (filho.type.name === "hardBreak") lista.push({ texto: "\n", codigo: false });
    else if (filho.isText)
      lista.push({ texto: filho.text ?? "", codigo: filho.marks.some((m) => m.type.name === "code") });
  });
  return lista;
}

function paragrafosDoDoc(doc: NoProseMirror) {
  const lista: { pos: number; id: string | null; ehCartao: boolean; tamanho: number }[] = [];
  doc.descendants((no, pos) => {
    if (no.type.name === "codeBlock") return false;
    if (no.type.name !== "paragraph") return true;
    const id = no.attrs[ATRIBUTO_DO_CARTAO] as string | null;
    lista.push({ pos, id, ehCartao: separarCartao(segmentos(no)) !== null, tamanho: no.nodeSize });
    return false;
  });
  return lista;
}

const chave = new PluginKey("cartoesNaNota");

export const CartoesNaNota = Extension.create({
  name: "cartoesNaNota",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          [ATRIBUTO_DO_CARTAO]: {
            default: null,
            keepOnSplit: false, // Enter no meio do cartão: a linha nova NÃO herda o id
            parseHTML: (el) => el.getAttribute("data-card-id"),
            renderHTML: (attrs) =>
              attrs[ATRIBUTO_DO_CARTAO] ? { "data-card-id": attrs[ATRIBUTO_DO_CARTAO] } : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: chave,
        appendTransaction: (transacoes, _antes, estado) => {
          if (!transacoes.some((t) => t.docChanged)) return null;
          const mudancas = garantirIdsDeCartao(paragrafosDoDoc(estado.doc), () => crypto.randomUUID());
          if (mudancas.length === 0) return null;
          const tr = estado.tr;
          for (const m of mudancas) tr.setNodeAttribute(m.pos, ATRIBUTO_DO_CARTAO, m.id);
          return tr.setMeta("addToHistory", false);
        },
        props: {
          decorations: (estado) =>
            DecorationSet.create(
              estado.doc,
              paragrafosDoDoc(estado.doc)
                .filter((p) => p.ehCartao)
                .map((p) => Decoration.node(p.pos, p.pos + p.tamanho, { class: "cartao-na-nota" })),
            ),
        },
      }),
    ];
  },
});
```

Também passar a disparar o `appendTransaction` na abertura: no `useEditor` de `editor-de-nota.tsx`, acrescentar `CartoesNaNota` em `extensoes` (depois de `ComandosDeBloco`). Documentos antigos sem id ganham o id na primeira edição (o `extrairCartoes` ignora parágrafos sem id, então nada se perde).

Conferir que `@tiptap/pm` exporta `state`, `view` e `model` (já é dependência direta: `"@tiptap/pm": "3.31.3"`).

- [ ] **Step 4: CSS do destaque (em `app/globals.css`, junto de `.nota-prosa`)**

```css
/* Parágrafo que virou flashcard ("pergunta :: resposta"): barra de acento à esquerda e um
   ícone discreto. Decoração do editor: o texto salvo não muda. */
.nota-prosa p.cartao-na-nota {
  position: relative;
  padding-left: 0.75rem;
  border-left: 2px solid color-mix(in srgb, var(--accent) 70%, transparent);
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  border-radius: 0 0.5rem 0.5rem 0;
}
```

- [ ] **Step 5: Queries da nota (`features/notes/queries.ts`)**

1. `useNota`: selecionar também `deck_id` e devolver `baralhoId: data.deck_id`; acrescentar `baralhoId: string | null` em `Nota`.
2. `NotaParaSalvar` ganha `cartoes: CartaoDaNota[]` (importar de `./documento`); a `mutationFn` passa `p_cartoes: n.cartoes as unknown as Json`.
3. Mensagem de erro de limite em `onError` do `useSalvarNota`:

```ts
const msg = (erro as { message?: string } | null)?.message ?? "";
toast.error(
  ehTituloRepetido(erro)
    ? "Já existe uma nota com esse título. Escolha outro."
    : /200 cartões/.test(msg)
      ? "Uma nota pode ter até 200 cartões. Seu texto continua aqui; remova algumas linhas com ::."
      : /5\.000 cartões/.test(msg)
        ? "Você chegou ao limite de 5.000 cartões. Arquive alguns para criar novos."
        : "Não deu pra salvar a nota. Suas mudanças continuam aqui; tente de novo.",
  { id: "salvar-nota" },
);
```

4. `onSuccess` também invalida `chaves.flashcards` (definida na Task 5; nesta task, acrescentar já em `lib/chaves-de-consulta.ts`: `flashcards: ["flashcards"] as const`).
5. Novo hook:

```ts
/** Escolhe o baralho dos cartões da nota (null = "Geral"); os cartões existentes vão junto. */
export function useDefinirBaralhoDaNota(notaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deckId: string | null) => {
      const { error } = await criarClienteNavegador().rpc("definir_baralho_da_nota", {
        p_nota: notaId,
        p_deck: deckId,
      });
      if (error) throw error;
    },
    onMutate: (deckId) => {
      queryClient.setQueryData<Nota | null>(chaves.nota(notaId), (n) => (n ? { ...n, baralhoId: deckId } : n));
    },
    onError: () => toast.error("Não deu pra trocar o baralho. Tente de novo.", { id: "baralho-da-nota" }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.nota(notaId) });
      void queryClient.invalidateQueries({ queryKey: chaves.flashcards });
    },
  });
}
```

6. Atualizar `lib/database.types.ts` à mão (até gerar de novo depois da migration aplicada): `notes.deck_id` (Row `string | null`, Insert/Update opcional); `salvar_nota.Args.p_cartoes?: Json`; `definir_baralho_da_nota: { Args: { p_nota: string; p_deck: string | null }; Returns: undefined }`. As demais tabelas/funções entram na Task 5.

- [ ] **Step 6: `nota-view.tsx` — enviar os cartões e mostrar a pílula**

Em `salvarAgora`, acrescentar `cartoes: extrairCartoes(dados.doc)` no objeto do `salvarNota`. Guardar a contagem atual para a pílula:

```ts
const [qtdCartoes, setQtdCartoes] = useState(() => extrairCartoes(nota.conteudo).length);
// dentro de aoMudar do EditorDeNota, depois de editorRef.current = ed:
setQtdCartoes(extrairCartoes(ed.getJSON() as NoDoDocumento).length);
```

Renderizar, logo abaixo do título (fora do `<header>`): `<BaralhoDaNota notaId={nota.id} baralhoId={nota.baralhoId} quantidade={qtdCartoes} />` — só quando `qtdCartoes > 0 || nota.baralhoId`.

- [ ] **Step 7: `features/notes/components/baralho-da-nota.tsx`**

```tsx
"use client";

import { Layers } from "lucide-react";
import { useState } from "react";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { useBaralhos } from "@/features/flashcards/queries";
import { varDaCor } from "@/features/boards/cores";
import { useDefinirBaralhoDaNota } from "../queries";

/**
 * Pílula "3 cartões · Baralho SQL" no topo da nota. Tocar abre a lista de baralhos para
 * escolher onde os cartões desta nota ficam ("Geral" quando nenhum foi escolhido).
 */
export function BaralhoDaNota({
  notaId,
  baralhoId,
  quantidade,
}: {
  notaId: string;
  baralhoId: string | null;
  quantidade: number;
}) {
  const [aberta, setAberta] = useState(false);
  const { data: baralhos = [] } = useBaralhos();
  const definir = useDefinirBaralhoDaNota(notaId);
  const atual = baralhos.find((b) => b.id === baralhoId);
  const nome = atual?.nome ?? "Geral";

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="botao-vidro tocavel text-body-sm flex min-h-11 items-center gap-2 self-start px-4"
      >
        <Layers className="size-4" aria-hidden />
        {quantidade} {quantidade === 1 ? "cartão" : "cartões"} · Baralho {nome}
      </button>
      <FolhaInferior aberta={aberta} aoMudar={setAberta} titulo="Baralho dos cartões desta nota">
        <ul role="list" className="flex flex-col gap-2">
          {[{ id: null, nome: "Geral (padrão)", cor: "cinza" as const }, ...baralhos.filter((b) => !b.padrao)].map(
            (b) => (
              <li key={b.id ?? "padrao"}>
                <button
                  type="button"
                  aria-pressed={(b.id ?? null) === (atual && !atual.padrao ? atual.id : null)}
                  onClick={() => {
                    definir.mutate(b.id);
                    setAberta(false);
                  }}
                  className="cartao tocavel flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-left"
                >
                  <span className="size-3 rounded-full" style={{ background: varDaCor(b.cor) }} aria-hidden />
                  {b.nome}
                </button>
              </li>
            ),
          )}
        </ul>
      </FolhaInferior>
    </>
  );
}
```

(`useBaralhos` e o tipo `Baralho { id, nome, cor, trilhaId, padrao, total, novos, paraHoje, atrasados }` vêm da Task 5. Implementar a Task 5 Step 1–3 antes deste Step se executar fora de ordem.)

- [ ] **Step 8: Typecheck, lint e testes**

Run: `.\node_modules\.bin\tsc.cmd --noEmit; .\node_modules\.bin\eslint.cmd features/notes; .\node_modules\.bin\vitest.cmd run tests/unit`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add features/notes app/globals.css lib/chaves-de-consulta.ts lib/database.types.ts tests/unit/cartoes-nas-notas.test.ts
git commit -m "feat(notas): linhas 'pergunta :: resposta' viram flashcards com id estável e baralho da nota"
```

---

### Task 5: Consultas dos flashcards e telas de baralhos e cartões

**Files:**
- Create: `features/flashcards/queries.ts`, `features/flashcards/components/{flashcards-view,baralho-view,formulario-de-baralho,formulario-de-cartao}.tsx`, `app/(app)/flashcards/page.tsx`, `app/(app)/flashcards/[id]/page.tsx`, `app/dev/flashcards/page.tsx`, `app/dev/flashcards/[id]/page.tsx`
- Modify: `lib/chaves-de-consulta.ts`, `lib/database.types.ts`, `app/globals.css` (`.tocavel`)

**Interfaces:**
- Consumes: tabelas/views da Task 1; `estadoNovo`, `EstadoDoCartao` (Task 3); `CORES_DO_MURAL`, `varDaCor`, `ehCorDoMural`, `CorDoMural` (`features/boards/cores.ts`); `useTrilhas` (`features/tracks/queries.ts`, conferir o nome exportado).
- Produces (`queries.ts`):
  - `interface Baralho { id: string; nome: string; cor: CorDoMural; trilhaId: string | null; padrao: boolean; total: number; novos: number; paraHoje: number; atrasados: number }`
  - `interface Cartao { id: string; frente: string; verso: string; baralhoId: string; notaId: string | null; suspenso: boolean; estado: EstadoDoCartao }`
  - `useBaralhos()`, `useCartoesDoBaralho(baralhoId: string)`
  - `useCriarBaralho()`, `useEditarBaralho()`, `useArquivarBaralho()` (com Desfazer)
  - `useSalvarCartao()` (cria ou edita frente/verso/baralho), `useSuspenderCartao()`, `useArquivarCartao()` (com Desfazer)
  - chaves: `chaves.flashcards`, `chaves.baralhos = ["flashcards","baralhos"]`, `chaves.cartoes(id) = ["flashcards","cartoes",id]`, `chaves.fila(baralhoId|null) = ["flashcards","fila",baralhoId ?? "todos"]`

- [ ] **Step 1: Chaves e tipos do banco**

`lib/chaves-de-consulta.ts`:
```ts
  flashcards: ["flashcards"] as const,
  baralhos: ["flashcards", "baralhos"] as const,
  cartoes: (baralhoId: string) => ["flashcards", "cartoes", baralhoId] as const,
  fila: (baralhoId: string | null) => ["flashcards", "fila", baralhoId ?? "todos"] as const,
```
`lib/database.types.ts`: acrescentar `decks`, `cards`, `card_reviews` (Row/Insert/Update espelhando a migration da Task 1), as views `v_decks`, `v_review_cards`, as colunas `profiles.new_cards_per_day` e `focus_sessions.origin`, e as funções `baralho_padrao`, `responder_cartao`, `desfazer_resposta`. Seguir exatamente o formato das entradas existentes (`notes`, `v_note_backlinks`, `salvar_nota`).

- [ ] **Step 2: `features/flashcards/queries.ts` (leituras e CRUD)**

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { chaves } from "@/lib/chaves-de-consulta";
import { usePerfil } from "@/lib/perfil";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { ehCorDoMural, type CorDoMural } from "@/features/boards/cores";
import type { EstadoDoCartao } from "./agendador";

export interface Baralho {
  id: string;
  nome: string;
  cor: CorDoMural;
  trilhaId: string | null;
  padrao: boolean;
  total: number;
  novos: number;
  paraHoje: number;
  atrasados: number;
}

export interface Cartao {
  id: string;
  frente: string;
  verso: string;
  baralhoId: string;
  notaId: string | null;
  suspenso: boolean;
  estado: EstadoDoCartao;
}

export const COLUNAS_DO_ESTADO =
  "state, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review";

type LinhaDeEstado = {
  state: number; due: string; stability: number; difficulty: number; elapsed_days: number;
  scheduled_days: number; learning_steps: number; reps: number; lapses: number; last_review: string | null;
};

export function lerEstado(l: LinhaDeEstado): EstadoDoCartao {
  return {
    state: Math.min(3, Math.max(0, l.state)) as EstadoDoCartao["state"],
    due: l.due,
    stability: l.stability,
    difficulty: l.difficulty,
    elapsed_days: l.elapsed_days,
    scheduled_days: l.scheduled_days,
    learning_steps: l.learning_steps,
    reps: l.reps,
    lapses: l.lapses,
    last_review: l.last_review,
  };
}

/** Erro de nome repetido de baralho (índice único decks_nome_unico_idx). */
export function ehNomeRepetido(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string } | null;
  return e?.code === "23505" || /decks_nome_unico_idx/.test(e?.message ?? "");
}

/** Baralhos ativos com as contagens (view v_decks). "Geral" por último. */
export function useBaralhos() {
  return useQuery({
    queryKey: chaves.baralhos,
    queryFn: async (): Promise<Baralho[]> => {
      const { data, error } = await criarClienteNavegador()
        .from("v_decks")
        .select("id, name, color, track_id, is_default, total, novos, para_hoje, atrasados")
        .order("name");
      if (error) throw error;
      return data
        .flatMap((d) =>
          d.id
            ? [{
                id: d.id,
                nome: d.name ?? "",
                cor: ehCorDoMural(d.color) ? d.color : "azul",
                trilhaId: d.track_id,
                padrao: !!d.is_default,
                total: d.total ?? 0,
                novos: d.novos ?? 0,
                paraHoje: d.para_hoje ?? 0,
                atrasados: d.atrasados ?? 0,
              } satisfies Baralho]
            : [],
        )
        .sort((a, b) => Number(a.padrao) - Number(b.padrao));
    },
  });
}

/** Cartões de um baralho (inclui suspensos; sem os arquivados), mais novos primeiro. */
export function useCartoesDoBaralho(baralhoId: string) {
  return useQuery({
    queryKey: chaves.cartoes(baralhoId),
    queryFn: async (): Promise<Cartao[]> => {
      const { data, error } = await criarClienteNavegador()
        .from("cards")
        .select(`id, front, back, deck_id, note_id, suspended, ${COLUNAS_DO_ESTADO}`)
        .eq("deck_id", baralhoId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((c) => ({
        id: c.id,
        frente: c.front,
        verso: c.back,
        baralhoId: c.deck_id,
        notaId: c.note_id,
        suspenso: c.suspended,
        estado: lerEstado(c),
      }));
    },
  });
}

export function useCriarBaralho() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  return useMutation({
    mutationFn: async (b: { id: string; nome: string; cor: CorDoMural; trilhaId: string | null }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const { error } = await criarClienteNavegador()
        .from("decks")
        .insert({ id: b.id, user_id: perfil.id, name: b.nome.trim(), color: b.cor, track_id: b.trilhaId });
      if (error) throw error;
    },
    onError: (erro) =>
      toast.error(
        ehNomeRepetido(erro) ? "Já existe um baralho com esse nome." : "Não deu pra criar o baralho. Tente de novo.",
        { id: "baralho" },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

export function useEditarBaralho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (b: { id: string; nome: string; cor: CorDoMural; trilhaId: string | null }) => {
      const { error } = await criarClienteNavegador()
        .from("decks")
        .update({ name: b.nome.trim(), color: b.cor, track_id: b.trilhaId })
        .eq("id", b.id);
      if (error) throw error;
    },
    onError: (erro) =>
      toast.error(
        ehNomeRepetido(erro) ? "Já existe um baralho com esse nome." : "Não deu pra salvar o baralho.",
        { id: "baralho" },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

/** Arquiva o baralho (os cartões saem da revisão; nada é apagado). Com "Desfazer". */
export function useArquivarBaralho() {
  const queryClient = useQueryClient();
  const mudar = async (id: string, arquivar: boolean) => {
    const { error } = await criarClienteNavegador()
      .from("decks")
      .update({ archived_at: arquivar ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      toast.error(
        ehNomeRepetido(error) ? "Já existe outro baralho com esse nome; renomeie antes de restaurar." : "Não deu pra salvar. Tente de novo.",
        { id: "baralho" },
      );
    }
    await queryClient.invalidateQueries({ queryKey: chaves.flashcards });
  };
  return (b: { id: string; nome: string }, aoArquivar?: () => void) => {
    const arquivando = mudar(b.id, true);
    aoArquivar?.();
    toast(`Baralho “${b.nome}” arquivado.`, {
      id: `arquivar-baralho-${b.id}`,
      action: { label: "Desfazer", onClick: () => void arquivando.then(() => mudar(b.id, false)) },
    });
  };
}

/** Cria ou edita um cartão feito à mão (cartões de notas são editados na nota). */
export function useSalvarCartao() {
  const queryClient = useQueryClient();
  const { data: perfil } = usePerfil();
  return useMutation({
    mutationFn: async (c: { id: string; novo: boolean; frente: string; verso: string; baralhoId: string }) => {
      if (!perfil) throw new Error("Perfil ainda não carregou");
      const supabase = criarClienteNavegador();
      const dados = { front: c.frente.trim(), back: c.verso.trim(), deck_id: c.baralhoId };
      const { error } = c.novo
        ? await supabase.from("cards").insert({ id: c.id, user_id: perfil.id, ...dados })
        : await supabase.from("cards").update(dados).eq("id", c.id);
      if (error) throw error;
    },
    onError: (erro) =>
      toast.error(
        /5\.000 cartões/.test((erro as { message?: string }).message ?? "")
          ? "Você chegou ao limite de 5.000 cartões."
          : "Não deu pra salvar o cartão. Tente de novo.",
        { id: "cartao" },
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

export function useSuspenderCartao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, suspenso }: { id: string; suspenso: boolean }) => {
      const { error } = await criarClienteNavegador().from("cards").update({ suspended: suspenso }).eq("id", id);
      if (error) throw error;
    },
    onError: () => toast.error("Não deu pra salvar. Tente de novo.", { id: "cartao" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chaves.flashcards }),
  });
}

/** Arquiva um cartão feito à mão. Com "Desfazer". */
export function useArquivarCartao() {
  const queryClient = useQueryClient();
  const mudar = async (id: string, arquivar: boolean) => {
    const { error } = await criarClienteNavegador()
      .from("cards")
      .update({ archived_at: arquivar ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) toast.error("Não deu pra salvar. Tente de novo.", { id: "cartao" });
    await queryClient.invalidateQueries({ queryKey: chaves.flashcards });
  };
  return (id: string) => {
    const arquivando = mudar(id, true);
    toast("Cartão arquivado.", {
      id: `arquivar-cartao-${id}`,
      action: { label: "Desfazer", onClick: () => void arquivando.then(() => mudar(id, false)) },
    });
  };
}
```

- [ ] **Step 3: `.tocavel` em `app/globals.css`** (da auditoria; usado nas telas novas)

```css
/* Retorno ao toque para cartões e linhas clicáveis (auditoria de design, item 8). */
.tocavel {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform var(--duration-instant, 90ms) var(--ease-out),
    background-color 160ms var(--ease-out);
}
.tocavel:active {
  transform: scale(0.98);
  background-color: color-mix(in srgb, var(--ink) 6%, var(--card));
}
html[data-motion="reduced"] .tocavel:active {
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-motion="full"]) .tocavel:active {
    transform: none;
  }
}
```

(Conferir os nomes reais dos tokens de duração/easing em `app/globals.css`/`tokens.css` e usar os existentes.)

- [ ] **Step 4: `formulario-de-baralho.tsx`**

Folha (`FolhaInferior`) com: campo "Nome" (`maxLength={80}`, 16 px, erro no campo "Dê um nome ao baralho." / "Já existe um baralho com esse nome." checando a lista de `useBaralhos` com `chaveDoTitulo`), 8 bolinhas de cor (`role="radiogroup"` via `RadioGroup` do Radix — `import { RadioGroup } from "radix-ui"`), select "Trilha (opcional)" com as trilhas de `useTrilhas`, botão primário "Criar baralho"/"Salvar". Props: `{ baralho?: Baralho; aoTerminar: (id: string) => void }`. Ao criar: `id = crypto.randomUUID()`, `criar.mutateAsync(...)`, `aoTerminar(id)`.

```tsx
"use client";

import { RadioGroup } from "radix-ui";
import { useId, useState, type FormEvent } from "react";
import { CORES_DO_MURAL, varDaCor, type CorDoMural } from "@/features/boards/cores";
import { useTrilhas } from "@/features/tracks/queries";
import { chaveDoTitulo } from "@/features/notes/documento";
import { useBaralhos, useCriarBaralho, useEditarBaralho, type Baralho } from "../queries";

export function FormularioDeBaralho({ baralho, aoTerminar }: { baralho?: Baralho; aoTerminar: (id: string) => void }) {
  const { data: baralhos = [] } = useBaralhos();
  const { data: trilhas = [] } = useTrilhas();
  const criar = useCriarBaralho();
  const editar = useEditarBaralho();
  const [nome, setNome] = useState(baralho?.nome ?? "");
  const [cor, setCor] = useState<CorDoMural>(baralho?.cor ?? "azul");
  const [trilhaId, setTrilhaId] = useState<string | null>(baralho?.trilhaId ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const ids = { nome: useId(), erro: useId(), trilha: useId(), cor: useId() };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return setErro("Dê um nome ao baralho.");
    if (baralhos.some((b) => b.id !== baralho?.id && chaveDoTitulo(b.nome) === chaveDoTitulo(n)))
      return setErro("Já existe um baralho com esse nome.");
    const id = baralho?.id ?? crypto.randomUUID();
    try {
      if (baralho) await editar.mutateAsync({ id, nome: n, cor, trilhaId });
      else await criar.mutateAsync({ id, nome: n, cor, trilhaId });
      aoTerminar(id);
    } catch {
      /* o aviso já foi mostrado pela mutação */
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <label htmlFor={ids.nome} className="text-ink-muted text-body-sm font-medium">Nome</label>
      <input
        id={ids.nome}
        value={nome}
        maxLength={80}
        autoFocus
        autoComplete="off"
        onChange={(e) => { setNome(e.target.value); if (erro) setErro(null); }}
        placeholder="Ex.: Anatomia, Direito Constitucional, SQL"
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? ids.erro : undefined}
        className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px] outline-none"
      />
      {erro && <p id={ids.erro} role="alert" className="text-danger text-body-sm">{erro}</p>}

      <span id={ids.cor} className="text-ink-muted text-body-sm font-medium">Cor</span>
      <RadioGroup.Root
        aria-labelledby={ids.cor}
        value={cor}
        onValueChange={(v) => setCor(v as CorDoMural)}
        className="flex flex-wrap gap-2"
      >
        {CORES_DO_MURAL.map((c) => (
          <RadioGroup.Item
            key={c.id}
            value={c.id}
            aria-label={c.nome}
            className="grid size-11 cursor-pointer place-items-center rounded-full border-2 border-transparent data-[state=checked]:border-[var(--ink)]"
          >
            <span className="size-7 rounded-full" style={{ background: varDaCor(c.id) }} aria-hidden />
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>

      <label htmlFor={ids.trilha} className="text-ink-muted text-body-sm font-medium">Trilha (opcional)</label>
      <select
        id={ids.trilha}
        value={trilhaId ?? ""}
        onChange={(e) => setTrilhaId(e.target.value || null)}
        className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px]"
      >
        <option value="">Nenhuma</option>
        {trilhas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
        {baralho ? "Salvar" : "Criar baralho"}
      </button>
    </form>
  );
}
```

(Ajustar `useTrilhas`/`t.nome` aos nomes reais de `features/tracks/queries.ts`.)

- [ ] **Step 5: `formulario-de-cartao.tsx`**

```tsx
"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useBaralhos, useSalvarCartao, type Cartao } from "../queries";

/** Folha de novo/editar cartão feito à mão. "Salvar e criar outro" mantém o baralho. */
export function FormularioDeCartao({
  cartao,
  baralhoInicial,
  aoTerminar,
}: {
  cartao?: Cartao;
  baralhoInicial: string;
  aoTerminar: () => void;
}) {
  const { data: baralhos = [] } = useBaralhos();
  const salvar = useSalvarCartao();
  const [frente, setFrente] = useState(cartao?.frente ?? "");
  const [verso, setVerso] = useState(cartao?.verso ?? "");
  const [baralhoId, setBaralhoId] = useState(cartao?.baralhoId ?? baralhoInicial);
  const [erro, setErro] = useState<{ campo: "frente" | "verso"; texto: string } | null>(null);
  const frenteRef = useRef<HTMLTextAreaElement>(null);
  const ids = { frente: useId(), verso: useId(), baralho: useId(), erro: useId() };

  function enviar(e: FormEvent, outro: boolean) {
    e.preventDefault();
    if (!frente.trim()) return setErro({ campo: "frente", texto: "Escreva a pergunta (frente)." });
    if (!verso.trim()) return setErro({ campo: "verso", texto: "Escreva a resposta (verso)." });
    salvar.mutate({ id: cartao?.id ?? crypto.randomUUID(), novo: !cartao, frente, verso, baralhoId });
    if (outro) {
      setFrente("");
      setVerso("");
      frenteRef.current?.focus();
    } else {
      aoTerminar();
    }
  }

  const campo = "campo w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-[16px] outline-none field-sizing-content min-h-24";
  return (
    <form onSubmit={(e) => enviar(e, false)} noValidate className="flex flex-col gap-3">
      <label htmlFor={ids.frente} className="text-ink-muted text-body-sm font-medium">Frente (pergunta)</label>
      <textarea
        ref={frenteRef}
        id={ids.frente}
        value={frente}
        maxLength={2000}
        autoFocus
        onChange={(e) => { setFrente(e.target.value); setErro(null); }}
        aria-invalid={erro?.campo === "frente" ? true : undefined}
        aria-describedby={erro?.campo === "frente" ? ids.erro : undefined}
        className={campo}
      />
      <label htmlFor={ids.verso} className="text-ink-muted text-body-sm font-medium">Verso (resposta)</label>
      <textarea
        id={ids.verso}
        value={verso}
        maxLength={2000}
        onChange={(e) => { setVerso(e.target.value); setErro(null); }}
        aria-invalid={erro?.campo === "verso" ? true : undefined}
        aria-describedby={erro?.campo === "verso" ? ids.erro : undefined}
        className={campo}
      />
      {erro && <p id={ids.erro} role="alert" className="text-danger text-body-sm">{erro.texto}</p>}
      <label htmlFor={ids.baralho} className="text-ink-muted text-body-sm font-medium">Baralho</label>
      <select
        id={ids.baralho}
        value={baralhoId}
        onChange={(e) => setBaralhoId(e.target.value)}
        className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px]"
      >
        {baralhos.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
      </select>
      <div className="flex flex-col gap-2 pt-1">
        <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
          {cartao ? "Salvar" : "Criar cartão"}
        </button>
        {!cartao && (
          <button type="button" onClick={(e) => enviar(e, true)} className="botao-vidro min-h-12 cursor-pointer font-semibold">
            Salvar e criar outro
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 6: `flashcards-view.tsx` (`/flashcards`)**

Estrutura (seguir `notas-view.tsx`): cabeçalho "Flashcards" com subtítulo `N para revisar hoje` (soma de `paraHoje + min(novos, limite restante)` — mostrar simplesmente a soma de `paraHoje` e `novos` limitada por `perfil.new_cards_per_day`), botão "+" (`aria-label="Novo baralho"`), botão grande `Link` "Revisar tudo (N)" para `${caminhoBase}/revisar` (desabilitado visualmente com texto "Nada para revisar agora" quando N = 0), lista de baralhos (`Link` `.cartao .tocavel` com bolinha da cor, nome, contagens "8 para revisar · 3 novos" e nome da trilha), esqueleto em carregamento, erro com "Tentar de novo", estado vazio:

```tsx
<div className="cartao flex flex-col items-start gap-3 rounded-xl p-5">
  <p className="font-semibold">Nenhum baralho ainda</p>
  <p className="text-ink-muted text-body-sm">
    Crie um baralho e adicione cartões, ou escreva <code>pergunta :: resposta</code> em qualquer
    nota: a linha vira um cartão sozinha.
  </p>
  <button type="button" onClick={() => setNovoAberto(true)} className="botao-primario min-h-11 cursor-pointer px-5 font-semibold">
    Criar meu primeiro baralho
  </button>
</div>
```

Props: `{ caminhoBase = "/flashcards" }`. Novo baralho: `FolhaInferior titulo="Novo baralho"` com `FormularioDeBaralho aoTerminar={(id) => { setNovoAberto(false); router.push(`${caminhoBase}/${id}`); }}`.

- [ ] **Step 7: `baralho-view.tsx` (`/flashcards/[id]`)**

Props `{ id: string; caminhoBase = "/flashcards"; caminhoDasNotas = "/notas" }`. Conteúdo:
- header: voltar (`Link` `aria-label="Voltar aos baralhos"`), nome, `DropdownMenu` com "Editar baralho" (folha com `FormularioDeBaralho baralho={b}`) e "Arquivar baralho" (`useArquivarBaralho`, oculto para `padrao`; volta à lista).
- botão "Revisar este baralho (N)" → `${caminhoBase}/revisar?baralho=${id}`.
- busca (`buscarNotas` adaptado: usar `{ id, titulo: frente, texto: verso }`).
- lista: cada cartão `button.cartao.tocavel` com frente (1 linha), verso (1 linha, muted), chip de estado: `Novo` (state 0), `Aprendendo` (1/3), `Revisão · em 3 d` (2; usar `rotuloDoIntervalo(new Date(), new Date(due))`, ou "hoje" se vencido), `Suspenso` quando suspenso, ícone `FileText` quando `notaId`.
- tocar abre `FolhaInferior` "Cartão": se `notaId`, mostra frente/verso em leitura + `Link` "Editar na nota" (`${caminhoDasNotas}/${notaId}`); senão `FormularioDeCartao cartao={c}`. Em ambos: botões "Suspender"/"Reativar" (`useSuspenderCartao`) e, só para os feitos à mão, "Arquivar" (`useArquivarCartao`).
- "+" (`aria-label="Novo cartão"`) abre a folha "Novo cartão" com `FormularioDeCartao baralhoInicial={id}`.
- baralho inexistente/arquivado: "Baralho não encontrado" + link de volta (igual a `nota-view`).

Usar `useMontado()` (`lib/usar-montado.ts`) antes de renderizar intervalos relativos (evita divergência servidor/navegador com `new Date()`).

- [ ] **Step 8: Rotas**

```tsx
// app/(app)/flashcards/page.tsx
import { Suspense } from "react";
import { FlashcardsView } from "@/features/flashcards/components/flashcards-view";

export const metadata = { title: "Flashcards" };

/** Rota /flashcards: baralhos e o atalho para revisar. */
export default function PaginaDeFlashcards() {
  return (
    <Suspense fallback={null}>
      <FlashcardsView />
    </Suspense>
  );
}
```

```tsx
// app/(app)/flashcards/[id]/page.tsx
import { Suspense } from "react";
import { BaralhoView } from "@/features/flashcards/components/baralho-view";

export const metadata = { title: "Baralho" };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BaralhoView id={id} />;
}

/** Rota /flashcards/[id]: cartões de um baralho. `params` é dinâmico: lido dentro do Suspense. */
export default function PaginaDoBaralho({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Conteudo params={params} />
    </Suspense>
  );
}
```

Espelhos em `app/dev/flashcards/page.tsx` e `app/dev/flashcards/[id]/page.tsx` iguais a `app/dev/notas/...` (`notFound()` em produção, `LayoutDoApp`, `caminhoBase="/dev/flashcards"`, `caminhoDasNotas="/dev/notas"`).

- [ ] **Step 9: Typecheck, lint, build**

Run: `.\node_modules\.bin\tsc.cmd --noEmit; .\node_modules\.bin\eslint.cmd features/flashcards app; node node_modules/next/dist/bin/next build`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add features/flashcards app/(app)/flashcards app/dev/flashcards lib app/globals.css
git commit -m "feat(flashcards): telas de baralhos e cartões (criar, editar, suspender, arquivar com desfazer)"
```

---

### Task 6: Sessão de revisão

**Files:**
- Create: `features/flashcards/components/revisao-view.tsx`, `features/flashcards/components/cartao-da-revisao.tsx`, `app/(app)/flashcards/revisar/page.tsx`, `app/dev/flashcards/revisar/page.tsx`
- Modify: `features/flashcards/queries.ts`, `features/focus/queries.ts`, `app/globals.css`, `app/(app)/layout.tsx` (esconder a nav na revisão)

**Interfaces:**
- Consumes: `previa`, `responder`, `AVALIACOES`, `Avaliacao` (Task 3); `montarFila`, `proximoDaFila`, `reinserir`, `trechosDeEstudo`, `inicioDoDiaNoFuso`, `CartaoDaFila` (Task 3); `lerEstado`, `COLUNAS_DO_ESTADO` (Task 5).
- Produces:
  - `useFila(baralhoId: string | null)` → `{ fila: CartaoDaFila[]; atrasados: number; novosPausados: boolean }`
  - `useResponderCartao()` (mutação com `scope: { id: "revisao" }`, variáveis `{ reviewId, cartao: CartaoDaFila, avaliacao, novo: EstadoDoCartao, duracaoMs }`)
  - `useDesfazerResposta()` (variáveis `{ reviewId }`)
  - `useRegistrarSessao` aceita `origem?: "foco" | "revisao"`.

- [ ] **Step 1: Hooks da fila e das respostas (`features/flashcards/queries.ts`)**

```ts
import { inicioDoDiaNoFuso, montarFila, type CartaoDaFila } from "./fila";

function paraCartaoDaFila(c: {
  id: string | null; front: string | null; back: string | null; deck_id: string | null; note_id: string | null;
} & LinhaDeEstado): CartaoDaFila {
  return { id: c.id!, frente: c.front ?? "", verso: c.back ?? "", deckId: c.deck_id!, noteId: c.note_id, estado: lerEstado(c) };
}

/**
 * Monta a fila da sessão: revisões e aprendizagem que vencem até o fim de hoje + novos até o
 * limite do dia (descontando os novos já vistos hoje). Lida uma vez ao abrir a sessão.
 */
export function useFila(baralhoId: string | null) {
  const { data: perfil } = usePerfil();
  return useQuery({
    queryKey: chaves.fila(baralhoId),
    enabled: !!perfil,
    staleTime: Infinity, // a sessão cuida da fila; recarrega só ao abrir de novo
    queryFn: async () => {
      const supabase = criarClienteNavegador();
      const agora = new Date();
      const inicioDoDia = inicioDoDiaNoFuso(perfil!.timezone, agora);
      const fimDoDia = new Date(inicioDoDia.getTime() + 86_400_000);
      const limite = perfil!.new_cards_per_day;
      const colunas = `id, front, back, deck_id, note_id, ${COLUNAS_DO_ESTADO}`;

      let revisoes = supabase.from("v_review_cards").select(colunas).neq("state", 0).lt("due", fimDoDia.toISOString()).order("due");
      let novos = supabase.from("v_review_cards").select(colunas).eq("state", 0).order("created_at").limit(limite);
      if (baralhoId) {
        revisoes = revisoes.eq("deck_id", baralhoId);
        novos = novos.eq("deck_id", baralhoId);
      }
      const vistosHoje = supabase
        .from("card_reviews")
        .select("id", { count: "exact", head: true })
        .eq("state_before", 0)
        .gte("reviewed_at", inicioDoDia.toISOString());

      const [r, n, v] = await Promise.all([revisoes, novos, vistosHoje]);
      if (r.error) throw r.error;
      if (n.error) throw n.error;
      if (v.error) throw v.error;
      return montarFila({
        revisoes: r.data.map(paraCartaoDaFila),
        novos: n.data.map(paraCartaoDaFila),
        agora,
        inicioDoDia,
        novosJaHoje: v.count ?? 0,
        limiteDeNovos: limite,
      });
    },
  });
}

/** Erro "conflito" do banco: o cartão já foi respondido em outro aparelho. */
export function ehConflito(erro: unknown): boolean {
  return /conflito/.test((erro as { message?: string } | null)?.message ?? "");
}

/**
 * Grava uma resposta. `scope` faz as gravações rodarem EM SÉRIE (uma de cada vez): duas
 * respostas seguidas do mesmo cartão em aprendizagem chegam ao banco na ordem certa.
 */
export function useResponderCartao() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: "revisao" },
    retry: (falhas, erro) => !ehConflito(erro) && falhas < 2,
    mutationFn: async (v: {
      reviewId: string;
      cartao: CartaoDaFila;
      avaliacao: 1 | 2 | 3 | 4;
      novo: EstadoDoCartao;
      duracaoMs: number;
    }) => {
      const { error } = await criarClienteNavegador().rpc("responder_cartao", {
        p_id: v.reviewId,
        p_card: v.cartao.id,
        p_reps_esperado: v.cartao.estado.reps,
        p_rating: v.avaliacao,
        p_novo: v.novo as unknown as Json,
        p_duracao_ms: Math.min(600_000, Math.max(0, Math.round(v.duracaoMs))),
      });
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.baralhos });
    },
  });
}

export function useDesfazerResposta() {
  return useMutation({
    scope: { id: "revisao" },
    mutationFn: async ({ reviewId }: { reviewId: string }) => {
      const { error } = await criarClienteNavegador().rpc("desfazer_resposta", { p_review: reviewId });
      if (error) throw error;
    },
  });
}
```

(Importar `Json` de `@/lib/database.types`. Acrescentar `new_cards_per_day: number` em `Perfil` e na `select` de `buscarPerfil` em `lib/perfil.ts`.)

- [ ] **Step 2: `useRegistrarSessao` com origem (`features/focus/queries.ts`)**

Em `NovaSessao` acrescentar `origem?: "foco" | "revisao"`; no `insert`, `origin: s.origem ?? "foco"`. Sem outra mudança (o banco soma tudo em streak, mapa e metas).

- [ ] **Step 3: CSS da virada (em `app/globals.css`)**

```css
/* Cartão da revisão: vira em 3D (frente → verso). No modo reduzido, só troca (sem girar). */
.cartao-que-vira {
  perspective: 1200px;
}
.cartao-que-vira > .miolo {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 420ms var(--ease-out);
}
.cartao-que-vira[data-virado="true"] > .miolo {
  transform: rotateY(180deg);
}
.cartao-que-vira .face {
  backface-visibility: hidden;
}
.cartao-que-vira .face-verso {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
}
html[data-motion="reduced"] .cartao-que-vira > .miolo {
  transition: none;
  transform: none;
}
html[data-motion="reduced"] .cartao-que-vira[data-virado="true"] .face-frente,
html[data-motion="reduced"] .cartao-que-vira:not([data-virado="true"]) .face-verso {
  visibility: hidden;
}
html[data-motion="reduced"] .cartao-que-vira .face-verso {
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-motion="full"]) .cartao-que-vira > .miolo {
    transition: none;
    transform: none;
  }
  html:not([data-motion="full"]) .cartao-que-vira[data-virado="true"] .face-frente,
  html:not([data-motion="full"]) .cartao-que-vira:not([data-virado="true"]) .face-verso {
    visibility: hidden;
  }
  html:not([data-motion="full"]) .cartao-que-vira .face-verso {
    transform: none;
  }
}
```

- [ ] **Step 4: `cartao-da-revisao.tsx`**

```tsx
"use client";

/**
 * O cartão da sessão: frente; tocar (ou "Mostrar resposta") vira para o verso.
 * O verso fica escondido do leitor de tela até virar (aria-hidden) e é anunciado ao virar.
 */
export function CartaoDaRevisao({
  frente,
  verso,
  virado,
  aoVirar,
}: {
  frente: string;
  verso: string;
  virado: boolean;
  aoVirar: () => void;
}) {
  return (
    <div className="cartao-que-vira w-full" data-virado={virado}>
      <div className="miolo">
        <button
          type="button"
          onClick={aoVirar}
          disabled={virado}
          aria-label={virado ? undefined : `Pergunta: ${frente}. Toque para ver a resposta.`}
          className="face face-frente vidro-forte flex min-h-[46dvh] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center"
        >
          <span className="text-ink-muted text-label uppercase">Pergunta</span>
          <span className="text-heading-1 whitespace-pre-wrap">{frente}</span>
        </button>
        <div
          aria-hidden={!virado}
          className="face face-verso vidro-forte flex min-h-[46dvh] w-full flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center"
        >
          <span className="text-ink-muted text-body-sm whitespace-pre-wrap">{frente}</span>
          <span className="h-px w-16 bg-[var(--glass-border)]" aria-hidden />
          <span className="text-heading-1 whitespace-pre-wrap" aria-live="polite">
            {virado ? verso : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
```

(Conferir se `.vidro-forte` existe em `globals.css`; se não, usar `.vidro`.)

- [ ] **Step 5: `revisao-view.tsx`**

Comportamento (props `{ baralhoId: string | null; caminhoBase = "/flashcards" }`):

```tsx
"use client";

import { Undo2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AnelDeProgresso } from "@/components/ui/anel-de-progresso";
import { BarraDeProgresso } from "@/components/ui/barra-de-progresso";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useRegistrarSessao } from "@/features/focus/queries";
import { AVALIACOES, previa, responder, type Avaliacao, type EstadoDoCartao } from "../agendador";
import { proximoDaFila, reinserir, trechosDeEstudo, type CartaoDaFila } from "../fila";
import { ehConflito, useDesfazerResposta, useFila, useResponderCartao } from "../queries";
import { CartaoDaRevisao } from "./cartao-da-revisao";

const TOM: Record<(typeof AVALIACOES)[number]["tom"], string> = {
  danger: "border-danger text-danger",
  warning: "border-warning text-warning",
  accent: "border-accent text-accent",
  success: "border-success text-success",
};

interface Resposta {
  reviewId: string;
  cartao: CartaoDaFila; // como estava ANTES (para desfazer)
  avaliacao: Avaliacao;
  em: Date;
}

/** Sessão de revisão em tela cheia: virar, avaliar com 4 botões, desfazer, resumo no fim. */
export function RevisaoView({ baralhoId, caminhoBase = "/flashcards" }: { baralhoId: string | null; caminhoBase?: string }) {
  const { data, isPending, isError, refetch } = useFila(baralhoId);
  if (isPending) return <Carregando />;
  if (isError || !data) {
    return (
      <main className="px-5 pt-8">
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar a revisão.{" "}
          <button type="button" onClick={() => refetch()} className="underline">Tentar de novo</button>
        </p>
      </main>
    );
  }
  return <Sessao filaInicial={data.fila} novosPausados={data.novosPausados} atrasados={data.atrasados} caminhoBase={caminhoBase} />;
}

function Carregando() {
  return (
    <main aria-busy="true" className="flex flex-col gap-4 px-5 pt-6">
      <span className="sr-only">Carregando revisão</span>
      <Esqueleto className="h-2 w-full" />
      <Esqueleto className="h-[46dvh] w-full rounded-3xl" />
    </main>
  );
}

function Sessao({
  filaInicial,
  novosPausados,
  atrasados,
  caminhoBase,
}: {
  filaInicial: CartaoDaFila[];
  novosPausados: boolean;
  atrasados: number;
  caminhoBase: string;
}) {
  const responderNoBanco = useResponderCartao();
  const desfazerNoBanco = useDesfazerResposta();
  const registrarSessao = useRegistrarSessao();
  const [fila, setFila] = useState(filaInicial);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [virado, setVirado] = useState(false);
  const [agora, setAgora] = useState(() => new Date());
  const inicio = useRef(new Date());
  const mostradoEm = useRef(new Date());
  const total = useRef(filaInicial.length);

  const atual = proximoDaFila(fila, agora);
  const opcoes = useMemo(() => (atual ? previa(atual.estado, agora) : null), [atual, agora]);

  // Cartões em aprendizagem que vencem daqui a pouco: reavalia o "agora" a cada 15 s.
  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const avaliar = useCallback(
    (avaliacao: Avaliacao) => {
      if (!atual || !virado) return;
      const quando = new Date();
      const novo: EstadoDoCartao = responder(atual.estado, avaliacao, quando);
      const reviewId = crypto.randomUUID();
      const depois: CartaoDaFila = { ...atual, estado: novo };
      if (avaliacao === 1 && document.documentElement.dataset.motion !== "reduced") navigator.vibrate?.(20);
      responderNoBanco.mutate(
        { reviewId, cartao: atual, avaliacao, novo, duracaoMs: quando.getTime() - mostradoEm.current.getTime() },
        {
          onError: (erro) =>
            toast.error(
              ehConflito(erro)
                ? "Este cartão foi respondido em outro aparelho. Ele sai desta sessão."
                : "Não deu pra salvar uma resposta. Confira a conexão; as próximas continuam sendo salvas.",
              { id: "responder-cartao" },
            ),
        },
      );
      setRespostas((r) => [...r, { reviewId, cartao: atual, avaliacao, em: quando }]);
      setFila((f) => {
        const semEle = reinserir(f, depois, quando);
        if (semEle.some((c) => c.id === atual.id)) total.current += 1;
        return semEle;
      });
      setAgora(quando);
      setVirado(false);
      mostradoEm.current = new Date();
    },
    [atual, virado, responderNoBanco],
  );

  const desfazer = useCallback(() => {
    const ultima = respostas.at(-1);
    if (!ultima) return;
    desfazerNoBanco.mutate(
      { reviewId: ultima.reviewId },
      { onError: () => toast.error("Não deu pra desfazer. Tente de novo.", { id: "desfazer-resposta" }) },
    );
    setRespostas((r) => r.slice(0, -1));
    setFila((f) => [ultima.cartao, ...f.filter((c) => c.id !== ultima.cartao.id)]);
    setVirado(true);
  }, [respostas, desfazerNoBanco]);

  // Teclado: Espaço/Enter vira; 1–4 avaliam; Ctrl+Z desfaz.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]")) return;
      if ((e.key === " " || e.key === "Enter") && !virado && atual) { e.preventDefault(); setVirado(true); }
      else if (virado && ["1", "2", "3", "4"].includes(e.key)) avaliar(Number(e.key) as Avaliacao);
      else if (e.key === "z" && (e.ctrlKey || e.metaKey)) desfazer();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [virado, atual, avaliar, desfazer]);

  // Ao terminar ou sair: grava o tempo de estudo no Foco (trechos ≥ 1 min), uma vez só.
  const gravado = useRef(false);
  const registrarTempo = useCallback(() => {
    if (gravado.current || respostas.length === 0) return;
    gravado.current = true;
    const momentos = [inicio.current, ...respostas.map((r) => r.em)];
    for (const t of trechosDeEstudo(momentos)) {
      registrarSessao.mutate({
        inicio: t.inicio,
        fim: t.fim,
        minutosPlanejados: Math.max(1, Math.round((t.fim.getTime() - t.inicio.getTime()) / 60_000)),
        taskId: null,
        trackId: null,
        origem: "revisao",
      });
    }
  }, [respostas, registrarSessao]);
```

Completar o componente assim (mesmo arquivo):
- Guardar `registrarTempo` num ref (atualizado num `useEffect`) e chamar no desmontar (`useEffect(() => () => registrarTempoRef.current(), [])`) e num `useEffect` quando `atual` vira `null` com `respostas.length > 0` (fim da sessão). A flag `gravado` impede gravar duas vezes. Se a pessoa desfizer depois do resumo, o tempo já gravado fica (é tempo estudado de verdade).
- Topo: `Link` fechar (`aria-label="Encerrar revisão"`, href `caminhoBase`), `BarraDeProgresso valor={respostas.length} maximo={total.current}` com `aria-label`, botão Desfazer (`aria-label="Desfazer última resposta"`, desabilitado sem respostas).
- Aviso quando `novosPausados`: `<p className="cartao text-body-sm rounded-lg p-3">Você tem {atrasados} revisões atrasadas. Cartões novos voltam quando elas estiverem em dia.</p>`.
- Com `atual`: `<CartaoDaRevisao frente verso virado aoVirar={() => setVirado(true)} />`; abaixo, se não virado, botão primário "Mostrar resposta" (min-h-14); se virado, grade de 4 botões:

```tsx
<div role="group" aria-label="Como foi?" className="grid grid-cols-4 gap-2">
  {AVALIACOES.map((a) => (
    <button
      key={a.valor}
      type="button"
      onClick={() => avaliar(a.valor)}
      aria-label={`${a.rotulo}, próxima revisão em ${opcoes![a.valor].intervalo}`}
      aria-keyshortcuts={String(a.valor)}
      className={`tocavel flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border bg-[var(--card)] px-1 ${TOM[a.tom]}`}
    >
      <span className="text-body-sm font-semibold">{a.rotulo}</span>
      <span className="text-ink-muted text-[12px]">{opcoes![a.valor].intervalo}</span>
    </button>
  ))}
</div>
```

- Sem `atual` e fila não vazia (só aprendizagem para mais de 20 min) é impossível pelo `reinserir`; sem `atual` e sem respostas: tela "Nada para revisar agora" + link de volta. Sem `atual` com respostas: **resumo** — `AnelDeProgresso` com % de acertos (`respostas` com `avaliacao > 1`, contando só a última resposta de cada cartão), "N cartões revisados", "M min" (soma dos trechos), botão "Voltar aos baralhos".
- Classes de cor `text-warning`/`border-warning`/`text-success`: conferir os tokens existentes; se `warning` não existir, usar o equivalente do tema (ver `globals.css`) e documentar.

- [ ] **Step 6: Esconder a nav na revisão**

Em `app/(app)/layout.tsx` (ou em `navegacao.tsx`, que já usa `usePathname` dentro de Suspense): não renderizar a barra quando `pathname.endsWith("/flashcards/revisar")`. A rota de laboratório `/dev/flashcards/revisar` usa `LayoutDoApp` e deve se comportar igual (a regra olha o fim do caminho).

- [ ] **Step 7: Rotas da revisão**

```tsx
// app/(app)/flashcards/revisar/page.tsx
import { Suspense } from "react";
import { RevisaoView } from "@/features/flashcards/components/revisao-view";

export const metadata = { title: "Revisar flashcards" };

async function Conteudo({ searchParams }: { searchParams: Promise<{ baralho?: string }> }) {
  const { baralho } = await searchParams;
  return <RevisaoView baralhoId={baralho ?? null} />;
}

/** Rota /flashcards/revisar?baralho=…: sessão de revisão (sem baralho = tudo de hoje). */
export default function PaginaDaRevisao({ searchParams }: { searchParams: Promise<{ baralho?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Conteudo searchParams={searchParams} />
    </Suspense>
  );
}
```
Espelho em `app/dev/flashcards/revisar/page.tsx` com `caminhoBase="/dev/flashcards"`.

- [ ] **Step 8: Typecheck, lint, testes unitários, build**

Run: `.\node_modules\.bin\tsc.cmd --noEmit; .\node_modules\.bin\eslint.cmd features app; .\node_modules\.bin\vitest.cmd run; node node_modules/next/dist/bin/next build`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add features/flashcards features/focus/queries.ts lib/perfil.ts app
git commit -m "feat(flashcards): sessão de revisão (virar, 4 botões com intervalo, desfazer, resumo) e tempo no Foco"
```

---

### Task 7: Início, Personalização e menu

**Files:**
- Create: `features/flashcards/components/revisar-hoje.tsx`
- Modify: `features/dashboard/components/inicio-view.tsx`, `features/settings/components/personalizacao-view.tsx`

**Interfaces:**
- Consumes: `useBaralhos()` (Task 5); `usePerfil`, `useAtualizarPerfil` (conferir nome em `lib/perfil.ts`).
- Produces: `RevisarHoje({ caminhoBase?: string })`.

- [ ] **Step 1: `revisar-hoje.tsx`**

```tsx
"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { usePerfil } from "@/lib/perfil";
import { useBaralhos } from "../queries";

/**
 * Card "Revisar hoje" do Início: quantos cartões esperam revisão (revisões de hoje + novos até
 * o limite do dia). Some quando a pessoa ainda não tem baralhos; mostra "Tudo em dia" quando zera.
 */
export function RevisarHoje({ caminhoBase = "/flashcards" }: { caminhoBase?: string }) {
  const { data: baralhos } = useBaralhos();
  const { data: perfil } = usePerfil();
  if (!baralhos || baralhos.length === 0 || baralhos.every((b) => b.total === 0)) return null;
  const paraHoje = baralhos.reduce((s, b) => s + b.paraHoje, 0);
  const novos = Math.min(baralhos.reduce((s, b) => s + b.novos, 0), perfil?.new_cards_per_day ?? 10);
  const total = paraHoje + novos;

  return (
    <section aria-labelledby="titulo-revisar-hoje" className="cartao flex items-center gap-4 rounded-xl p-4">
      <span className="bg-accent/15 text-accent grid size-12 shrink-0 place-items-center rounded-full">
        <Layers className="size-6" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 id="titulo-revisar-hoje" className="font-semibold">Revisar hoje</h2>
        <p className="text-ink-muted text-body-sm">
          {total === 0 ? "Tudo em dia. Volte amanhã." : `${total} ${total === 1 ? "cartão" : "cartões"} esperando você`}
        </p>
      </div>
      {total > 0 && (
        <Link href={`${caminhoBase}/revisar`} className="botao-primario grid min-h-11 place-items-center px-5 font-semibold">
          Começar
        </Link>
      )}
    </section>
  );
}
```

O número do card é uma estimativa (não desconta novos já vistos hoje); a sessão aplica o limite exato. Documentar isso no comentário.

- [ ] **Step 2: Início**

Em `inicio-view.tsx`: acrescentar `<RevisarHoje caminhoBase={...} />` logo depois do card de Foco (seguir como o Início recebe `caminhoBase` para o laboratório — conferir as props de `InicioView` e repassar `/dev/flashcards` no lab), e no menu do avatar um item `Flashcards` (ícone `Layers`, `href` `/flashcards`) entre "Notas" e "Murais", no mesmo formato dos outros `DropdownMenu.Item asChild`.

- [ ] **Step 3: Personalização**

Em `personalizacao-view.tsx`, nova seção "Flashcards" no padrão das seções de números existentes (ver como "Meta diária"/pomodoro são editados): rótulo "Cartões novos por dia", ajuda "Comece com poucos: cada cartão novo volta várias vezes nos dias seguintes.", controle numérico 0–100 (passo 5, com botões − e + de 44 px e o valor anunciado), salvando `new_cards_per_day` via a mesma mutação de perfil. Após salvar, invalidar `chaves.flashcards` também.

- [ ] **Step 4: Typecheck, lint, testes**

Run: `.\node_modules\.bin\tsc.cmd --noEmit; .\node_modules\.bin\eslint.cmd features; .\node_modules\.bin\vitest.cmd run`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add features
git commit -m "feat(flashcards): card Revisar hoje no Início, item no menu e cartões novos por dia na Personalização"
```

---

### Task 8: Supabase falso para os testes de tela

**Files:**
- Modify: `tests/e2e/apoio-supabase-falso.ts`

**Interfaces:**
- Produces: `EstadoFalso.flashcards = { baralhos: LinhaDeBaralho[]; cartoes: LinhaDeCartao[]; respostas: LinhaDeResposta[] }`, helpers exportados `baralhoFalso(nome, extra?)` e `cartaoFalso(deckId, front, back, extra?)`; `estado.perfil.new_cards_per_day = 10`; `estado.notas.notas[].deck_id`.

- [ ] **Step 1: Tipos e estado inicial**

```ts
export interface LinhaDeBaralho {
  id: string; name: string; color: string; track_id: string | null; is_default: boolean; archived_at: string | null;
}
export interface LinhaDeCartao {
  id: string; deck_id: string; note_id: string | null; front: string; back: string;
  state: number; due: string; stability: number; difficulty: number; elapsed_days: number;
  scheduled_days: number; learning_steps: number; reps: number; lapses: number; last_review: string | null;
  suspended: boolean; archived_at: string | null; created_at: string;
}
export interface LinhaDeResposta { id: string; card_id: string; rating: number; state_before: number; antes: LinhaDeCartao; reviewed_at: string }

export function baralhoFalso(name: string, extra: Partial<LinhaDeBaralho> = {}): LinhaDeBaralho {
  return { id: crypto.randomUUID(), name, color: "azul", track_id: null, is_default: false, archived_at: null, ...extra };
}
export function cartaoFalso(deck_id: string, front: string, back: string, extra: Partial<LinhaDeCartao> = {}): LinhaDeCartao {
  return {
    id: crypto.randomUUID(), deck_id, note_id: null, front, back, state: 0, due: "2026-10-07T12:00:00Z",
    stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0,
    last_review: null, suspended: false, archived_at: null, created_at: "2026-10-01T12:00:00Z", ...extra,
  };
}
```
`criarEstado` passa a incluir `flashcards: { baralhos: [], cartoes: [], respostas: [] }`; o perfil falso ganha `new_cards_per_day: 10`.

- [ ] **Step 2: Leituras (dentro de `if (req.method() === "GET")`)**

Funções auxiliares no topo do arquivo:
```ts
const ativo = (e: EstadoFalso, c: LinhaDeCartao) => {
  const d = e.flashcards.baralhos.find((b) => b.id === c.deck_id);
  const n = c.note_id ? e.notas.notas.find((x) => x.id === c.note_id) : null;
  return !c.archived_at && !c.suspended && !!d && !d.archived_at && (!c.note_id || (!!n && !n.archived_at));
};
/** Lê um filtro do PostgREST ("eq.x", "lt.x", "neq.x", "gte.x", "is.null"). */
function filtrar<T extends Record<string, unknown>>(linhas: T[], params: URLSearchParams): T[] {
  let r = linhas;
  for (const [col, valor] of params) {
    if (["select", "order", "limit", "offset"].includes(col)) continue;
    const [op, ...resto] = valor.split(".");
    const v = resto.join(".");
    r = r.filter((l) => {
      const x = l[col];
      if (op === "eq") return String(x) === v;
      if (op === "neq") return String(x) !== v;
      if (op === "lt") return String(x) < v;
      if (op === "gte") return String(x) >= v;
      if (op === "is") return v === "null" ? x === null || x === undefined : true;
      return true;
    });
  }
  return r;
}
```
Rotas:
- `v_decks`: para cada baralho ativo, contar sobre `cartoes.filter(ativo)`: `total`, `novos` (state 0), `para_hoje` (state ≠ 0 e `due < "2026-10-08T03:00:00Z"`), `atrasados` (state ≠ 0 e `due < "2026-10-07T03:00:00Z"`) — o "hoje" falso é 2026-10-07 em São Paulo.
- `v_review_cards`: `filtrar(cartoes.filter(ativo), url.searchParams)`, ordenar por `due` (ou `created_at` quando `order=created_at...`), aplicar `limit`.
- `cards`: `filtrar(cartoes, params)` ordenado por `created_at desc`.
- `card_reviews`: `filtrar(respostas, params)`; quando `req.method() === "HEAD"` ou `prefer` tem `count=exact`, responder com header `content-range: 0-0/${n}` (tratar `HEAD` antes do bloco GET: `if (req.method() === "HEAD" && tabela === "card_reviews")`).
- `decks`: `baralhos.filter(b => !b.archived_at)`.

Notas: `useNota` agora pede `deck_id` — incluir `deck_id: string | null` nas linhas de nota (padrão `null`).

- [ ] **Step 3: Escritas e RPCs**

- `POST decks` (nome repetido entre ativos → 409 `{ code: "23505", message: "decks_nome_unico_idx" }`), `PATCH decks?id=eq.X` (`Object.assign`).
- `POST cards`, `PATCH cards?id=eq.X`.
- `rpc/responder_cartao`: achar o cartão; se `reps !== p_reps_esperado` → 400 `{ message: "conflito: o cartão já foi respondido em outro aparelho" }`; guardar `{ id: p_id, card_id, rating: p_rating, state_before: c.state, antes: { ...c }, reviewed_at: new Date().toISOString() }` em `respostas`; `Object.assign(c, p_novo)`; 204.
- `rpc/desfazer_resposta`: achar a resposta, `Object.assign(cartao, resposta.antes)`, remover; 204.
- `rpc/definir_baralho_da_nota`: `nota.deck_id = p_deck`; cartões ativos da nota vão para `p_deck ?? padrao().id`.
- `rpc/salvar_nota` (estender o existente): depois dos links, se `p_cartoes` tem mais de 200 → 400 `{ message: "Uma nota pode ter até 200 cartões" }` **antes** de alterar qualquer coisa (mover a checagem para o início); arquivar cartões da nota fora da lista; para cada `{id, frente, verso}`: se existe, atualizar `front/back/deck_id` e `archived_at = null`; senão criar com `cartaoFalso(deck, frente, verso, { id, note_id: p_id })`. `deck` = baralho da nota se ativo, senão `padrao()`.
- `padrao()`: o baralho `is_default` ou um novo `baralhoFalso("Geral", { is_default: true })` empurrado na lista.
- `focus_sessions` POST: guardar também `origin` em `estado.requisicoes` (já guarda o corpo) — os testes leem dali.

- [ ] **Step 4: Rodar os e2e existentes (nada pode quebrar)**

Run: `.\node_modules\.bin\playwright.cmd test tests/e2e/notas.spec.ts tests/e2e/foco.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/apoio-supabase-falso.ts
git commit -m "test(e2e): Supabase falso com baralhos, cartões, respostas e cartões das notas"
```

---

### Task 9: E2E, acessibilidade, documentação

**Files:**
- Create: `tests/e2e/flashcards.spec.ts`, `tests/a11y/flashcards.spec.ts`
- Modify: `docs/adr/ADR-002-modelo-de-dados-e-rls.md`, `CHANGELOG.md`, `docs/roadmap.md`, `.github/workflows/*` (nada, só conferir)

- [ ] **Step 1: E2E**

```ts
// tests/e2e/flashcards.spec.ts
import { expect, test, type Page } from "@playwright/test";
import { baralhoFalso, cartaoFalso, cenarioPadrao, prepararTela, type EstadoFalso } from "./apoio-supabase-falso";

/** Flashcards no celular, com Supabase falso (hoje = 2026-10-07 15:00 em São Paulo). */
function comBaralho(): { estado: EstadoFalso; deckId: string } {
  const estado = cenarioPadrao();
  const d = baralhoFalso("SQL");
  estado.flashcards.baralhos = [d];
  estado.flashcards.cartoes = [
    cartaoFalso(d.id, "O que é um JOIN?", "Une linhas de duas tabelas"),
    cartaoFalso(d.id, "O que faz GROUP BY?", "Agrupa linhas"),
  ];
  return { estado, deckId: d.id };
}

const respostas = (e: EstadoFalso) => e.requisicoes.filter((r) => r.tabela === "rpc/responder_cartao");

async function abrirRevisao(page: Page, estado: EstadoFalso) {
  await prepararTela(page, estado);
  await page.goto("/dev/flashcards/revisar");
  await expect(page.getByRole("button", { name: /Pergunta: O que é um JOIN\?/ })).toBeVisible();
}

test.describe("baralhos e cartões", () => {
  test("sem baralhos: cria o primeiro e um cartão", async ({ page }) => {
    const estado = cenarioPadrao();
    await prepararTela(page, estado);
    await page.goto("/dev/flashcards");
    await page.getByRole("button", { name: "Criar meu primeiro baralho" }).click();
    const folha = page.getByRole("dialog", { name: "Novo baralho" });
    await folha.getByLabel("Nome").fill("Anatomia");
    await folha.getByRole("button", { name: "Criar baralho" }).click();
    await expect(page).toHaveURL(/\/dev\/flashcards\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Novo cartão" }).click();
    const novo = page.getByRole("dialog", { name: "Novo cartão" });
    await novo.getByLabel("Frente (pergunta)").fill("Maior osso do corpo?");
    await novo.getByLabel("Verso (resposta)").fill("Fêmur");
    await novo.getByRole("button", { name: "Criar cartão" }).click();
    await expect(page.getByRole("button", { name: /Maior osso do corpo\?/ })).toBeVisible();
    expect(estado.flashcards.cartoes.some((c) => c.back === "Fêmur")).toBe(true);
  });

  test("nome repetido é recusado no campo", async ({ page }) => {
    const { estado } = comBaralho();
    await prepararTela(page, estado);
    await page.goto("/dev/flashcards");
    await page.getByRole("button", { name: "Novo baralho" }).click();
    const folha = page.getByRole("dialog", { name: "Novo baralho" });
    await folha.getByLabel("Nome").fill(" sql ");
    await folha.getByRole("button", { name: "Criar baralho" }).click();
    await expect(folha.getByRole("alert")).toHaveText("Já existe um baralho com esse nome.");
  });

  test("lista mostra contagens", async ({ page }) => {
    const { estado } = comBaralho();
    await prepararTela(page, estado);
    await page.goto("/dev/flashcards");
    await expect(page.getByRole("link", { name: /SQL.*2 novos/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Revisar tudo \(2\)/ })).toBeVisible();
  });
});

test.describe("revisão", () => {
  test("virar, ver os intervalos, responder e chegar ao resumo", async ({ page }) => {
    const { estado } = comBaralho();
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await expect(page.getByText("Une linhas de duas tabelas")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Errei, próxima revisão em .*min/ })).toBeVisible();
    await page.getByRole("button", { name: /^Fácil/ }).click();
    await expect(page.getByRole("button", { name: /Pergunta: O que faz GROUP BY\?/ })).toBeVisible();
    await page.keyboard.press("Space");
    await page.keyboard.press("4");
    await expect(page.getByText(/2 cartões revisados/)).toBeVisible();
    await expect.poll(() => respostas(estado).length).toBe(2);
  });

  test("Errei faz o cartão voltar na mesma sessão", async ({ page }) => {
    const { estado } = comBaralho();
    estado.flashcards.cartoes = estado.flashcards.cartoes.slice(0, 1);
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Errei/ }).click();
    // Aprendizagem de 1 min: antecipada (até 20 min) — o mesmo cartão aparece de novo.
    await expect(page.getByRole("button", { name: /Pergunta: O que é um JOIN\?/ })).toBeVisible();
  });

  test("duas respostas seguidas do mesmo cartão gravam em ordem (sem conflito)", async ({ page }) => {
    const { estado } = comBaralho();
    estado.flashcards.cartoes = estado.flashcards.cartoes.slice(0, 1);
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Errei/ }).click();
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Bom/ }).click();
    await expect.poll(() => respostas(estado).length).toBe(2);
    expect(estado.flashcards.cartoes[0]!.reps).toBe(2);
    await expect(page.getByText(/foi respondido em outro aparelho/)).toHaveCount(0);
  });

  test("Desfazer volta ao cartão anterior já virado", async ({ page }) => {
    const { estado } = comBaralho();
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: /^Bom/ }).click();
    await page.getByRole("button", { name: "Desfazer última resposta" }).click();
    await expect(page.getByText("Une linhas de duas tabelas")).toBeVisible();
    await expect.poll(() => estado.flashcards.cartoes[0]!.reps).toBe(0);
  });

  test("tempo de revisão vai para o Foco como origem 'revisao'", async ({ page }) => {
    const { estado } = comBaralho();
    await abrirRevisao(page, estado);
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.clock.fastForward("02:00");
    await page.getByRole("button", { name: /^Fácil/ }).click();
    await page.keyboard.press("Space");
    await page.keyboard.press("4");
    await expect(page.getByText(/2 cartões revisados/)).toBeVisible();
    await expect
      .poll(() => estado.requisicoes.filter((r) => r.tabela === "focus_sessions").map((r) => (r.corpo as { origin: string }).origin))
      .toEqual(["revisao"]);
  });
});

test.describe("integração", () => {
  test("linha 'pergunta :: resposta' numa nota vira cartão no baralho Geral", async ({ page }) => {
    const estado = cenarioPadrao();
    const id = "00000000-0000-4000-8000-00000000f001";
    estado.notas.notas = [{
      id, title: "SQL básico", icon: null, content: { type: "doc", content: [] }, plain_text: "",
      track_id: null, archived_at: null, updated_at: "2026-10-07T12:00:00Z", deck_id: null,
    }];
    await prepararTela(page, estado);
    await page.goto(`/dev/notas/${id}`);
    await page.getByRole("textbox", { name: "Conteúdo da nota" }).click();
    await page.keyboard.type("O que é PK? :: Chave primária");
    await expect(page.locator("p.cartao-na-nota")).toBeVisible();
    await expect(page.getByRole("button", { name: /1 cartão · Baralho Geral/ })).toBeVisible();
    await expect.poll(() => estado.flashcards.cartoes.map((c) => c.front)).toEqual(["O que é PK?"]);
    expect(estado.flashcards.baralhos.find((b) => b.is_default)?.name).toBe("Geral");
  });

  test("std::vector em código inline não vira cartão", async ({ page }) => {
    const estado = cenarioPadrao();
    const id = "00000000-0000-4000-8000-00000000f002";
    estado.notas.notas = [{
      id, title: "C++", icon: null,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "std::vector", marks: [{ type: "code" }] }] }] },
      plain_text: "std::vector", track_id: null, archived_at: null, updated_at: "2026-10-07T12:00:00Z", deck_id: null,
    }];
    await prepararTela(page, estado);
    await page.goto(`/dev/notas/${id}`);
    await expect(page.locator("p.cartao-na-nota")).toHaveCount(0);
  });

  test("Início mostra Revisar hoje e leva à sessão", async ({ page }) => {
    const { estado } = comBaralho();
    await prepararTela(page, estado);
    await page.goto("/dev/inicio");
    const card = page.getByRole("region", { name: "Revisar hoje" });
    await expect(card).toContainText("2 cartões esperando você");
    await card.getByRole("link", { name: "Começar" }).click();
    await expect(page).toHaveURL(/\/dev\/flashcards\/revisar$/);
  });
});
```

Run: `.\node_modules\.bin\playwright.cmd test tests/e2e/flashcards.spec.ts`
Expected: PASS. (Se o lab do Início usar outro caminho, ajustar `goto`.)

- [ ] **Step 2: Acessibilidade nos 8 temas**

Copiar a estrutura de `tests/a11y/notas.spec.ts` (mesmo laço de temas e helper `AxeBuilder` com `wcag2a, wcag2aa, wcag21aa, wcag22aa`) para três telas: `/dev/flashcards`, `/dev/flashcards/<deckId>` e `/dev/flashcards/revisar` (com a resposta virada, para medir os 4 botões). Usar `comBaralho()` como no E2E.

Run: `.\node_modules\.bin\playwright.cmd test tests/a11y/flashcards.spec.ts`
Expected: PASS nos 8 temas (24 verificações).

- [ ] **Step 3: Rodada completa**

Run: `.\node_modules\.bin\vitest.cmd run; .\node_modules\.bin\tsc.cmd --noEmit; .\node_modules\.bin\eslint.cmd .; .\node_modules\.bin\prettier.cmd --check .; node node_modules/next/dist/bin/next build; .\node_modules\.bin\playwright.cmd test`
Expected: tudo verde.

- [ ] **Step 4: Documentação**

- `docs/adr/ADR-002-modelo-de-dados-e-rls.md`: emenda "Flashcards" — algoritmo no cliente (abordagem A), funções SECURITY INVOKER, histórico com estado anterior, conflito por `reps`, `salvar_nota` com cartões, `focus_sessions.origin`.
- `CHANGELOG.md`: seção da próxima versão com Flashcards.
- `docs/roadmap.md`: mover Flashcards para "Feito" (depois do merge).

- [ ] **Step 5: Commit e PR**

```bash
git add tests docs CHANGELOG.md
git commit -m "test(flashcards): e2e da revisão e das notas, acessibilidade nos 8 temas; docs"
git push
gh pr create --base main --title "Flashcards com repetição espaçada (FSRS)" --body "<resumo + 'Antes de usar em produção: aplicar a migration 20261015120000_flashcards.sql' + 🤖 Generated with [Claude Code](https://claude.com/claude-code)>"
```

Depois do PR: pedir ao Renan autorização para aplicar a migration no Supabase `ecclywrnrdnzcpggvhcm`, rodar os advisors e regenerar `lib/database.types.ts`.
