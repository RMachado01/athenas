import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comoUsuario, comoVisitante, criarBanco, criarUsuario, type Banco } from "./apoio";

/**
 * Testes de isolamento entre usuários (RLS) das migrations da Fundação.
 *
 * A pergunta que cada teste responde: "a pessoa B consegue ver ou mexer no que é da pessoa A?"
 * A resposta tem que ser SEMPRE não. Se algum teste daqui falhar, há vazamento de dados.
 */
let db: Banco;
let ana: string; // usuária A
let bia: string; // usuária B

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, {
    email: "ana.silva@exemplo.com",
    metadados: { full_name: "Ana Silva" },
  });
  bia = await criarUsuario(db, { email: "bia@exemplo.com", metadados: { name: "Bia Costa" } });
});

afterAll(async () => {
  await db.close();
});

describe("cadastro: gatilho que cria os perfis", () => {
  it("cria perfil privado e perfil público ao inserir o usuário de login", async () => {
    const priv = await db.query<{ display_name: string; theme: string }>(
      "select display_name, theme from public.profiles where id = $1",
      [ana],
    );
    expect(priv.rows).toEqual([{ display_name: "Ana Silva", theme: "auto" }]);

    const pub = await db.query<{ handle: string; display_name: string }>(
      "select handle::text as handle, display_name from public.public_profiles where user_id = $1",
      [ana],
    );
    expect(pub.rows).toHaveLength(1);
    expect(pub.rows[0]?.display_name).toBe("Ana Silva");
    expect(pub.rows[0]?.handle).toMatch(/^anasilva_[0-9a-f]{5}$/);
  });

  it("usa o nome do e-mail quando o login não traz nome", async () => {
    const id = await criarUsuario(db, { email: "carlos@exemplo.com" });
    const r = await db.query<{ display_name: string }>(
      "select display_name from public.profiles where id = $1",
      [id],
    );
    expect(r.rows[0]?.display_name).toBe("carlos");
  });

  it("não quebra sem e-mail (ex.: login por telefone) e gera handle válido", async () => {
    const id = await criarUsuario(db, { email: null });
    const r = await db.query<{ handle: string; display_name: string }>(
      "select handle::text as handle, display_name from public.public_profiles where user_id = $1",
      [id],
    );
    expect(r.rows[0]?.display_name).toBe("Estudante");
    expect(r.rows[0]?.handle).toMatch(/^estudante_[0-9a-f]{5}$/);
  });

  it("e-mails parecidos geram handles diferentes (sem colisão)", async () => {
    const a = await criarUsuario(db, { email: "igual@a.com" });
    const b = await criarUsuario(db, { email: "igual@b.com" });
    const r = await db.query<{ handle: string }>(
      "select handle::text as handle from public.public_profiles where user_id = any($1)",
      [[a, b]],
    );
    expect(new Set(r.rows.map((x) => x.handle)).size).toBe(2);
  });

  it("apagar o usuário de login apaga os perfis junto (LGPD: exclusão de conta)", async () => {
    const id = await criarUsuario(db, { email: "sai@exemplo.com" });
    await db.query("delete from auth.users where id = $1", [id]);
    const p = await db.query("select 1 from public.profiles where id = $1", [id]);
    const q = await db.query("select 1 from public.public_profiles where user_id = $1", [id]);
    expect(p.rows).toHaveLength(0);
    expect(q.rows).toHaveLength(0);
  });
});

describe("profiles (privado)", () => {
  it("a pessoa vê o próprio perfil", async () => {
    const r = await comoUsuario(db, ana, (tx) => tx.query("select id from public.profiles"));
    expect(r.rows).toEqual([{ id: ana }]);
  });

  it("a pessoa NÃO vê o perfil privado de outra (a lista vem só com o dela)", async () => {
    const r = await comoUsuario(db, bia, (tx) =>
      tx.query("select id from public.profiles where id = $1", [ana]),
    );
    expect(r.rows).toHaveLength(0);
  });

  it("a pessoa NÃO consegue alterar o perfil de outra (0 linhas afetadas)", async () => {
    const r = await comoUsuario(db, bia, (tx) =>
      tx.query("update public.profiles set theme = 'camel' where id = $1", [ana]),
    );
    expect(r.affectedRows).toBe(0);
  });

  it("a pessoa altera o próprio perfil e updated_at avança", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query("update public.profiles set theme = 'camel', daily_goal_min = 180");
      return tx.query<{ theme: string; daily_goal_min: number; mudou: boolean }>(
        "select theme, daily_goal_min, updated_at >= created_at as mudou from public.profiles",
      );
    });
    expect(r.rows[0]).toEqual({ theme: "camel", daily_goal_min: 180, mudou: true });
  });

  it("a pessoa NÃO consegue 'passar' o perfil para outro id", async () => {
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("update public.profiles set id = $1", [bia])),
    ).rejects.toThrow(/row-level security|violates|permission denied/);
  });

  it("cliente não consegue criar nem apagar perfis diretamente", async () => {
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query("insert into public.profiles (id) values (gen_random_uuid())"),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("delete from public.profiles")),
    ).rejects.toThrow(/permission denied/);
  });

  it("valores inválidos são recusados pelo banco (tema, metas, descanso)", async () => {
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("update public.profiles set theme = 'roxo'")),
    ).rejects.toThrow(/check constraint/);
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("update public.profiles set daily_goal_min = 0")),
    ).rejects.toThrow(/check constraint/);
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("update public.profiles set rest_weekday = 9")),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("public_profiles (identidade pública)", () => {
  it("usuário logado lê o perfil público de outras pessoas", async () => {
    const r = await comoUsuario(db, bia, (tx) =>
      tx.query<{ display_name: string }>(
        "select display_name from public.public_profiles where user_id = $1",
        [ana],
      ),
    );
    expect(r.rows[0]?.display_name).toBe("Ana Silva");
  });

  it("mas NÃO expõe nada do perfil privado (colunas privadas não existem aqui)", async () => {
    const r = await comoUsuario(db, bia, (tx) =>
      tx.query("select * from public.public_profiles where user_id = $1", [ana]),
    );
    const colunas = Object.keys(r.rows[0] ?? {});
    expect(colunas).not.toContain("timezone");
    expect(colunas).not.toContain("daily_goal_min");
    expect(colunas).not.toContain("theme");
  });

  it("a pessoa NÃO altera o perfil público de outra", async () => {
    const r = await comoUsuario(db, bia, (tx) =>
      tx.query("update public.public_profiles set bio = 'invadido' where user_id = $1", [ana]),
    );
    expect(r.affectedRows).toBe(0);
  });

  it("a pessoa altera o próprio perfil público", async () => {
    const r = await comoUsuario(db, ana, (tx) =>
      tx.query("update public.public_profiles set bio = 'Estudando SQL' where user_id = $1", [ana]),
    );
    expect(r.affectedRows).toBe(1);
  });

  it("handle: só minúsculas, números e _ (3 a 20) e único", async () => {
    for (const ruim of ["AB", "com espaço", "Maiuscula", "x".repeat(21), "acento_é"]) {
      await expect(
        comoUsuario(db, ana, (tx) =>
          tx.query("update public.public_profiles set handle = $1", [ruim]),
        ),
        `handle "${ruim}" deveria ser recusado`,
      ).rejects.toThrow(/check constraint/);
    }

    // Dono do banco fixa um handle bom para a Bia; a Ana não pode pegar o mesmo.
    await db.query("update public.public_profiles set handle = 'bia_costa' where user_id = $1", [
      bia,
    ]);
    await expect(
      db.query("update public.public_profiles set handle = 'bia_costa' where user_id = $1", [ana]),
    ).rejects.toThrow(/unique|duplicate/);
  });

  it("avatar só aceita https", async () => {
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query("update public.public_profiles set avatar_url = 'javascript:alert(1)'"),
      ),
    ).rejects.toThrow(/check constraint|permission denied/);
  });
});

describe("visitante sem login (papel anon)", () => {
  it.each(["profiles", "public_profiles", "tracks"])("não acessa public.%s", async (tabela) => {
    await expect(
      comoVisitante(db, (tx) => tx.query(`select * from public.${tabela}`)),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("tracks (trilhas)", () => {
  it("a pessoa cria, lê, edita e apaga as próprias trilhas", async () => {
    const r = await comoUsuario(db, ana, async (tx) => {
      await tx.query(
        "insert into public.tracks (user_id, name, monogram) values ($1, 'SQL', 'S')",
        [ana],
      );
      await tx.query("update public.tracks set name = 'SQL avançado'");
      const lido = await tx.query<{ name: string }>("select name from public.tracks");
      const apagado = await tx.query("delete from public.tracks");
      return { lido: lido.rows, apagadas: apagado.affectedRows };
    });
    expect(r.lido).toEqual([{ name: "SQL avançado" }]);
    expect(r.apagadas).toBe(1);
  });

  it("a pessoa NÃO cria trilha em nome de outra (with check)", async () => {
    await expect(
      comoUsuario(db, bia, (tx) =>
        tx.query(
          "insert into public.tracks (user_id, name, monogram) values ($1, 'Roubada', 'R')",
          [ana],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a pessoa NÃO vê, edita nem apaga trilhas de outra", async () => {
    const trilha = await db.query<{ id: string }>(
      "insert into public.tracks (user_id, name, monogram) values ($1, 'Python', 'Py') returning id",
      [ana],
    );
    const id = trilha.rows[0]?.id;

    const r = await comoUsuario(db, bia, async (tx) => ({
      vistas: (await tx.query("select * from public.tracks where id = $1", [id])).rows.length,
      editadas: (await tx.query("update public.tracks set name = 'x' where id = $1", [id]))
        .affectedRows,
      apagadas: (await tx.query("delete from public.tracks where id = $1", [id])).affectedRows,
    }));
    expect(r).toEqual({ vistas: 0, editadas: 0, apagadas: 0 });

    // E a dona continua com a trilha intacta.
    const dona = await db.query<{ name: string }>("select name from public.tracks where id = $1", [
      id,
    ]);
    expect(dona.rows[0]?.name).toBe("Python");
  });

  it("a pessoa NÃO move a própria trilha para outro dono (update com with check)", async () => {
    const t = await db.query<{ id: string }>(
      "insert into public.tracks (user_id, name, monogram) values ($1, 'Azure', 'A') returning id",
      [ana],
    );
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query("update public.tracks set user_id = $1 where id = $2", [bia, t.rows[0]?.id]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("nome duplicado entre trilhas ATIVAS da mesma pessoa é recusado; arquivada libera o nome", async () => {
    await db.query(
      "insert into public.tracks (user_id, name, monogram) values ($1, 'Inglês', 'I')",
      [ana],
    );
    await expect(
      db.query("insert into public.tracks (user_id, name, monogram) values ($1, 'INGLÊS', 'I')", [
        ana,
      ]),
    ).rejects.toThrow(/unique|duplicate/);

    await db.query(
      "update public.tracks set archived_at = now() where user_id = $1 and name = 'Inglês'",
      [ana],
    );
    await expect(
      db.query("insert into public.tracks (user_id, name, monogram) values ($1, 'Inglês', 'I')", [
        ana,
      ]),
    ).resolves.toBeDefined();

    // Pessoas diferentes podem ter trilhas com o mesmo nome.
    await expect(
      db.query("insert into public.tracks (user_id, name, monogram) values ($1, 'Inglês', 'I')", [
        bia,
      ]),
    ).resolves.toBeDefined();
  });

  it("valida nome vazio e monograma grande demais", async () => {
    await expect(
      db.query("insert into public.tracks (user_id, name, monogram) values ($1, '   ', 'X')", [
        ana,
      ]),
    ).rejects.toThrow(/check constraint/);
    await expect(
      db.query("insert into public.tracks (user_id, name, monogram) values ($1, 'Ok', 'ABCD')", [
        ana,
      ]),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("schema private", () => {
  it("o usuário logado não enxerga as funções internas", async () => {
    await expect(
      comoUsuario(db, ana, (tx) => tx.query("select private.handle_new_user()")),
    ).rejects.toThrow(/permission denied/);
  });
});
