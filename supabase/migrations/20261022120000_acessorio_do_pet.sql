-- =============================================================================
-- Sala pixel: o ACESSÓRIO do pet (fone, óculos, chapéu de formatura, laço, cachecol, laranja)
-- =============================================================================
-- Mesma ideia da espécie e da cor: a arte vive no app (catálogo em código), então o banco só
-- garante um texto inofensivo (letras minúsculas e sublinhado). Vazio (null) = sem acessório.
-- Um id que o app não conhecer é mostrado como "sem acessório".
--
-- Não muda quem pode ver: a tabela continua só da própria pessoa (RLS da migração sala_pixel).
-- =============================================================================
alter table public.pixel_profiles
  add column pet_accessory text
    constraint pixel_pet_accessory_check check (pet_accessory ~ '^[a-z_]{1,20}$');

-- Sem pet não há acessório (não existe "acessório de ninguém").
alter table public.pixel_profiles
  add constraint pixel_acessorio_com_pet check (pet_accessory is null or pet_species is not null);

comment on column public.pixel_profiles.pet_accessory is
  'Acessório do pet (id do catálogo do app) ou null = sem acessório.';
