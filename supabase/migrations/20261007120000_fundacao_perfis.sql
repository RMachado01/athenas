-- =============================================================================
-- Migration 0001 — Fundação: perfis privados, perfis públicos e criação no cadastro
--
-- Ideia central (ADR-002 e ADR-006): cada pessoa tem DOIS perfis separados.
--   * public.profiles         -> PRIVADO. Preferências, fuso, metas. Só o dono lê.
--   * public.public_profiles  -> PÚBLICO. Handle, nome, avatar, bio. Outros usuários leem.
-- Separar cedo evita expor sem querer um campo privado quando chegarem os grupos.
--
-- Regra de segurança: TODA tabela tem RLS ligada e o papel `anon` (visitante sem login)
-- não recebe nenhum acesso. Quem não fez login não vê nada.
-- =============================================================================

-- Extensão para o handle (@usuario) ser único sem diferenciar maiúscula de minúscula.
create extension if not exists citext with schema extensions;

-- Schema "private": funções internas que NÃO ficam expostas pela API do Supabase.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Função utilitária: mantém updated_at correto sem depender da aplicação.
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (PRIVADO)
-- -----------------------------------------------------------------------------
create table public.profiles (
  -- Mesmo id do usuário de login (auth.users). Se a conta for excluída, o perfil some junto.
  id                         uuid primary key references auth.users (id) on delete cascade,
  display_name               text not null default '' check (char_length(display_name) <= 60),

  -- Aparência (ADR-003). `appearance` guarda acento, densidade, fonte… em JSON.
  theme                      text not null default 'auto'
                               check (theme in ('ponderosa', 'burgundy', 'camel', 'auto')),
  motion                     text not null default 'system'
                               check (motion in ('system', 'full', 'reduced')),
  appearance                 jsonb not null default '{}'::jsonb
                               check (jsonb_typeof(appearance) = 'object'),

  -- Fuso e idioma: o "dia" de estudo de cada pessoa é calculado no fuso dela (ADR-002).
  timezone                   text not null default 'America/Sao_Paulo'
                               check (char_length(timezone) between 1 and 64),
  locale                     text not null default 'pt-BR',

  -- Metas e pomodoro (valores iniciais do design system).
  daily_goal_min             integer not null default 240  check (daily_goal_min between 5 and 1440),
  streak_min_min             integer not null default 30   check (streak_min_min between 1 and 1440),
  pomodoro_focus_min         integer not null default 25   check (pomodoro_focus_min between 1 and 180),
  pomodoro_break_min         integer not null default 5    check (pomodoro_break_min between 1 and 60),
  pomodoro_long_break_min    integer not null default 15   check (pomodoro_long_break_min between 1 and 120),
  pomodoro_cycle_length      integer not null default 4    check (pomodoro_cycle_length between 2 and 10),

  -- Dia de descanso da semana (0 = domingo … 6 = sábado). Nulo = sem dia de descanso.
  rest_weekday               smallint check (rest_weekday between 0 and 6),

  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil PRIVADO (preferências). Só o dono lê/edita. Nunca exibir a outros usuários.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- Nada de acesso para visitantes; usuário logado só lê e edita (nunca cria/apaga direto:
-- a criação é feita pelo gatilho de cadastro e a exclusão acontece junto com a conta).
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

create policy "profiles_select_proprio" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_proprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- public_profiles (PÚBLICO para usuários logados)
-- -----------------------------------------------------------------------------
create table public.public_profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  -- @usuario: 3 a 20 caracteres, só minúsculas, números e "_". Único sem diferenciar caixa.
  handle         extensions.citext not null unique
                   check (handle::text ~ '^[a-z0-9_]{3,20}$'),
  display_name   text not null check (char_length(btrim(display_name)) between 1 and 60),
  avatar_url     text check (avatar_url is null or avatar_url ~ '^https://'),
  bio            text not null default '' check (char_length(bio) <= 280),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.public_profiles is
  'Identidade pública mínima. Qualquer usuário logado lê; só o dono edita.';

create trigger public_profiles_set_updated_at
  before update on public.public_profiles
  for each row execute function private.set_updated_at();

alter table public.public_profiles enable row level security;
alter table public.public_profiles force row level security;

revoke all on public.public_profiles from anon, authenticated;
grant select, update on public.public_profiles to authenticated;

create policy "public_profiles_select_autenticados" on public.public_profiles
  for select to authenticated
  using (true);

create policy "public_profiles_update_proprio" on public.public_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Cadastro: ao criar um usuário de login, cria os dois perfis automaticamente.
-- security definer = roda com os poderes do dono da função (necessário, pois o novo usuário
-- ainda não tem permissão de inserir). search_path vazio = nenhuma função "falsa" pode ser
-- injetada; por isso tudo abaixo usa nomes completos (public.profiles etc.).
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nome       text;
  base       text;
  candidato  text;
  tentativas integer := 0;
begin
  -- Nome vindo do Google (full_name/name) ou, na falta, a parte local do e-mail.
  nome := left(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  )), 60);
  if nome = '' then
    nome := 'Estudante';
  end if;

  insert into public.profiles (id, display_name) values (new.id, nome);

  -- Handle inicial = parte local do e-mail (sanitizada) + sufixo aleatório. A pessoa pode trocar depois.
  base := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'), 12);
  if char_length(base) < 3 then
    base := 'estudante';
  end if;

  loop
    candidato := base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 5);
    begin
      insert into public.public_profiles (user_id, handle, display_name)
      values (new.id, candidato, nome);
      exit;
    exception when unique_violation then
      tentativas := tentativas + 1;
      if tentativas >= 5 then
        raise;
      end if;
    end;
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
