-- =============================================================================
-- Migration 0009 — Notas ligadas (estilo Notion/Obsidian): notas, links e backlinks
--
-- Peças:
--  * notes: a nota (título, conteúdo do editor em JSON, texto puro para busca, ícone, trilha).
--  * note_links: "a nota A cita a nota B" (vem dos [[links]] do texto). Backlinks = quem cita B.
--  * salvar_nota(): grava a nota E troca os links dela numa transação só (nunca ficam
--    descasados). Roda como a própria pessoa (SECURITY INVOKER): a RLS vale normalmente.
-- Regras:
--  * título único por pessoa (sem diferenciar maiúsculas/espaços nas pontas) entre as notas
--    ativas: é assim que um [[Título]] aponta para UMA nota só;
--  * link só entre notas da mesma pessoa (FK composta) e nunca da nota para ela mesma.
-- =============================================================================

create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  track_id    uuid,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  icon        text check (char_length(icon) <= 16),
  -- Documento do editor (Tiptap/ProseMirror) e a versão em texto puro (busca e trechos).
  content     jsonb not null default '{"type":"doc","content":[]}'::jsonb
                check (jsonb_typeof(content) = 'object'),
  plain_text  text not null default '' check (char_length(plain_text) <= 100000),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint notes_user_id_id_key unique (user_id, id),
  constraint notes_track_fk foreign key (user_id, track_id)
    references public.tracks (user_id, id) on delete set null (track_id)
);

comment on table public.notes is 'Notas da pessoa (editor em blocos). Links entre notas em note_links.';

create unique index notes_titulo_unico_idx
  on public.notes (user_id, lower(btrim(title)))
  where archived_at is null;
create index notes_user_recentes_idx on public.notes (user_id, updated_at desc) where archived_at is null;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
create table public.note_links (
  user_id    uuid not null,
  from_note  uuid not null,
  to_note    uuid not null,
  created_at timestamptz not null default now(),

  primary key (from_note, to_note),
  constraint note_links_from_fk foreign key (user_id, from_note)
    references public.notes (user_id, id) on delete cascade,
  constraint note_links_to_fk foreign key (user_id, to_note)
    references public.notes (user_id, id) on delete cascade,
  constraint note_links_sem_laco check (from_note <> to_note)
);

comment on table public.note_links is 'A nota from_note cita a nota to_note (um [[link]] no texto).';

create index note_links_destino_idx on public.note_links (to_note);

-- -----------------------------------------------------------------------------
-- RLS: só o dono.
-- -----------------------------------------------------------------------------
alter table public.notes enable row level security;
alter table public.notes force row level security;
alter table public.note_links enable row level security;
alter table public.note_links force row level security;

revoke all on public.notes, public.note_links from anon, authenticated;
grant select, insert, update, delete on public.notes, public.note_links to authenticated;

create policy "notes_proprias" on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "note_links_proprios" on public.note_links
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- salvar_nota: grava título/conteúdo/texto e substitui os links numa transação.
-- Links para notas que não existem (ou de outra pessoa) fazem a função falhar inteira.
-- -----------------------------------------------------------------------------
create function public.salvar_nota(
  p_id uuid,
  p_titulo text,
  p_conteudo jsonb,
  p_texto text,
  p_links uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  update public.notes
     set title = btrim(p_titulo), content = p_conteudo, plain_text = coalesce(p_texto, '')
   where id = p_id and user_id = v_user;
  if not found then
    raise exception 'Nota não encontrada' using errcode = 'no_data_found';
  end if;

  delete from public.note_links where from_note = p_id;
  insert into public.note_links (user_id, from_note, to_note)
  select v_user, p_id, destino
  from (select distinct unnest(coalesce(p_links, '{}')) as destino) d
  where destino <> p_id;
end;
$$;

revoke all on function public.salvar_nota(uuid, text, jsonb, text, uuid[]) from public, anon;
grant execute on function public.salvar_nota(uuid, text, jsonb, text, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- View v_note_backlinks: para cada nota (destino), quem a cita, com título e um trecho.
-- -----------------------------------------------------------------------------
create view public.v_note_backlinks
  with (security_invoker = true) as
select
  l.to_note,
  n.id as from_note,
  n.title,
  n.icon,
  left(n.plain_text, 200) as trecho,
  n.updated_at
from public.note_links l
join public.notes n on n.id = l.from_note
where n.archived_at is null;

revoke all on public.v_note_backlinks from anon, authenticated;
grant select on public.v_note_backlinks to authenticated;
