import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Endurecimento antes de publicar: a pessoa só altera as colunas que a tela edita, e as chaves
 * estrangeiras compostas têm índice.
 */
let db: Banco;
let ana: string;

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com", metadados: { full_name: "Ana" } });
});

afterAll(async () => {
  await db.close();
});

/** Roda o UPDATE como a Ana e devolve a mensagem de erro (ou null se passou). */
async function tentar(sql: string): Promise<string | null> {
  return comoUsuario(db, ana, async (tx) => {
    try {
      await tx.query(sql);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  });
}

describe("perfil privado: só colunas editáveis", () => {
  it("continua salvando o que a Personalização edita", async () => {
    expect(
      await tentar(
        "update public.profiles set theme = 'mono', motion = 'reduced', daily_goal_min = 90, appearance = '{}'::jsonb",
      ),
    ).toBeNull();
  });

  it("recusa forjar a data de criação", async () => {
    expect(await tentar("update public.profiles set created_at = '2000-01-01'")).toMatch(
      /permission denied/,
    );
  });
});

describe("perfil público: só handle, nome e bio", () => {
  it("salva nome, bio e handle", async () => {
    expect(
      await tentar(
        "update public.public_profiles set display_name = 'Ana S.', bio = 'Estudando', handle = 'ana_s'",
      ),
    ).toBeNull();
  });

  it("recusa avatar com link externo (a foto vai por função própria)", async () => {
    expect(
      await tentar("update public.public_profiles set avatar_url = 'https://rastreador.exemplo/x.png'"),
    ).toMatch(/permission denied/);
  });

  it("recusa mudar a data de criação", async () => {
    expect(await tentar("update public.public_profiles set created_at = now()")).toMatch(
      /permission denied/,
    );
  });
});

describe("índices das chaves estrangeiras compostas", () => {
  it("toda chave estrangeira do esquema public tem índice começando pelas mesmas colunas", async () => {
    const r = await db.query<{ tabela: string; restricao: string }>(`
      select c.conrelid::regclass::text as tabela, c.conname as restricao
      from pg_constraint c
      where c.contype = 'f'
        and c.connamespace = 'public'::regnamespace
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] @> c.conkey
            and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] <@ c.conkey
        )
      order by 1, 2`);
    expect(r.rows).toEqual([]);
  });
});
