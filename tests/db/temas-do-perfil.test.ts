import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OPCOES_DE_TEMA } from "@/lib/tema";
import { comoUsuario, criarBanco, criarUsuario, type Banco } from "./apoio";

/** O CHECK de profiles.theme precisa aceitar exatamente os temas que o app oferece. */
let db: Banco;
let ana: string;

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, { email: "ana@exemplo.com" });
});
afterAll(async () => {
  await db.close();
});

describe("profiles.theme", () => {
  it.each(OPCOES_DE_TEMA)("aceita o tema %s", async (tema) => {
    // (comoUsuario desfaz a transação no fim, então conferimos dentro dela)
    const lido = await comoUsuario(db, ana, async (tx) => {
      await tx.query("update public.profiles set theme = $1 where id = $2", [tema, ana]);
      return tx.query<{ theme: string }>("select theme from public.profiles where id = $1", [ana]);
    });
    expect(lido.rows[0]?.theme).toBe(tema);
  });

  it("recusa tema que não existe", async () => {
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query("update public.profiles set theme = 'neon' where id = $1", [ana]),
      ),
    ).rejects.toThrow(/profiles_theme_check/);
  });
});
