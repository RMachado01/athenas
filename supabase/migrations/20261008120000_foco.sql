-- =============================================================================
-- Migration 0004 — Foco (sessões de Pomodoro) e sequência (streak)
--
-- Decisões desta migration:
--  * `focus_sessions` é a FONTE DE VERDADE do tempo estudado. A sessão é gravada quando
--    TERMINA (início + fim), então o cronômetro em andamento vive só no aparelho e nada
--    fica "pela metade" no banco.
--  * Sequência (streak) e minutos por dia são calculados em VIEWS, no fuso da pessoa,
--    a partir das sessões. Ninguém "edita" a própria sequência: ela é consequência.
--  * Um dia entra na sequência quando os minutos de foco do dia chegam a profiles.streak_min_min
--    (padrão 30). A meta é da pessoa, então o banco lê dela, não de um número fixo.
--  * Mesma segurança das outras tabelas: RLS forçada, FKs compostas, anon sem acesso.
-- =============================================================================

create table public.focus_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  task_id      uuid,
  track_id     uuid,
  -- 'focus' = bloco de estudo; 'break' = pausa (guardamos para estatística futura).
  kind         text not null default 'focus' check (kind in ('focus', 'break')),
  planned_min  smallint not null check (planned_min between 1 and 240),
  started_at   timestamptz not null,
  ended_at     timestamptz not null,
  -- Segundos realmente decorridos (calculado pelo banco; o cliente não "informa" duração).
  duration_sec integer generated always as (
    (extract(epoch from (ended_at - started_at)))::integer
  ) stored,
  created_at   timestamptz not null default now(),

  constraint focus_sessions_user_id_id_key unique (user_id, id),

  -- FKs compostas: a tarefa/trilha precisa ser DA MESMA pessoa. Se sumirem, a sessão
  -- continua valendo (o tempo estudado não desaparece) e só perde o vínculo.
  constraint focus_sessions_task_fk foreign key (user_id, task_id)
    references public.tasks (user_id, id) on delete set null (task_id),
  constraint focus_sessions_track_fk foreign key (user_id, track_id)
    references public.tracks (user_id, id) on delete set null (track_id),

  constraint focus_sessions_fim_depois_do_inicio check (ended_at > started_at),
  -- Uma sessão não dura mais que 6 horas (protege contra cronômetro esquecido ligado).
  constraint focus_sessions_duracao_maxima check (ended_at <= started_at + interval '6 hours')
);

comment on table public.focus_sessions is
  'Sessões de foco/pausa concluídas. Fonte de verdade do tempo estudado e da sequência.';

create index focus_sessions_user_inicio_idx on public.focus_sessions (user_id, started_at desc);
create index focus_sessions_user_tarefa_idx on public.focus_sessions (user_id, task_id);

-- -----------------------------------------------------------------------------
-- RLS: só o dono. (Sessões não são editadas: só criar, ler e apagar.)
-- -----------------------------------------------------------------------------
alter table public.focus_sessions enable row level security;
alter table public.focus_sessions force row level security;

revoke all on public.focus_sessions from anon, authenticated;
grant select, insert, delete on public.focus_sessions to authenticated;

create policy "focus_select_proprias" on public.focus_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "focus_insert_proprias" on public.focus_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "focus_delete_proprias" on public.focus_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- View v_focus_days: minutos de foco por DIA LOCAL (fuso do perfil). Alimenta o mapa de
-- calor e os gráficos. Só sessões de foco com 1 minuto ou mais contam (ignora cliques acidentais).
-- security_invoker = true: a RLS de `focus_sessions` vale para quem consulta.
-- -----------------------------------------------------------------------------
create view public.v_focus_days
  with (security_invoker = true) as
select
  x.user_id,
  x.dia,
  count(*)::int                   as sessoes,
  (sum(x.duration_sec) / 60)::int as minutos
from (
  select
    s.user_id,
    s.duration_sec,
    (s.started_at at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date as dia
  from public.focus_sessions s
  left join public.profiles p on p.id = s.user_id
  where s.kind = 'focus' and s.duration_sec >= 60
) x
group by x.user_id, x.dia;

revoke all on public.v_focus_days from anon, authenticated;
grant select on public.v_focus_days to authenticated;

-- -----------------------------------------------------------------------------
-- View v_streak: sequência atual e melhor sequência da pessoa (técnica "ilhas":
-- dia - posição do dia na lista é constante dentro de uma sequência de dias seguidos).
--
-- Sequência ATUAL: conta se a última ilha termina hoje OU ontem (ainda dá tempo de
-- estudar hoje sem perder a sequência). Fuso: o do perfil.
-- -----------------------------------------------------------------------------
create view public.v_streak
  with (security_invoker = true) as
with dias as (
  select
    d.user_id,
    d.dia,
    d.dia - (row_number() over (partition by d.user_id order by d.dia))::int as grupo
  from public.v_focus_days d
  join public.profiles p on p.id = d.user_id
  -- só dias que bateram a meta mínima da pessoa entram na sequência
  where d.minutos >= p.streak_min_min
),
ilhas as (
  select user_id, min(dia) as inicio, max(dia) as fim, count(*)::int as tamanho
  from dias
  group by user_id, grupo
),
hoje as (
  select
    p.id as user_id,
    (now() at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date as dia
  from public.profiles p
)
select
  h.user_id,
  coalesce(max(i.tamanho) filter (where i.fim >= h.dia - 1), 0) as atual,
  coalesce(max(i.tamanho), 0)                                   as melhor,
  max(i.fim)                                                    as ultimo_dia
from hoje h
left join ilhas i on i.user_id = h.user_id
group by h.user_id;

revoke all on public.v_streak from anon, authenticated;
grant select on public.v_streak to authenticated;
