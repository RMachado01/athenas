-- =============================================================================
-- Migration 0007 — Google Agenda, Etapa 1: importar eventos (somente leitura) — ADR-005
--
-- Peças, em linguagem simples:
--  * private.google_connections: a conexão de cada pessoa com o Google. O token de longa
--    duração (refresh token) NÃO fica aqui: fica CRIPTOGRAFADO no Supabase Vault; guardamos
--    só o id do segredo. O schema `private` não é exposto pela API.
--  * google_calendars: as agendas da pessoa e quais ela quer importar (`enabled`), com um
--    `sync_token` POR AGENDA (o Google exige assim) e uma trava contra sincronização dupla.
--  * calendar_events: os eventos importados. A pessoa só LÊ (quem escreve é o servidor).
--  * Funções `gcal_*` com SECURITY DEFINER, executáveis SÓ pelo service_role (o servidor do
--    app). O navegador nunca toca no token nem grava eventos.
--  * Desconectar apaga o segredo, as agendas e os eventos (dados pessoais sensíveis).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Conexão (privada) + segredo no Vault
-- -----------------------------------------------------------------------------
create table private.google_connections (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  vault_secret_id uuid not null,
  scopes          text[] not null default '{}',
  -- active = funcionando · needs_reauth = token revogado/expirado, pedir "Reconectar"
  status          text not null default 'active' check (status in ('active', 'needs_reauth')),
  last_synced_at  timestamptz,
  last_error      text check (char_length(last_error) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table private.google_connections is
  'Conexão de cada pessoa com o Google Agenda. O refresh token fica no Vault (vault_secret_id).';

create trigger google_connections_set_updated_at
  before update on private.google_connections
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Agendas da pessoa
-- -----------------------------------------------------------------------------
create table public.google_calendars (
  user_id             uuid not null references auth.users (id) on delete cascade,
  google_calendar_id  text not null check (char_length(google_calendar_id) between 1 and 1024),
  summary             text not null default '' check (char_length(summary) <= 300),
  color               text check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_primary          boolean not null default false,
  enabled             boolean not null default true,
  sync_token          text,
  sync_locked_until   timestamptz,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  primary key (user_id, google_calendar_id)
);

comment on table public.google_calendars is
  'Agendas do Google da pessoa. `enabled` = importar. sync_token é por agenda (ADR-005).';

alter table public.google_calendars enable row level security;
alter table public.google_calendars force row level security;

revoke all on public.google_calendars from anon, authenticated;
-- A pessoa lê as próprias agendas e só pode ligar/desligar a importação (coluna `enabled`).
grant select on public.google_calendars to authenticated;
grant update (enabled) on public.google_calendars to authenticated;

create policy "google_calendars_select_proprias" on public.google_calendars
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "google_calendars_update_proprias" on public.google_calendars
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Eventos importados (somente leitura para a pessoa)
-- -----------------------------------------------------------------------------
create table public.calendar_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  google_calendar_id  text not null,
  google_event_id     text not null check (char_length(google_event_id) between 1 and 1024),
  title               text not null default '' check (char_length(title) <= 500),
  all_day             boolean not null default false,
  -- Evento com horário: starts_at/ends_at (UTC). Dia inteiro: start_date/end_date (end exclusivo).
  starts_at           timestamptz,
  ends_at             timestamptz,
  start_date          date,
  end_date            date,
  google_updated_at   timestamptz,
  synced_at           timestamptz not null default now(),

  constraint calendar_events_unico unique (user_id, google_calendar_id, google_event_id),
  -- Apagar a agenda (ou desconectar) leva os eventos junto.
  constraint calendar_events_agenda_fk foreign key (user_id, google_calendar_id)
    references public.google_calendars (user_id, google_calendar_id) on delete cascade,
  constraint calendar_events_horario_coerente check (
    (all_day and start_date is not null and end_date is not null and end_date > start_date
       and starts_at is null and ends_at is null)
    or
    (not all_day and starts_at is not null and ends_at is not null and ends_at >= starts_at
       and start_date is null and end_date is null)
  )
);

comment on table public.calendar_events is
  'Eventos importados do Google Agenda (somente leitura). Dado pessoal sensível: nunca entra em agregados de grupo.';

create index calendar_events_user_inicio_idx on public.calendar_events (user_id, starts_at);
create index calendar_events_user_dia_idx on public.calendar_events (user_id, start_date);

alter table public.calendar_events enable row level security;
alter table public.calendar_events force row level security;

revoke all on public.calendar_events from anon, authenticated;
grant select on public.calendar_events to authenticated;

create policy "calendar_events_select_proprios" on public.calendar_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Funções do servidor (service_role). SECURITY DEFINER = rodam com os poderes do dono
-- da migration (acessam `private` e o Vault), por isso: search_path vazio, nomes completos
-- e EXECUTE revogado de todo mundo, menos do service_role.
-- -----------------------------------------------------------------------------

-- Grava (ou troca) a conexão e o refresh token, criptografado no Vault.
create function public.gcal_salvar_conexao(p_user uuid, p_refresh_token text, p_scopes text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
begin
  if p_user is null or coalesce(p_refresh_token, '') = '' then
    raise exception 'gcal_salvar_conexao: usuário e token são obrigatórios';
  end if;

  select vault_secret_id into v_secret from private.google_connections where user_id = p_user;

  if v_secret is null then
    v_secret := vault.create_secret(p_refresh_token, 'gcal_refresh_' || p_user::text,
                                    'Refresh token do Google Agenda');
    insert into private.google_connections (user_id, vault_secret_id, scopes)
    values (p_user, v_secret, coalesce(p_scopes, '{}'));
  else
    perform vault.update_secret(v_secret, p_refresh_token);
    update private.google_connections
       set scopes = coalesce(p_scopes, '{}'), status = 'active', last_error = null
     where user_id = p_user;
  end if;
end;
$$;

-- Lê o refresh token (só o servidor, na hora de sincronizar).
create function public.gcal_ler_refresh_token(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
  from private.google_connections c
  join vault.decrypted_secrets s on s.id = c.vault_secret_id
  where c.user_id = p_user
$$;

-- Atualiza o estado da conexão (sincronizou / deu erro / precisa reconectar).
create function public.gcal_marcar_conexao(p_user uuid, p_status text, p_erro text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.google_connections
     set status = p_status,
         last_error = left(p_erro, 500),
         last_synced_at = case when p_status = 'active' and p_erro is null then now()
                               else last_synced_at end
   where user_id = p_user
$$;

-- Trava uma agenda para sincronizar (compare-and-set): devolve true só para quem conseguiu.
create function public.gcal_travar_agenda(p_user uuid, p_calendar text, p_segundos integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with travada as (
    update public.google_calendars
       set sync_locked_until = now() + make_interval(secs => p_segundos)
     where user_id = p_user
       and google_calendar_id = p_calendar
       and (sync_locked_until is null or sync_locked_until < now())
    returning 1
  )
  select exists (select 1 from travada)
$$;

-- Aplica um lote de mudanças vindas do Google NUMA transação só, junto com o novo sync_token
-- (eventos e token nunca ficam fora de sincronia). `p_completo` = carga completa: substitui
-- todos os eventos da agenda pelo lote.
create function public.gcal_aplicar_lote(
  p_user uuid,
  p_calendar text,
  p_eventos jsonb,
  p_remover text[],
  p_sync_token text,
  p_completo boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_completo then
    delete from public.calendar_events where user_id = p_user and google_calendar_id = p_calendar;
  elsif coalesce(array_length(p_remover, 1), 0) > 0 then
    delete from public.calendar_events
     where user_id = p_user and google_calendar_id = p_calendar
       and google_event_id = any (p_remover);
  end if;

  insert into public.calendar_events (
    user_id, google_calendar_id, google_event_id, title, all_day,
    starts_at, ends_at, start_date, end_date, google_updated_at, synced_at
  )
  select
    p_user, p_calendar, e->>'google_event_id', coalesce(e->>'title', ''),
    coalesce((e->>'all_day')::boolean, false),
    (e->>'starts_at')::timestamptz, (e->>'ends_at')::timestamptz,
    (e->>'start_date')::date, (e->>'end_date')::date,
    (e->>'google_updated_at')::timestamptz, now()
  from jsonb_array_elements(coalesce(p_eventos, '[]'::jsonb)) as e
  on conflict (user_id, google_calendar_id, google_event_id) do update set
    title = excluded.title,
    all_day = excluded.all_day,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    google_updated_at = excluded.google_updated_at,
    synced_at = excluded.synced_at;

  update public.google_calendars
     set sync_token = p_sync_token, last_synced_at = now(), sync_locked_until = null
   where user_id = p_user and google_calendar_id = p_calendar;
end;
$$;

-- Desconecta: apaga o segredo do Vault, a conexão, as agendas e (em cascata) os eventos.
create function public.gcal_remover_conexao(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret uuid;
begin
  select vault_secret_id into v_secret from private.google_connections where user_id = p_user;
  delete from public.google_calendars where user_id = p_user;
  delete from private.google_connections where user_id = p_user;
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
end;
$$;

revoke all on function public.gcal_salvar_conexao(uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.gcal_ler_refresh_token(uuid) from public, anon, authenticated;
revoke all on function public.gcal_marcar_conexao(uuid, text, text) from public, anon, authenticated;
revoke all on function public.gcal_travar_agenda(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.gcal_aplicar_lote(uuid, text, jsonb, text[], text, boolean) from public, anon, authenticated;
revoke all on function public.gcal_remover_conexao(uuid) from public, anon, authenticated;

grant execute on function public.gcal_salvar_conexao(uuid, text, text[]) to service_role;
grant execute on function public.gcal_ler_refresh_token(uuid) to service_role;
grant execute on function public.gcal_marcar_conexao(uuid, text, text) to service_role;
grant execute on function public.gcal_travar_agenda(uuid, text, integer) to service_role;
grant execute on function public.gcal_aplicar_lote(uuid, text, jsonb, text[], text, boolean) to service_role;
grant execute on function public.gcal_remover_conexao(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Estado da conexão para a tela (a pessoa vê só a dela; nunca o token).
-- -----------------------------------------------------------------------------
create function public.minha_conexao_google()
returns table (status text, last_synced_at timestamptz, last_error text, scopes text[])
language sql
stable
security definer
set search_path = ''
as $$
  select c.status, c.last_synced_at, c.last_error, c.scopes
  from private.google_connections c
  where c.user_id = (select auth.uid())
$$;

revoke all on function public.minha_conexao_google() from public, anon;
grant execute on function public.minha_conexao_google() to authenticated;
