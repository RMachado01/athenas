-- Stub mínimo do que o Supabase já fornece pronto, para testarmos as migrations
-- num Postgres puro (PGlite), sem Docker. NÃO é uma migration: nunca vai para o banco real.
--
-- O que o Supabase tem e replicamos aqui:
--   * papéis anon (visitante), authenticated (logado) e service_role (servidor, ignora RLS);
--   * schemas auth e extensions;
--   * tabela auth.users e a função auth.uid() (lê o "sub" do token, igual ao Supabase);
--   * privilégios padrão: tabelas novas do schema public nascem acessíveis a esses papéis
--     (por isso nossas migrations fazem REVOKE explícito e depois GRANT só do necessário).

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create schema extensions;

grant usage on schema public, auth, extensions to anon, authenticated, service_role;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text,
  raw_user_meta_data  jsonb not null default '{}'::jsonb
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Vault (cofre de segredos do Supabase). No Supabase de verdade o segredo é criptografado
-- (pgsodium); aqui guardamos em texto só para testar o CAMINHO (quem pode ler, quando apaga).
-- Mesmas assinaturas das funções reais: vault.create_secret, vault.update_secret e a view
-- vault.decrypted_secrets.
-- -----------------------------------------------------------------------------
create schema vault;

create table vault.secrets (
  id          uuid primary key default gen_random_uuid(),
  name        text unique,
  description text not null default '',
  secret      text not null
);

create function vault.create_secret(
  new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null
)
returns uuid
language sql
as $$
  insert into vault.secrets (secret, name, description)
  values (new_secret, new_name, coalesce(new_description, ''))
  returning id
$$;

create function vault.update_secret(
  secret_id uuid, new_secret text default null, new_name text default null,
  new_description text default null, new_key_id uuid default null
)
returns void
language sql
as $$
  update vault.secrets
     set secret = coalesce(new_secret, secret),
         name = coalesce(new_name, name),
         description = coalesce(new_description, description)
   where id = secret_id
$$;

create view vault.decrypted_secrets as
  select id, name, description, secret, secret as decrypted_secret from vault.secrets;

-- Como no Supabase: ninguém da API enxerga o cofre.
revoke all on schema vault from public;