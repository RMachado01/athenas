-- =============================================================================
-- Migration 0010 — Flashcards com repetição espaçada (FSRS)
--
-- Peças:
--  * decks: baralhos (opcionalmente ligados a uma trilha). "Geral" é o baralho padrão,
--    criado sob demanda por baralho_padrao().
--  * cards: frente/verso + o estado do agendamento FSRS em colunas (busca "o que vence hoje"
--    rápida). Cartão com note_id nasceu de uma linha "pergunta :: resposta" de uma nota.
--  * card_reviews: histórico (uma linha por resposta) com o estado ANTERIOR, para desfazer,
--    estatísticas e, no futuro, calibrar o FSRS de cada pessoa.
--  * Quem calcula o agendamento é o app (biblioteca ts-fsrs); o banco grava estado + histórico
--    numa transação só (responder_cartao) e recusa respostas de um aparelho desatualizado.
-- Tudo roda como a própria pessoa (SECURITY INVOKER): a RLS vale normalmente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Baralhos
-- -----------------------------------------------------------------------------
create table public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  track_id    uuid,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  color       text not null default 'azul'
                check (color in ('amarelo', 'rosa', 'verde', 'azul', 'roxo', 'laranja', 'cinza', 'menta')),
  is_default  boolean not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint decks_user_id_id_key unique (user_id, id),
  constraint decks_track_fk foreign key (user_id, track_id)
    references public.tracks (user_id, id) on delete set null (track_id),
  -- O baralho padrão recebe os cartões das notas sem baralho: ele nunca é arquivado.
  constraint decks_padrao_ativo check (not (is_default and archived_at is not null))
);

comment on table public.decks is 'Baralhos de flashcards. is_default = "Geral" (cartões de notas sem baralho).';

create unique index decks_nome_unico_idx
  on public.decks (user_id, lower(btrim(name)))
  where archived_at is null;
create unique index decks_um_padrao_idx on public.decks (user_id) where is_default;

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function private.set_updated_at();

-- Limite de 100 baralhos ativos por pessoa.
create function private.limitar_baralhos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.decks where user_id = new.user_id and archived_at is null) >= 100 then
    raise exception 'Você chegou ao limite de 100 baralhos' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger decks_limite
  before insert on public.decks
  for each row execute function private.limitar_baralhos();

-- -----------------------------------------------------------------------------
-- Colunas novas em tabelas existentes
-- -----------------------------------------------------------------------------
alter table public.notes add column deck_id uuid;
alter table public.notes add constraint notes_deck_fk foreign key (user_id, deck_id)
  references public.decks (user_id, id) on delete set null (deck_id);

alter table public.profiles add column new_cards_per_day smallint not null default 10
  check (new_cards_per_day between 0 and 100);

alter table public.focus_sessions add column origin text not null default 'foco'
  check (origin in ('foco', 'revisao'));

-- -----------------------------------------------------------------------------
-- Cartões
-- -----------------------------------------------------------------------------
create table public.cards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  deck_id        uuid not null,
  note_id        uuid,
  front          text not null check (char_length(btrim(front)) between 1 and 2000),
  back           text not null check (char_length(btrim(back)) between 1 and 2000),
  -- Estado FSRS (mesmos nomes da biblioteca ts-fsrs). state: 0 novo, 1 aprendendo,
  -- 2 revisão, 3 reaprendendo.
  state          smallint not null default 0 check (state between 0 and 3),
  due            timestamptz not null default now(),
  stability      double precision not null default 0 check (stability >= 0),
  difficulty     double precision not null default 0 check (difficulty between 0 and 10),
  elapsed_days   integer not null default 0 check (elapsed_days >= 0),
  scheduled_days integer not null default 0 check (scheduled_days >= 0),
  learning_steps integer not null default 0 check (learning_steps >= 0),
  reps           integer not null default 0 check (reps >= 0),
  lapses         integer not null default 0 check (lapses >= 0),
  last_review    timestamptz,
  suspended      boolean not null default false,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint cards_user_id_id_key unique (user_id, id),
  constraint cards_deck_fk foreign key (user_id, deck_id)
    references public.decks (user_id, id) on delete cascade,
  constraint cards_note_fk foreign key (user_id, note_id)
    references public.notes (user_id, id) on delete set null (note_id)
);

comment on table public.cards is 'Flashcards (frente/verso) com o estado do agendamento FSRS.';

create index cards_revisao_idx on public.cards (user_id, due)
  where archived_at is null and not suspended;
create index cards_baralho_idx on public.cards (deck_id);
create index cards_nota_idx on public.cards (note_id);

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function private.set_updated_at();

-- Limite de 5.000 cartões ativos por pessoa (um "upsert" de cartão que já existe não conta).
create function private.limitar_cartoes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.cards where id = new.id) then
    return new;
  end if;
  if (select count(*) from public.cards where user_id = new.user_id and archived_at is null) >= 5000 then
    raise exception 'Você chegou ao limite de 5.000 cartões' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger cards_limite
  before insert on public.cards
  for each row execute function private.limitar_cartoes();

-- Nota apagada: os cartões dela são arquivados (o histórico de revisão continua).
-- BEFORE DELETE: roda antes da FK zerar o note_id.
create function private.arquivar_cartoes_da_nota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.cards set archived_at = coalesce(archived_at, now()) where note_id = old.id;
  return old;
end;
$$;

create trigger notes_arquiva_cartoes
  before delete on public.notes
  for each row execute function private.arquivar_cartoes_da_nota();

-- -----------------------------------------------------------------------------
-- Histórico de respostas
-- -----------------------------------------------------------------------------
create table public.card_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  card_id        uuid not null,
  rating         smallint not null check (rating between 1 and 4),
  state_before   smallint not null check (state_before between 0 and 3),
  -- Estado completo do cartão ANTES da resposta (para desfazer com exatidão).
  antes          jsonb not null check (jsonb_typeof(antes) = 'object'),
  state          smallint not null check (state between 0 and 3),
  due            timestamptz not null,
  stability      double precision not null,
  difficulty     double precision not null,
  scheduled_days integer not null,
  duration_ms    integer not null default 0 check (duration_ms between 0 and 600000),
  reviewed_at    timestamptz not null default now(),

  constraint card_reviews_card_fk foreign key (user_id, card_id)
    references public.cards (user_id, id) on delete cascade
);

comment on table public.card_reviews is 'Uma linha por resposta de flashcard (com o estado anterior).';

create index card_reviews_user_dia_idx on public.card_reviews (user_id, reviewed_at desc);
create index card_reviews_cartao_idx on public.card_reviews (card_id, reviewed_at desc);

-- -----------------------------------------------------------------------------
-- RLS: só o dono.
-- -----------------------------------------------------------------------------
alter table public.decks enable row level security;
alter table public.decks force row level security;
alter table public.cards enable row level security;
alter table public.cards force row level security;
alter table public.card_reviews enable row level security;
alter table public.card_reviews force row level security;

revoke all on public.decks, public.cards, public.card_reviews from anon, authenticated;
grant select, insert, update, delete on public.decks, public.cards to authenticated;
grant select, insert, delete on public.card_reviews to authenticated;

create policy "decks_proprios" on public.decks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "cards_proprios" on public.cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "card_reviews_proprios" on public.card_reviews
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- baralho_padrao: devolve (criando se preciso) o baralho "Geral" da pessoa.
-- Se ela já tem um baralho ativo chamado "Geral", ele vira o padrão.
-- -----------------------------------------------------------------------------
create function public.baralho_padrao()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id   uuid;
begin
  select id into v_id from public.decks where user_id = v_user and is_default;
  if v_id is not null then
    return v_id;
  end if;

  update public.decks set is_default = true
   where user_id = v_user and archived_at is null and lower(btrim(name)) = 'geral'
  returning id into v_id;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.decks (user_id, name, is_default) values (v_user, 'Geral', true)
  returning id into v_id;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- responder_cartao: grava a resposta (histórico) e o novo estado numa transação.
-- p_reps_esperado = reps que o aparelho viu; se o banco já tem outro número, outra resposta
-- chegou antes (outro aparelho) e esta é recusada com "conflito".
-- -----------------------------------------------------------------------------
create function public.responder_cartao(
  p_id uuid,
  p_card uuid,
  p_reps_esperado integer,
  p_rating smallint,
  p_novo jsonb,
  p_duracao_ms integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user  uuid := (select auth.uid());
  v_antes public.cards;
begin
  select * into v_antes from public.cards
   where id = p_card and user_id = v_user
   for update;
  if not found then
    raise exception 'Cartão não encontrado' using errcode = 'no_data_found';
  end if;
  if v_antes.reps <> p_reps_esperado then
    raise exception 'conflito: o cartão já foi respondido em outro aparelho';
  end if;
  if coalesce((p_novo->>'reps')::integer, -1) <> p_reps_esperado + 1 then
    raise exception 'estado inválido: reps precisa subir 1' using errcode = 'check_violation';
  end if;

  insert into public.card_reviews (
    id, user_id, card_id, rating, state_before, antes,
    state, due, stability, difficulty, scheduled_days, duration_ms
  ) values (
    p_id, v_user, p_card, p_rating, v_antes.state,
    jsonb_build_object(
      'state', v_antes.state, 'due', v_antes.due, 'stability', v_antes.stability,
      'difficulty', v_antes.difficulty, 'elapsed_days', v_antes.elapsed_days,
      'scheduled_days', v_antes.scheduled_days, 'learning_steps', v_antes.learning_steps,
      'reps', v_antes.reps, 'lapses', v_antes.lapses, 'last_review', v_antes.last_review
    ),
    (p_novo->>'state')::smallint, (p_novo->>'due')::timestamptz,
    (p_novo->>'stability')::double precision, (p_novo->>'difficulty')::double precision,
    (p_novo->>'scheduled_days')::integer,
    least(greatest(coalesce(p_duracao_ms, 0), 0), 600000)
  );

  update public.cards set
    state          = (p_novo->>'state')::smallint,
    due            = (p_novo->>'due')::timestamptz,
    stability      = (p_novo->>'stability')::double precision,
    difficulty     = (p_novo->>'difficulty')::double precision,
    elapsed_days   = (p_novo->>'elapsed_days')::integer,
    scheduled_days = (p_novo->>'scheduled_days')::integer,
    learning_steps = (p_novo->>'learning_steps')::integer,
    reps           = (p_novo->>'reps')::integer,
    lapses         = (p_novo->>'lapses')::integer,
    last_review    = (p_novo->>'last_review')::timestamptz
  where id = p_card;
end;
$$;

-- -----------------------------------------------------------------------------
-- desfazer_resposta: volta o cartão ao estado anterior (só a ÚLTIMA resposta dele).
-- -----------------------------------------------------------------------------
create function public.desfazer_resposta(p_review uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_r    public.card_reviews;
begin
  select * into v_r from public.card_reviews where id = p_review and user_id = v_user;
  if not found then
    raise exception 'Resposta não encontrada' using errcode = 'no_data_found';
  end if;
  if exists (
    select 1 from public.card_reviews
     where card_id = v_r.card_id and reviewed_at > v_r.reviewed_at
  ) then
    raise exception 'Só dá para desfazer a última resposta do cartão' using errcode = 'check_violation';
  end if;

  update public.cards set
    state          = (v_r.antes->>'state')::smallint,
    due            = (v_r.antes->>'due')::timestamptz,
    stability      = (v_r.antes->>'stability')::double precision,
    difficulty     = (v_r.antes->>'difficulty')::double precision,
    elapsed_days   = (v_r.antes->>'elapsed_days')::integer,
    scheduled_days = (v_r.antes->>'scheduled_days')::integer,
    learning_steps = (v_r.antes->>'learning_steps')::integer,
    reps           = (v_r.antes->>'reps')::integer,
    lapses         = (v_r.antes->>'lapses')::integer,
    last_review    = (v_r.antes->>'last_review')::timestamptz
  where id = v_r.card_id and user_id = v_user;

  delete from public.card_reviews where id = p_review;
end;
$$;

-- -----------------------------------------------------------------------------
-- salvar_nota (nova versão): texto + links + cartões da nota numa transação.
-- p_cartoes = [{"id": uuid, "frente": text, "verso": text}] (as linhas "pergunta :: resposta").
-- Cria os novos, atualiza frente/verso dos existentes SEM mexer no agendamento, arquiva os que
-- saíram do texto e desarquiva os que voltaram. Todos ficam no baralho da nota (ou no padrão).
-- -----------------------------------------------------------------------------
drop function public.salvar_nota(uuid, text, jsonb, text, uuid[]);

create function public.salvar_nota(
  p_id uuid,
  p_titulo text,
  p_conteudo jsonb,
  p_texto text,
  p_links uuid[],
  p_cartoes jsonb default '[]'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user    uuid := (select auth.uid());
  v_deck    uuid;
  v_cartoes jsonb := coalesce(p_cartoes, '[]'::jsonb);
begin
  update public.notes
     set title = btrim(p_titulo), content = p_conteudo, plain_text = coalesce(p_texto, '')
   where id = p_id and user_id = v_user
  returning deck_id into v_deck;
  if not found then
    raise exception 'Nota não encontrada' using errcode = 'no_data_found';
  end if;

  delete from public.note_links where from_note = p_id;
  insert into public.note_links (user_id, from_note, to_note)
  select v_user, p_id, destino
  from (select distinct unnest(coalesce(p_links, '{}')) as destino) d
  where destino <> p_id;

  if jsonb_typeof(v_cartoes) <> 'array' then
    raise exception 'Cartões inválidos' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(v_cartoes) > 200 then
    raise exception 'Uma nota pode ter até 200 cartões' using errcode = 'check_violation';
  end if;

  -- Cartões que saíram do texto: arquivados (o histórico fica).
  update public.cards set archived_at = now()
   where note_id = p_id and user_id = v_user and archived_at is null
     and id not in (select (c->>'id')::uuid from jsonb_array_elements(v_cartoes) c);

  if jsonb_array_length(v_cartoes) = 0 then
    return;
  end if;

  -- Baralho da nota; se não tem (ou foi arquivado), o padrão "Geral".
  if v_deck is not null
     and exists (select 1 from public.decks where id = v_deck and archived_at is not null) then
    v_deck := null;
  end if;
  v_deck := coalesce(v_deck, public.baralho_padrao());

  insert into public.cards (id, user_id, deck_id, note_id, front, back)
  select (c->>'id')::uuid, v_user, v_deck, p_id, btrim(c->>'frente'), btrim(c->>'verso')
  from jsonb_array_elements(v_cartoes) c
  on conflict (id) do update
    set front = excluded.front,
        back = excluded.back,
        deck_id = excluded.deck_id,
        archived_at = null
    where public.cards.note_id = p_id and public.cards.user_id = v_user;
end;
$$;

-- -----------------------------------------------------------------------------
-- definir_baralho_da_nota: escolhe o baralho da nota e leva os cartões dela junto.
-- p_deck null = "Geral".
-- -----------------------------------------------------------------------------
create function public.definir_baralho_da_nota(p_nota uuid, p_deck uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  update public.notes set deck_id = p_deck where id = p_nota and user_id = v_user;
  if not found then
    raise exception 'Nota não encontrada' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.cards where note_id = p_nota and archived_at is null) then
    update public.cards set deck_id = coalesce(p_deck, public.baralho_padrao())
     where note_id = p_nota and user_id = v_user and archived_at is null;
  end if;
end;
$$;

revoke all on function public.baralho_padrao() from public, anon;
revoke all on function public.responder_cartao(uuid, uuid, integer, smallint, jsonb, integer) from public, anon;
revoke all on function public.desfazer_resposta(uuid) from public, anon;
revoke all on function public.salvar_nota(uuid, text, jsonb, text, uuid[], jsonb) from public, anon;
revoke all on function public.definir_baralho_da_nota(uuid, uuid) from public, anon;
grant execute on function public.baralho_padrao() to authenticated;
grant execute on function public.responder_cartao(uuid, uuid, integer, smallint, jsonb, integer) to authenticated;
grant execute on function public.desfazer_resposta(uuid) to authenticated;
grant execute on function public.salvar_nota(uuid, text, jsonb, text, uuid[], jsonb) to authenticated;
grant execute on function public.definir_baralho_da_nota(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- v_review_cards: cartões que podem entrar na revisão (ativos, não suspensos, baralho ativo,
-- nota de origem ativa).
-- -----------------------------------------------------------------------------
create view public.v_review_cards
  with (security_invoker = true) as
select c.*
from public.cards c
join public.decks d on d.id = c.deck_id
left join public.notes n on n.id = c.note_id
where c.archived_at is null
  and not c.suspended
  and d.archived_at is null
  and (c.note_id is null or n.archived_at is null);

-- -----------------------------------------------------------------------------
-- v_decks: por baralho ativo, total, novos, para hoje (revisões que vencem até o fim do dia
-- no fuso da pessoa) e atrasados (venceram antes de hoje).
-- -----------------------------------------------------------------------------
create view public.v_decks
  with (security_invoker = true) as
with dia as (
  select
    p.id as user_id,
    (date_trunc('day', now() at time zone p.timezone)) at time zone p.timezone as inicio,
    (date_trunc('day', now() at time zone p.timezone) + interval '1 day') at time zone p.timezone as fim
  from public.profiles p
)
select
  d.id, d.user_id, d.name, d.color, d.track_id, d.is_default, d.created_at, d.updated_at,
  count(c.id)::integer as total,
  (count(c.id) filter (where c.state = 0))::integer as novos,
  (count(c.id) filter (where c.state <> 0 and c.due < dia.fim))::integer as para_hoje,
  (count(c.id) filter (where c.state <> 0 and c.due < dia.inicio))::integer as atrasados
from public.decks d
join dia on dia.user_id = d.user_id
left join public.v_review_cards c on c.deck_id = d.id
where d.archived_at is null
group by d.id, dia.inicio, dia.fim;

revoke all on public.v_review_cards, public.v_decks from anon, authenticated;
grant select on public.v_review_cards, public.v_decks to authenticated;
