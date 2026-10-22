import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, comoVisitante, criarBanco, criarUsuario, type Banco } from "./apoio";

/** Sala pixel: o perfil pixel (pet escolhido e batizado, avatar) é só de cada pessoa. */
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

const adotar = (nome: string, especie = "gato", variacao = "laranja") =>
  `insert into public.pixel_profiles (user_id, pet_species, pet_variant, pet_name)
   values ($1, '${especie}', '${variacao}', '${nome}')`;

describe("pixel_profiles: isolamento", () => {
  it("a pessoa adota, troca e consulta o próprio pet", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query(adotar("Mingau"), [ana]);
      await tx.query(
        "update public.pixel_profiles set pet_name = 'Mingau II', pet_variant = 'preto'",
      );
      return tx.query<{ pet_name: string; pet_variant: string }>(
        "select pet_name, pet_variant from public.pixel_profiles",
      );
    });
    expect(r.rows).toEqual([{ pet_name: "Mingau II", pet_variant: "preto" }]);
  });

  it("a pessoa NÃO vê, edita nem apaga o pet de outra", async () => {
    await db.query(adotar("DaAna", "capivara", "marrom"), [ana]);
    const r = await comoUsuario(db, bia, async (tx) => ({
      vistos: (await tx.query("select 1 from public.pixel_profiles")).rows.length,
      editados: (await tx.query("update public.pixel_profiles set pet_name = 'x'")).affectedRows,
      apagados: (await tx.query("delete from public.pixel_profiles")).affectedRows,
    }));
    expect(r).toEqual({ vistos: 0, editados: 0, apagados: 0 });
  });

  it("a pessoa NÃO adota em nome de outra", async () => {
    expect(await tentar(bia, adotar("Intruso"), [ana])).toMatch(/row-level security/);
  });

  it("visitante sem login não acessa", async () => {
    await expect(
      comoVisitante(db, (tx) => tx.query("select * from public.pixel_profiles")),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("pixel_profiles: regras do banco", () => {
  it("o nome tem de 1 a 24 caracteres, sem quebra de linha", async () => {
    expect(await tentar(bia, adotar(""), [bia])).toMatch(/pet_name|check/);
    expect(await tentar(bia, adotar("   "), [bia])).toMatch(/pet_name|check/);
    expect(await tentar(bia, adotar("x".repeat(25)), [bia])).toMatch(/pet_name|check/);
    expect(
      await tentar(
        bia,
        "insert into public.pixel_profiles (user_id, pet_species, pet_variant, pet_name) values ($1, 'gato', 'cinza', E'Li\\nnha')",
        [bia],
      ),
    ).toMatch(/pet_name|check/);
    expect(await tentar(bia, adotar("x".repeat(24)), [bia])).toBeNull();
  });

  it("espécie e cor são só letras minúsculas e sublinhado (nada de texto livre)", async () => {
    const outra = await criarUsuario(db, {
      email: "caio@exemplo.com",
      metadados: { full_name: "Caio" },
    });
    expect(await tentar(outra, adotar("A", "Gato"), [outra])).toMatch(/pet_species|check/);
    expect(await tentar(outra, adotar("A", "gato", "co r"), [outra])).toMatch(/pet_variant|check/);
    expect(await tentar(outra, adotar("A", "gato_banana", "amarela"), [outra])).toBeNull();
  });

  it("espécie, cor e nome andam juntos: ou o pet está completo ou ainda não existe", async () => {
    const outra = await criarUsuario(db, {
      email: "dani@exemplo.com",
      metadados: { full_name: "Dani" },
    });
    expect(
      await tentar(
        outra,
        "insert into public.pixel_profiles (user_id, pet_species) values ($1, 'gato')",
        [outra],
      ),
    ).toMatch(/pixel_pet_completo|check/);
    // só o avatar (sem pet) é permitido
    expect(
      await tentar(outra, "insert into public.pixel_profiles (user_id) values ($1)", [outra]),
    ).toBeNull();
  });

  it("o avatar precisa ser um objeto JSON", async () => {
    const outra = await criarUsuario(db, {
      email: "edu@exemplo.com",
      metadados: { full_name: "Edu" },
    });
    expect(
      await tentar(
        outra,
        "insert into public.pixel_profiles (user_id, avatar) values ($1, '[1,2]'::jsonb)",
        [outra],
      ),
    ).toMatch(/avatar|check/);
  });

  it("apagar a conta apaga o perfil pixel (cascade)", async () => {
    const outra = await criarUsuario(db, {
      email: "fabi@exemplo.com",
      metadados: { full_name: "Fabi" },
    });
    await db.query(adotar("Temporário"), [outra]);
    await db.query("delete from auth.users where id = $1", [outra]);
    const r = await db.query("select 1 from public.pixel_profiles where user_id = $1", [outra]);
    expect(r.rows).toHaveLength(0);
  });
});

describe("pixel_profiles: acessório do pet", () => {
  it("põe, troca e tira o acessório do próprio pet", async () => {
    const r = await comoUsuario(db, bia, async (tx) => {
      await tx.query("delete from public.pixel_profiles");
      await tx.query(adotar("Capi", "capivara", "ruiva"), [bia]);
      await tx.query("update public.pixel_profiles set pet_accessory = 'fone'");
      const com = await tx.query<{ pet_accessory: string | null }>(
        "select pet_accessory from public.pixel_profiles",
      );
      await tx.query("update public.pixel_profiles set pet_accessory = null");
      const sem = await tx.query<{ pet_accessory: string | null }>(
        "select pet_accessory from public.pixel_profiles",
      );
      return [com.rows[0]!.pet_accessory, sem.rows[0]!.pet_accessory];
    });
    expect(r).toEqual(["fone", null]);
  });

  it("recusa texto estranho no acessório (só letras minúsculas e _)", async () => {
    // Fora de transação: o pet da Bia precisa existir para o update ter o que conferir.
    await db.query(adotar("Capi", "capivara", "ruiva") + " on conflict (user_id) do nothing", [
      bia,
    ]);
    for (const ruim of ["Fone", "<script>", "fone de ouvido", "", "a".repeat(21)]) {
      const erro = await tentar(
        bia,
        "update public.pixel_profiles set pet_accessory = $1 where user_id = $2",
        [ruim, bia],
      );
      expect(erro, ruim).toMatch(/pixel_pet_accessory_check/);
    }
  });

  it("não existe acessório sem pet", async () => {
    const caio = await criarUsuario(db, {
      email: "caio@exemplo.com",
      metadados: { full_name: "Caio" },
    });
    const erro = await tentar(
      caio,
      "insert into public.pixel_profiles (user_id, pet_accessory) values ($1, 'laco')",
      [caio],
    );
    expect(erro).toMatch(/pixel_acessorio_com_pet/);
  });
});
