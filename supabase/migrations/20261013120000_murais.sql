-- =============================================================================
-- Migration 0008 — Murais (quadros com post-its, tarefas, títulos, grupos e setas)
-- Design: docs/superpowers/specs/2026-10-12-mural-design.md
--
-- Peças:
--  * boards: os murais da pessoa (nome, cor, ícone, trilha opcional e a última "câmera").
--  * board_items: o que está no quadro (post-it, tarefa, título, grupo), com posição e tamanho.
--  * board_links: as setas entre dois itens DO MESMO mural.
-- Regras que o banco garante (o cliente não consegue errar):
--  * tudo é da mesma pessoa (FKs compostas) e as duas pontas de uma seta estão no mesmo mural;
--  * o grupo-pai de um item é um item do tipo 'grupo' do mesmo mural;
--  * limites: 500 itens e 1000 setas por mural (para o quadro não ficar pesado no celular).
-- =============================================================================

create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  track_id    uuid,
  title       text not null check (char_length(btrim(title)) between 1 and 80),
  color       text not null default 'amarelo'
                check (color in ('amarelo', 'rosa', 'verde', 'azul', 'roxo', 'laranja', 'cinza', 'menta')),
  icon        text not null default 'layout-dashboard' check (char_length(icon) between 1 and 40),
  -- Onde a pessoa parou (pan e zoom), para reabrir no mesmo lugar.
  viewport    jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb
                check (jsonb_typeof(viewport) = 'object'),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint boards_user_id_id_key unique (user_id, id),
  constraint boards_track_fk foreign key (user_id, track_id)
    references public.tracks (user_id, id) on delete set null (track_id)
);

comment on table public.boards is 'Murais (quadros livres) da pessoa. Itens em board_items, setas em board_links.';

create index boards_user_ativos_idx on public.boards (user_id, updated_at desc) where archived_at is null;

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
create table public.board_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  board_id   uuid not null,
  kind       text not null default 'nota' check (kind in ('nota', 'tarefa', 'titulo', 'grupo')),
  x          real not null default 0,
  y          real not null default 0,
  w          real not null default 200 check (w between 40 and 4000),
  h          real not null default 160 check (h between 40 and 4000),
  z          integer not null default 0,
  color      text not null default 'amarelo'
               check (color in ('amarelo', 'rosa', 'verde', 'azul', 'roxo', 'laranja', 'cinza', 'menta')),
  text       text not null default '',
  task_id    uuid,
  parent_id  uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint board_items_user_id_id_key unique (user_id, id),
  constraint board_items_board_fk foreign key (user_id, board_id)
    references public.boards (user_id, id) on delete cascade,
  constraint board_items_task_fk foreign key (user_id, task_id)
    references public.tasks (user_id, id) on delete set null (task_id),
  -- Apagar o grupo solta os filhos (eles não somem).
  constraint board_items_parent_fk foreign key (user_id, parent_id)
    references public.board_items (user_id, id) on delete set null (parent_id),
  constraint board_items_nao_e_pai_de_si check (parent_id is null or parent_id <> id),
  constraint board_items_tamanho_do_texto check (
    char_length(text) <= case kind when 'nota' then 2000 when 'titulo' then 120
                                   when 'grupo' then 80 else 0 end
  ),
  -- task_id só existe em itens do tipo tarefa (e é perdido só se a tarefa for apagada).
  constraint board_items_tarefa_coerente check (kind = 'tarefa' or task_id is null)
);

comment on table public.board_items is 'Itens de um mural: post-it (nota), tarefa, título ou grupo (moldura).';

create index board_items_board_idx on public.board_items (board_id);
create index board_items_user_tarefa_idx on public.board_items (user_id, task_id);
create index board_items_user_pai_idx on public.board_items (user_id, parent_id);

create trigger board_items_set_updated_at
  before update on public.board_items
  for each row execute function private.set_updated_at();

-- Gatilho: grupo-pai é um 'grupo' do MESMO mural; e no máximo 500 itens por mural.
create function private.board_items_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_pai record;
begin
  if new.parent_id is not null then
    select kind, board_id into v_pai from public.board_items where id = new.parent_id;
    if v_pai is null or v_pai.kind <> 'grupo' or v_pai.board_id <> new.board_id then
      raise exception 'O item só pode estar dentro de um grupo do mesmo mural'
        using errcode = 'check_violation';
    end if;
  end if;

  if tg_op = 'INSERT' and
     (select count(*) from public.board_items where board_id = new.board_id) >= 500 then
    raise exception 'Este mural já tem 500 itens (limite)' using errcode = 'check_violation';
  end if;

  if new.kind = 'tarefa' and tg_op = 'INSERT' and new.task_id is null then
    raise exception 'Card de tarefa precisa de uma tarefa' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger board_items_a_validar
  before insert or update of parent_id, board_id, kind, task_id on public.board_items
  for each row execute function private.board_items_validar();

-- -----------------------------------------------------------------------------
create table public.board_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  board_id   uuid not null,
  from_item  uuid not null,
  to_item    uuid not null,
  label      text not null default '' check (char_length(label) <= 60),
  created_at timestamptz not null default now(),

  constraint board_links_board_fk foreign key (user_id, board_id)
    references public.boards (user_id, id) on delete cascade,
  constraint board_links_from_fk foreign key (user_id, from_item)
    references public.board_items (user_id, id) on delete cascade,
  constraint board_links_to_fk foreign key (user_id, to_item)
    references public.board_items (user_id, id) on delete cascade,
  constraint board_links_sem_laco check (from_item <> to_item),
  constraint board_links_unica unique (from_item, to_item)
);

comment on table public.board_links is 'Setas entre dois itens do mesmo mural.';

create index board_links_board_idx on public.board_links (board_id);

-- Gatilho: as duas pontas estão no mesmo mural da seta; e no máximo 1000 setas por mural.
create function private.board_links_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.board_items i
    where i.id in (new.from_item, new.to_item) and i.board_id <> new.board_id
  ) then
    raise exception 'As duas pontas da seta precisam estar no mesmo mural'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' and
     (select count(*) from public.board_links where board_id = new.board_id) >= 1000 then
    raise exception 'Este mural já tem 1000 setas (limite)' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger board_links_a_validar
  before insert or update on public.board_links
  for each row execute function private.board_links_validar();

-- -----------------------------------------------------------------------------
-- RLS: só o dono, em todas as operações, nas três tabelas.
-- -----------------------------------------------------------------------------
alter table public.boards enable row level security;
alter table public.boards force row level security;
alter table public.board_items enable row level security;
alter table public.board_items force row level security;
alter table public.board_links enable row level security;
alter table public.board_links force row level security;

revoke all on public.boards, public.board_items, public.board_links from anon, authenticated;
grant select, insert, update, delete on public.boards, public.board_items, public.board_links
  to authenticated;

create policy "boards_proprios" on public.boards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "board_items_proprios" on public.board_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "board_links_proprios" on public.board_links
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- View v_boards: os murais ativos com a contagem de itens (para a lista de murais).
-- -----------------------------------------------------------------------------
create view public.v_boards
  with (security_invoker = true) as
select
  b.id, b.user_id, b.track_id, b.title, b.color, b.icon, b.created_at, b.updated_at,
  (select count(*) from public.board_items i where i.board_id = b.id)::int as itens
from public.boards b
where b.archived_at is null;

revoke all on public.v_boards from anon, authenticated;
grant select on public.v_boards to authenticated;
