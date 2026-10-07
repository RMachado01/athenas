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
