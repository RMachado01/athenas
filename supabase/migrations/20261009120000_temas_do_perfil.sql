-- =============================================================================
-- Migration 0005 — Todos os temas podem ser salvos no perfil
--
-- A migration 0001 só aceitava 3 temas em `profiles.theme`. Desde então o app ganhou
-- "amethyst", "volt", "mono" (Preto e Branco) e "amber". Sem esta migration, salvar um
-- desses temas no perfil falharia no CHECK. A lista aqui precisa andar junto com
-- OPCOES_DE_TEMA em lib/tema.ts (há um teste que confere os dois lados).
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check check (
    theme in ('ponderosa', 'burgundy', 'camel', 'amethyst', 'volt', 'mono', 'amber', 'auto')
  );