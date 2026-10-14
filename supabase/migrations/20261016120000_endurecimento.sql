-- =============================================================================
-- Endurecimento antes de publicar (varredura de segurança de 2026-10-14)
-- =============================================================================
-- 1) Permissão por COLUNA nos perfis. Antes, a pessoa logada podia dar UPDATE em qualquer coluna
--    do próprio perfil (a RLS garante que é o DELA, mas não QUAIS colunas). Agora só as colunas
--    que a tela realmente edita. Exemplos do que deixa de ser possível:
--      * forjar `created_at` (que um dia pode virar selo de "membro desde…");
--      * gravar `avatar_url` com um link qualquer de https: quando o perfil público aparecer
--        para outras pessoas, um link externo serviria para rastrear quem abriu a tela (o
--        navegador de quem vê baixaria a imagem de um servidor alheio) ou exibir conteúdo
--        impróprio. A foto vai passar por uma função própria, com arquivo no nosso Storage.
-- 2) Índices para as chaves estrangeiras compostas (user_id, …). O Postgres não cria índice
--    sozinho para a coluna que APONTA para outra tabela; sem ele, apagar um baralho ou uma
--    trilha percorre a tabela inteira de cartões/tarefas procurando quem aponta para ela.
--    Alguns índices antigos de uma coluna só ficam redundantes e saem.
-- =============================================================================

-- 1) Colunas editáveis -------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (
  display_name, timezone, locale, theme, motion, appearance,
  daily_goal_min, rest_weekday, streak_min_min,
  pomodoro_focus_min, pomodoro_break_min, pomodoro_long_break_min, pomodoro_cycle_length,
  new_cards_per_day
) on public.profiles to authenticated;

revoke update on public.public_profiles from authenticated;
grant update (handle, display_name, bio) on public.public_profiles to authenticated;

-- 2) Índices das chaves estrangeiras compostas -------------------------------------------------
create index if not exists boards_user_trilha_idx        on public.boards (user_id, track_id);
create index if not exists goals_user_trilha_idx         on public.goals (user_id, track_id);
create index if not exists focus_sessions_user_trilha_idx on public.focus_sessions (user_id, track_id);
create index if not exists notes_user_trilha_idx         on public.notes (user_id, track_id);
create index if not exists notes_user_baralho_idx        on public.notes (user_id, deck_id);
create index if not exists decks_user_trilha_idx         on public.decks (user_id, track_id);
create index if not exists note_links_user_origem_idx    on public.note_links (user_id, from_note);
create index if not exists board_links_user_origem_idx   on public.board_links (user_id, from_item);
create index if not exists board_links_user_destino_idx  on public.board_links (user_id, to_item);

-- Estes substituem os de uma coluna só (o novo serve para as mesmas buscas, já que a RLS sempre
-- acrescenta "user_id = eu" na consulta).
create index if not exists board_items_user_mural_idx    on public.board_items (user_id, board_id);
drop index if exists public.board_items_board_idx;
create index if not exists board_links_user_mural_idx    on public.board_links (user_id, board_id);
drop index if exists public.board_links_board_idx;
create index if not exists note_links_user_destino_idx   on public.note_links (user_id, to_note);
drop index if exists public.note_links_destino_idx;
create index if not exists cards_user_baralho_idx        on public.cards (user_id, deck_id);
drop index if exists public.cards_baralho_idx;
create index if not exists cards_user_nota_idx           on public.cards (user_id, note_id);
drop index if exists public.cards_nota_idx;
create index if not exists card_reviews_user_cartao_idx  on public.card_reviews (user_id, card_id, reviewed_at desc);
drop index if exists public.card_reviews_cartao_idx;
