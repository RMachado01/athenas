-- =============================================================================
-- Migration 0006 — Metas (goals) com progresso calculado pelo banco
--
-- Decisões desta migration:
--  * Uma meta é "X minutos de foco" ou "X tarefas concluídas" por SEMANA ou por MÊS,
--    opcionalmente presa a uma trilha. Ninguém "marca" progresso à mão: ele vem das
--    sessões de foco (focus_sessions) e das tarefas concluídas (tasks), as fontes de verdade.
--  * A janela (semana de segunda a domingo, ou mês) é calculada no FUSO da pessoa.
--  * Arquivar (archived_at) em vez de apagar: o histórico fica disponível para relatórios.
--  * Mesma segurança das outras tabelas: RLS forçada, FK composta, anon sem acesso.
-- =============================================================================

create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  track_id    uuid,
  title       text not null check (char_length(btrim(title)) between 1 and 80),
  -- 'minutos' = minutos de foco; 'tarefas' = tarefas concluídas.
  kind        text not null check (kind in ('minutos', 'tarefas')),
  period      text not null default 'semana' check (period in ('semana', 'mes')),
  target      integer not null check (target between 1 and 100000),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint goals_user_id_id_key unique (user_id, id),
  -- A trilha precisa ser da mesma pessoa. Se for apagada, a meta continua (vale para tudo).
  constraint goals_track_fk foreign key (user_id, track_id)
    references public.tracks (user_id, id) on delete set null (track_id)
);

comment on table public.goals is
  'Metas da pessoa (minutos de foco ou tarefas concluídas por semana/mês). Progresso em v_goal_progress.';

create index goals_user_ativas_idx on public.goals (user_id) where archived_at is null;

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function private.set_updated_at();

alter table public.goals enable row level security;
alter table public.goals force row level security;

revoke all on public.goals from anon, authenticated;
grant select, insert, update, delete on public.goals to authenticated;

create policy "goals_select_proprias" on public.goals
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "goals_insert_proprias" on public.goals
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "goals_update_proprias" on public.goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "goals_delete_proprias" on public.goals
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- View v_goal_progress: cada meta ATIVA com o progresso do período atual.
--
-- Passo a passo:
--  1. `janela`: hoje no fuso da pessoa e o início/fim do período (semana ISO ou mês).
--  2. `atual`: soma minutos de foco (sessões >= 1 min) ou conta tarefas-raiz concluídas
--     dentro da janela; se a meta tem trilha, só conta o que é daquela trilha.
-- security_invoker = true: as RLS de goals/focus_sessions/tasks valem para quem consulta.
-- -----------------------------------------------------------------------------
create view public.v_goal_progress
  with (security_invoker = true) as
with janela as (
  select
    g.*,
    coalesce(p.timezone, 'America/Sao_Paulo') as fuso,
    case g.period
      when 'semana' then date_trunc('week', (now() at time zone coalesce(p.timezone, 'America/Sao_Paulo')))::date
      else date_trunc('month', (now() at time zone coalesce(p.timezone, 'America/Sao_Paulo')))::date
    end as inicio
  from public.goals g
  left join public.profiles p on p.id = g.user_id
  where g.archived_at is null
),
com_fim as (
  select
    j.*,
    case j.period
      when 'semana' then j.inicio + 7
      else (j.inicio + interval '1 month')::date
    end as fim -- exclusivo
  from janela j
)
select
  c.id,
  c.user_id,
  c.track_id,
  c.title,
  c.kind,
  c.period,
  c.target,
  c.created_at,
  c.inicio,
  c.fim - 1 as fim,
  a.atual,
  least(100, round(100.0 * a.atual / c.target))::int as percentual
from com_fim c
cross join lateral (
  select case c.kind
    when 'minutos' then coalesce((
      select (sum(s.duration_sec) / 60)::int
      from public.focus_sessions s
      where s.user_id = c.user_id
        and s.kind = 'focus'
        and s.duration_sec >= 60
        and (c.track_id is null or s.track_id = c.track_id)
        and (s.started_at at time zone c.fuso)::date >= c.inicio
        and (s.started_at at time zone c.fuso)::date < c.fim
    ), 0)
    else (
      select count(*)::int
      from public.tasks t
      where t.user_id = c.user_id
        and t.parent_id is null
        and t.status = 'done'
        and (c.track_id is null or t.track_id = c.track_id)
        and (t.completed_at at time zone c.fuso)::date >= c.inicio
        and (t.completed_at at time zone c.fuso)::date < c.fim
    )
  end as atual
) a;

revoke all on public.v_goal_progress from anon, authenticated;
grant select on public.v_goal_progress to authenticated;
