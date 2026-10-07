-- =============================================================================
-- Migration 0002 — Trilhas (tracks)
--
-- Primeira tabela "do usuário" do app. Serve de modelo para todas as próximas
-- (tarefas, metas, sessões de foco…): tem `user_id`, RLS por dono e uma chave
-- única (user_id, id) que permite FOREIGN KEYS COMPOSTAS nas tabelas filhas.
--
-- Por que FK composta? Sem ela, uma tarefa poderia apontar para a trilha de OUTRA
-- pessoa (basta saber o UUID) mesmo com RLS. Com (user_id, track_id) o banco recusa.
-- =============================================================================

create table public.tracks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  -- Monograma (1–3 letras) que aparece no círculo da trilha, em Cormorant.
  monogram    text not null check (char_length(monogram) between 1 and 3),
  sort_order  integer not null default 0,
  -- Arquivar em vez de apagar preserva o histórico de horas estudadas.
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Habilita as FKs compostas (user_id, track_id) nas tabelas que referenciarem trilhas.
  constraint tracks_user_id_id_key unique (user_id, id)
);

-- Nome único por pessoa entre as trilhas ativas (sem diferenciar maiúscula/minúscula).
create unique index tracks_user_name_ativa_key
  on public.tracks (user_id, lower(name))
  where archived_at is null;

create index tracks_user_sort_idx on public.tracks (user_id, sort_order);

create trigger tracks_set_updated_at
  before update on public.tracks
  for each row execute function private.set_updated_at();

alter table public.tracks enable row level security;
alter table public.tracks force row level security;

revoke all on public.tracks from anon, authenticated;
grant select, insert, update, delete on public.tracks to authenticated;

create policy "tracks_select_proprias" on public.tracks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "tracks_insert_proprias" on public.tracks
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "tracks_update_proprias" on public.tracks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tracks_delete_proprias" on public.tracks
  for delete to authenticated
  using (user_id = (select auth.uid()));
