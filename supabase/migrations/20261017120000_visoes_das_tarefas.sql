-- =============================================================================
-- Visões das Tarefas: cor da trilha, "Começa em" da tarefa e posições do Mural
-- =============================================================================
-- 1) tracks.color: cada trilha tem uma cor (as 8 dos murais). O Quadro por trilha, as barras do
--    calendário e os post-its usam essa cor. As trilhas que já existem recebem cores diferentes,
--    na ordem em que a pessoa as vê (a 9ª volta à 1ª).
-- 2) tasks.start_on: data de início opcional. Com início + prazo a tarefa vira uma barra de vários
--    dias no calendário. Regras no BANCO (o cliente não consegue errar): início exige prazo e
--    nunca vem depois dele.
-- 3) v_tasks recriada: ela usa `t.*`, e o Postgres "congela" essa lista na criação, então a coluna
--    nova só aparece se a view for refeita. (Nenhuma outra view depende dela.)
-- 4) task_positions: onde cada tarefa está no Mural das Tarefas. Fica numa tabela própria (e não
--    em board_items) para a tarefa nunca virar uma cópia dentro de um mural.
-- =============================================================================

-- 1) Cor da trilha -----------------------------------------------------------------------------
alter table public.tracks
  add column color text not null default 'azul'
    constraint tracks_color_check
    check (color in ('amarelo', 'rosa', 'verde', 'azul', 'roxo', 'laranja', 'cinza', 'menta'));

update public.tracks t
   set color = (array['azul', 'verde', 'laranja', 'roxo', 'rosa', 'menta', 'amarelo', 'cinza'])
                 [1 + ((ordem.n - 1) % 8)]
  from (
    select id, row_number() over (partition by user_id order by sort_order, created_at, id) as n
      from public.tracks
  ) ordem
 where ordem.id = t.id;

-- 2) "Começa em" -------------------------------------------------------------------------------
alter table public.tasks
  add column start_on date,
  add constraint tasks_inicio_coerente
    check (start_on is null or (due_on is not null and start_on <= due_on));

-- 3) View recriada, agora com start_on ---------------------------------------------------------
drop view public.v_tasks;

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

-- 4) Posições do Mural das Tarefas -------------------------------------------------------------
create table public.task_positions (
  user_id    uuid not null references auth.users (id) on delete cascade,
  task_id    uuid not null,
  x          real not null check (x between -100000 and 100000),
  y          real not null check (y between -100000 and 100000),
  updated_at timestamptz not null default now(),

  primary key (user_id, task_id),
  constraint task_positions_task_fk foreign key (user_id, task_id)
    references public.tasks (user_id, id) on delete cascade
);

comment on table public.task_positions is
  'Posição (x, y) de cada tarefa no Mural das Tarefas. Sem linha = tarefa ainda na bandeja "Chegando".';

create trigger task_positions_set_updated_at
  before update on public.task_positions
  for each row execute function private.set_updated_at();

alter table public.task_positions enable row level security;
alter table public.task_positions force row level security;

revoke all on public.task_positions from anon, authenticated;
grant select, insert, update, delete on public.task_positions to authenticated;

create policy "task_positions_proprias" on public.task_positions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
