-- =============================================================================
-- Sala pixel: o perfil pixel de cada pessoa (pet escolhido e batizado; avatar)
-- =============================================================================
-- Uma linha por pessoa. Por enquanto é SÓ DELA (RLS: ninguém mais lê nem grava), então não
-- expõe nada a outras pessoas. Quando a camada social existir, o nome do pet passará por filtro
-- de palavrões e denúncia, e uma visão pública separada mostrará só o necessário.
--
-- Por que espécie e cor são "texto com regra" e não uma lista fixa no banco? A arte vive no app
-- (catálogo em código): ganhar uma espécie ou cor nova não deveria exigir migração. O banco só
-- garante que o texto seja inofensivo (letras minúsculas e sublinhado); o app mostra a primeira
-- cor da espécie se não reconhecer o valor.
-- =============================================================================
create table public.pixel_profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  pet_species text
    constraint pixel_pet_species_check check (pet_species ~ '^[a-z_]{1,20}$'),
  pet_variant text
    constraint pixel_pet_variant_check check (pet_variant ~ '^[a-z_]{1,20}$'),
  pet_name    text
    constraint pixel_pet_name_check
      check (char_length(btrim(pet_name)) between 1 and 24 and pet_name !~ '[\r\n]'),
  -- Peças do avatar (fatia seguinte): cabelo, pele, roupa... guardadas como objeto JSON.
  avatar      jsonb not null default '{}'::jsonb
    constraint pixel_avatar_check check (jsonb_typeof(avatar) = 'object'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Ou a pessoa já adotou (espécie + cor + nome juntos) ou ainda não tem pet.
  constraint pixel_pet_completo check (
    (pet_species is null) = (pet_variant is null) and (pet_species is null) = (pet_name is null)
  )
);

comment on table public.pixel_profiles is
  'Perfil pixel de cada pessoa: pet (espécie, cor, nome) e avatar. Privado por enquanto.';

create trigger pixel_profiles_set_updated_at
  before update on public.pixel_profiles
  for each row execute function private.set_updated_at();

alter table public.pixel_profiles enable row level security;
alter table public.pixel_profiles force row level security;

revoke all on public.pixel_profiles from anon, authenticated;
grant select, insert, update, delete on public.pixel_profiles to authenticated;

create policy "pixel_profiles_proprio" on public.pixel_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
