-- =============================================================================
-- Migration 0003 — Tarefas (tasks) e views de agrupamento/progresso
--
-- Segue o padrão da tabela `tracks` (migration 0002): RLS por dono e FKs COMPOSTAS,
-- para uma tarefa nunca apontar para trilha ou tarefa-mãe de OUTRA pessoa (ADR-002).
--
-- Decisões desta migration:
--  * Prazo = data (`due_on`) + hora opcional (`due_time`). A tela mostra "sex, 09/10" (só dia)
--    e "hoje, 19:00" (com hora); guardar separado evita inventar um horário que a pessoa não deu.
--  * Subtarefas: 1 nível só (subtarefa não tem subtarefa). Garantido por gatilho.
--  * `completed_at` é mantido pelo BANCO a partir do status (o cliente não consegue errar).
--  * Agrupamento "Atrasadas / Hoje / Esta semana" é calculado em VIEW, no fuso da pessoa.
-- =============================================================================

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  track_id      uuid,
  parent_id     uuid,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  notes         text not null default '' check (char_length(notes) <= 5000),
  -- 1 = baixa, 2 = média, 3 = alta (as 3 barrinhas do design).
  priority      smallint not null default 2 check (priority between 1 and 3),
  status        text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_on        date,
  due_time      time,
  estimate_min  integer check (estimate_min between 1 and 1440),
  completed_at  timestamptz,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint tasks_user_id_id_key unique (user_id, id),

  -- FK composta: a trilha precisa ser DA MESMA pessoa. Se a trilha for apagada, a tarefa
  -- fica (sem trilha) em vez de sumir. "on delete set null (track_id)" zera só essa coluna.
  constraint tasks_track_fk foreign key (user_id, track_id)
    references public.tracks (user_id, id) on delete set null (track_id),

  -- A tarefa-mãe também precisa ser da mesma pessoa. Apagar a mãe apaga as subtarefas.
  constraint tasks_parent_fk foreign key (user_id, parent_id)
    references public.tasks (user_id, id) on delete cascade,

  constraint tasks_parent_nao_e_ela_mesma check (parent_id is null or parent_id <> id),
  constraint tasks_hora_exige_data check (due_time is null or due_on is not null),
  -- "concluída" e "tem data de conclusão" andam juntas (o gatilho abaixo mantém isso).
  constraint tasks_conclusao_coerente check ((status = 'done') = (completed_at is not null))
);

comment on table public.tasks is
  'Tarefas de estudo da pessoa. Subtarefas = parent_id (1 nível). Só o dono lê/edita.';

create index tasks_user_status_prazo_idx on public.tasks (user_id, status, due_on);
create index tasks_user_trilha_idx       on public.tasks (user_id, track_id);
create index tasks_user_mae_idx          on public.tasks (user_id, parent_id);
create index tasks_user_ordem_idx        on public.tasks (user_id, sort_order);

-- -----------------------------------------------------------------------------
-- Gatilho 1: completed_at acompanha o status (sempre decidido pelo banco).
-- -----------------------------------------------------------------------------
create or replace function private.tasks_sincronizar_conclusao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_a_conclusao
  before insert or update on public.tasks
  for each row execute function private.tasks_sincronizar_conclusao();

-- -----------------------------------------------------------------------------
-- Gatilho 2: hierarquia de 1 nível (subtarefa não pode ter subtarefa).
-- -----------------------------------------------------------------------------
create or replace function private.tasks_validar_hierarquia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.tasks p where p.id = new.parent_id and p.parent_id is not null) then
      raise exception 'Uma subtarefa não pode ter subtarefas.' using errcode = '23514';
    end if;
    if exists (select 1 from public.tasks c where c.parent_id = new.id) then
      raise exception 'Uma tarefa que já tem subtarefas não pode virar subtarefa.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_b_hierarquia
  before insert or update of parent_id on public.tasks
  for each row execute function private.tasks_validar_hierarquia();

create trigger tasks_c_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: só o dono, em todas as operações.
-- -----------------------------------------------------------------------------
alter table public.tasks enable row level security;
alter table public.tasks force row level security;

revoke all on public.tasks from anon, authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

create policy "tasks_select_proprias" on public.tasks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "tasks_insert_proprias" on public.tasks
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "tasks_update_proprias" on public.tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tasks_delete_proprias" on public.tasks
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- View v_tasks: cada tarefa com seu "grupo" (bucket) calculado no FUSO DA PESSOA.
--
-- security_invoker = true é ESSENCIAL: por padrão uma view roda com os poderes do dono e
-- ignora a RLS (vazaria tarefas de todos). Com ele, a RLS de `tasks` vale para quem consulta.
--
-- Grupos: concluida · sem_prazo · atrasada (prazo antes de hoje) · hoje ·
--         semana (de amanhã até o domingo desta semana) · depois.
-- Semana começa na segunda-feira (isodow 1) e termina no domingo (isodow 7).
-- -----------------------------------------------------------------------------
create view public.v_tasks
  with (security_invoker = true) as
select
  t.*,
  case
    when t.status = 'done'  then 'concluida'
    when t.due_on is null   then 'sem_prazo'
    when t.due_on < hoje.dia then 'atrasada'
    when t.due_on = hoje.dia then 'hoje'
    when t.due_on <= hoje.dia + (7 - extract(isodow from hoje.dia)::int) then 'semana'
    else 'depois'
  end as bucket
from public.tasks t
cross join lateral (
  select (
    now() at time zone coalesce(
      (select p.timezone from public.profiles p where p.id = (select auth.uid())),
      'America/Sao_Paulo'
    )
  )::date as dia
) hoje;

revoke all on public.v_tasks from anon, authenticated;
grant select on public.v_tasks to authenticated;

-- -----------------------------------------------------------------------------
-- View v_track_progress: progresso de cada trilha = tarefas concluídas ÷ total (Q4).
-- Conta só tarefas "raiz" (subtarefas não entram na conta).
-- -----------------------------------------------------------------------------
create view public.v_track_progress
  with (security_invoker = true) as
select
  tr.id        as track_id,
  tr.user_id,
  tr.name,
  count(t.id) filter (where t.parent_id is null)                          as total,
  count(t.id) filter (where t.parent_id is null and t.status = 'done')    as concluidas,
  case
    when count(t.id) filter (where t.parent_id is null) = 0 then 0
    else round(
      100.0 * count(t.id) filter (where t.parent_id is null and t.status = 'done')
            / count(t.id) filter (where t.parent_id is null)
    )::int
  end as percentual
from public.tracks tr
left join public.tasks t
  on t.track_id = tr.id and t.user_id = tr.user_id
where tr.archived_at is null
group by tr.id, tr.user_id, tr.name;

revoke all on public.v_track_progress from anon, authenticated;
grant select on public.v_track_progress to authenticated;
