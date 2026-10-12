import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";

/**
 * Apoio dos testes de banco.
 *
 * Em vez de Docker, usamos o PGlite: um Postgres de verdade compilado para WebAssembly.
 * Cada teste recebe um banco novo com (1) o stub do Supabase e (2) TODAS as migrations
 * reais de supabase/migrations, na ordem. Ou seja: testamos o mesmo SQL que vai para produção.
 */
const RAIZ = process.cwd();

export type Banco = PGlite;

export async function criarBanco(): Promise<Banco> {
  const db = new PGlite({ extensions: { citext } });

  await db.exec(readFileSync(join(RAIZ, "tests/db/supabase-stub.sql"), "utf-8"));

  const pasta = join(RAIZ, "supabase/migrations");
  const arquivos = readdirSync(pasta)
    .filter((nome) => nome.endsWith(".sql"))
    .sort(); // o prefixo de data garante a ordem correta
  for (const arquivo of arquivos) {
    await db.exec(readFileSync(join(pasta, arquivo), "utf-8"));
  }
  return db;
}

/** Cria um usuário de login (como o Supabase faria no cadastro) e devolve o id. */
export async function criarUsuario(
  db: Banco,
  dados: { email?: string | null; metadados?: Record<string, unknown> } = {},
): Promise<string> {
  const res = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id",
    [dados.email === undefined ? null : dados.email, JSON.stringify(dados.metadados ?? {})],
  );
  const id = res.rows[0]?.id;
  if (!id) throw new Error("Falha ao criar usuário de teste");
  return id;
}

/**
 * Executa `fn` "como se fosse" o usuário logado: papel `authenticated` + token com o id dele.
 * É exatamente o que a API do Supabase faz a cada requisição. Tudo roda numa transação que
 * é desfeita no fim (os dados do teste não vazam para o próximo passo).
 */
export async function comoUsuario<T>(
  db: Banco,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let resultado: T | undefined;
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    resultado = await fn(tx);
    await tx.rollback();
  });
  return resultado as T;
}

/** Igual a comoUsuario, mas como visitante (sem login): papel `anon`. */
export async function comoVisitante<T>(db: Banco, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let resultado: T | undefined;
  await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    resultado = await fn(tx);
    await tx.rollback();
  });
  return resultado as T;
}

/**
 * Executa `fn` como o SERVIDOR do app (papel `service_role`, que ignora a RLS e é o único que
 * pode chamar as funções `gcal_*`). Diferente dos outros, aqui a transação É GRAVADA (commit):
 * é assim que o servidor prepara os dados que a pessoa vai ler depois.
 */
export async function comoServidor<T>(db: Banco, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let resultado: T | undefined;
  await db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    resultado = await fn(tx);
  });
  return resultado as T;
}

/** Igual a comoUsuario, mas GRAVA (commit): para testes em que a ação precisa persistir. */
export async function comoUsuarioGravando<T>(
  db: Banco,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let resultado: T | undefined;
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    resultado = await fn(tx);
  });
  return resultado as T;
}
