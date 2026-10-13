# Flashcards com repetição espaçada — design

**Data:** 2026-10-12 · **Status:** em revisão pelo Renan · **Terceira de 4 peças** da área estilo Notion/Obsidian (feito: mural, notas ligadas; depois: grafo).
Base: [pesquisa de produto](../../pesquisa/2026-10-12-pesquisa-de-produto.md) e [auditoria de design](../../pesquisa/2026-10-12-auditoria-de-design.md).

## Intenção

Ajudar qualquer estudante a **lembrar por mais tempo**: o app mostra cada cartão perto do momento em que ele seria esquecido (repetição espaçada + active recall, as duas técnicas de evidência mais alta). Mobile-first, rápido (responder não espera a rede), conversando com as Notas, o Início e o Foco.

**O que o Renan decidiu:**
- Cartões criados **à mão** e **dentro das notas** (`pergunta :: resposta`).
- **4 botões + FSRS** (Errei / Difícil / Bom / Fácil, cada um com o próximo intervalo).
- **Baralhos**, opcionalmente ligados a uma trilha.
- Só **frente/verso** nesta versão.
- Card **"Revisar hoje"** no Início e **tempo de revisão conta no Foco**.
- Abordagem **A**: o algoritmo roda no aparelho; o banco grava estado + histórico numa transação.
- Aprovou as recomendações da pesquisa (10 novos/dia, pausa com atraso, sintaxe Obsidian) e da auditoria (virada 3D, botões só após virar, progresso, resumo, `.tocavel`).

**Fora desta versão (roadmap "Flashcards v2"):** ida e volta `:::`, lacunas `==cloze==`, multilinha `?`, imagens, linter de cartões, estatísticas, previsão de carga, dias leves, calibrar o FSRS por pessoa, cartão no mural, onboarding de SRS, modo offline.

## Algoritmo

- **ts-fsrs 5.4.2** (MIT, sem dependências, FSRS-6; versão estável de 01/09/2026 — não a 6.0 beta). Instalada pelo workflow `dependencias.yml`.
- Parâmetros: padrão da biblioteca, `request_retention = 0.9`, `maximum_interval = 36500`, `enable_fuzz = true`, passos de aprendizagem padrão (1 min, 10 min).
- Um módulo puro `features/flashcards/agendador.ts` isola a biblioteca: converte linha do banco ↔ `Card` do ts-fsrs, devolve a prévia dos 4 botões (`repeat`) e o resultado de uma nota (`next`). Trocar de versão/parâmetros mexe só aqui.

## Dados (migration `20261015120000_flashcards.sql`)

**`decks`** — `id, user_id, name (1–80), color (paleta de 8 do mural), track_id?, is_default bool, archived_at, created_at, updated_at`.
- Nome único por pessoa entre os ativos (`lower(btrim(name))`); no máximo um `is_default` por pessoa (índice parcial).
- "Geral" (`is_default`) é criado sob demanda pela função `baralho_padrao()` (SECURITY INVOKER, idempotente).
- Arquivar baralho tira seus cartões da revisão (não apaga).

**`cards`** — conteúdo + estado FSRS:
- `id, user_id, deck_id, note_id?, front (1–2000), back (1–2000)`.
- Estado: `state smallint (0 novo, 1 aprendendo, 2 revisão, 3 reaprendendo), due timestamptz, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, last_review?`.
- `suspended bool`, `archived_at`, `created_at`, `updated_at`.
- FKs compostas `(user_id, …)` para baralho e nota. Nota apagada ⇒ cartão arquivado (gatilho), nunca some o histórico.
- Índice `(user_id, due) where archived_at is null and not suspended`.
- Cartão com `note_id` só é editado pela nota (a tela mostra "Editar na nota").

**`card_reviews`** — histórico, uma linha por resposta:
- `id, user_id, card_id, rating (1–4), reviewed_at, duration_ms (0–600000)`, e o **estado completo antes** da resposta (`antes jsonb`) + o estado depois (`due, stability, difficulty, state, scheduled_days`).
- Serve para desfazer, estatísticas e calibração futuras.

**`notes.deck_id`** (novo, opcional) — o baralho dos cartões daquela nota; vazio ⇒ "Geral".
**`profiles.new_cards_per_day`** (novo, 0–100, padrão **10**).
**`focus_sessions.origin`** (novo, `'foco' | 'revisao'`, padrão `'foco'`) — os minutos de revisão entram no streak, mapa de calor e metas como hoje; as estatísticas podem separar.

**Funções** (todas SECURITY INVOKER, `search_path=''`, EXECUTE só para `authenticated`; a RLS vale):
- `responder_cartao(p_card, p_reps_esperado, p_rating, p_novo jsonb, p_duracao_ms)` — confere `reps = p_reps_esperado` (se outro aparelho já respondeu, falha com "conflito"), grava o histórico com o estado anterior e atualiza o cartão. Uma transação.
- `desfazer_resposta(p_review)` — só a última resposta daquele cartão; restaura `antes` e apaga a linha do histórico.
- `salvar_nota(..., p_cartoes jsonb)` — nova versão (a antiga é removida): além de texto e links, recebe `[{id, frente, verso}]` e, na mesma transação, cria os novos (no baralho da nota ou no "Geral"), atualiza frente/verso dos existentes **sem mexer no agendamento**, arquiva os que saíram do texto e desarquiva os que voltaram.

**View `v_decks`** (security_invoker) — por baralho ativo: total, novos, aprendendo, **vencidos agora**, atrasados (vencidos antes de hoje no fuso da pessoa).

**Limites e RLS:** RLS forçada por dono em tudo; `anon` sem acesso. 5.000 cartões por pessoa, 200 por nota, 100 baralhos (gatilho). O "hoje" usa `profiles.timezone`, igual ao Foco.

## Cartões dentro das notas

- **Sintaxe Obsidian:** um parágrafo (inclusive dentro de listas) com `::` vira cartão: antes = frente, depois = verso (primeiro `::`, lados aparados e não vazios). Ignorados: `::` dentro de código inline (ex.: `std::vector`), blocos de código e linhas com `:::` (reservado para a v2).
- **Identidade estável:** uma extensão do Tiptap dá ao parágrafo um atributo invisível `cardId` (UUID) quando ele vira cartão; colar um parágrafo duplicado ganha id novo. Corrigir a pergunta mantém o histórico. Apagar a linha arquiva o cartão; desfazer no editor traz de volta com o histórico.
- **No editor:** o parágrafo-cartão ganha um leve destaque (decoração, sem mudar o texto) com o ícone de cartão. O cabeçalho da nota mostra a pílula **"N cartões · Baralho X"**, que abre a escolha do baralho.
- **Salvar:** o mesmo salvamento automático de hoje (800 ms / ao sair) envia os cartões extraídos para `salvar_nota`. Função pura `extrairCartoes(doc)` em `features/notes/documento.ts`.
- Nota arquivada ⇒ seus cartões saem da revisão (a view filtra).

## Telas

Entradas: item **"Flashcards"** no menu do avatar (provisório até a reorganização da navegação) e card **"Revisar hoje"** no Início (N para revisar · botão "Começar"; some quando não há nada e mostra "Tudo em dia ✓" discreto).

**`/flashcards`** — topo com o total devido e o botão grande **"Revisar tudo (N)"**; lista de baralhos (`.cartao .tocavel`: bolinha da cor, nome, trilha, contagens "8 para revisar · 3 novos"); "+" cria baralho (folha: nome, cor, trilha). Estado vazio ensina as duas formas de criar (à mão e `pergunta :: resposta` numa nota).

**`/flashcards/[id]`** — cabeçalho com voltar, nome e menu (editar, arquivar com Desfazer); botão "Revisar este baralho"; busca; lista de cartões (frente, verso em uma linha, chip de estado Novo/Aprendendo/Revisão e "em 3 d"; ícone de nota quando vem de uma nota). "+" abre a folha **Novo cartão** (Frente, Verso, Baralho; "Salvar e criar outro"). Tocar num cartão: editar (ou "Editar na nota"), suspender, arquivar com Desfazer.

**`/flashcards/revisar?baralho=…`** — tela cheia, sem a nav:
- Topo: fechar, barra de progresso (feitos / fila), Desfazer.
- Cartão `.vidro-forte` grande com a frente; tocar no cartão ou em **"Mostrar resposta"** (ou Espaço) vira com rotação 3D de 420 ms em mola; no modo reduzido vira um esmaecer.
- Depois de virar, os **4 botões** aparecem: Errei (danger), Difícil (warning), Bom (accent), Fácil (success), cada um com rótulo **e** intervalo ("<10 min", "1 d", "4 d", "9 d"); teclas 1–4. Alvos ≥ 48 px. Vibração curta em "Errei" (Android).
- Fila: aprendendo vencidos → revisões vencidas → novos até o limite do dia. Cartões em aprendizagem que vencem em até 20 min voltam na mesma sessão. **Se houver mais de 50 atrasados, novos ficam pausados** naquele dia, com aviso explicando.
- Fim: resumo (cartões, % de acertos = não-"Errei", minutos), anel de progresso, "Voltar" e, se houver, "Revisar mais 10 novos".
- Responder é otimista: o próximo cartão aparece na hora; a gravação segue em fila. Falha ⇒ aviso com "Tentar de novo" (as respostas pendentes não se perdem enquanto a tela está aberta); "conflito" ⇒ recarrega aquele cartão e avisa.

**Tempo no Foco:** a sessão mede o tempo ativo (pausas de mais de 5 min entre respostas cortam em trechos) e, ao terminar ou sair, grava em `focus_sessions` com `origin = 'revisao'` cada trecho de pelo menos 1 minuto. Função pura `trechosDeEstudo(respostas)`.

**Personalização:** seção "Flashcards" com "Cartões novos por dia" (0–100, padrão 10).

Rotas de laboratório em `/dev/flashcards…` com o Supabase falso, como as demais.

## Erros e casos de borda

- Frente/verso vazios: o formulário avisa no campo; na nota, a linha simplesmente não vira cartão.
- Limite de cartões atingido: a transação de `salvar_nota` falha inteira (texto e cartões nunca descasam); o aviso diz qual limite; o texto continua no editor e o salvamento tenta de novo na próxima edição.
- Baralho arquivado com nota apontando para ele: os cartões novos daquela nota vão para o "Geral".
- Desfazer além da sessão atual não é oferecido.
- Mudança de fuso: o "hoje" sempre vem do perfil.

## Testes

- **Unitários:** `agendador` (conversão, prévia dos 4 botões, ida e volta banco↔ts-fsrs), `extrairCartoes` (sintaxe, código inline, `:::`, listas, ids duplicados), montagem da fila (ordem, limite de novos, pausa com atraso, aprendizagem em 20 min), `trechosDeEstudo`.
- **Banco (PGlite):** RLS de tudo; `responder_cartao` (conflito, histórico), `desfazer_resposta` (só a última), `salvar_nota` com cartões (criar, editar sem perder agendamento, arquivar, desarquivar, baralho padrão, limite por nota), `baralho_padrao` idempotente, `v_decks` (atrasados no fuso), `focus_sessions.origin`.
- **E2E mobile (Supabase falso):** criar baralho e cartão; revisar com virar, 4 botões e Desfazer; cartão nascendo de uma nota e indo para o baralho; card do Início; resumo final; tempo indo para o Foco.
- **Acessibilidade:** axe WCAG 2.2 AA nos 8 temas em `/flashcards`, baralho e revisão; botões com nome e intervalo legíveis; virar sem animação no modo reduzido.

## Entregas (PR único, commits pequenos)

1. Banco (migration + testes). 2. Agendador e regras puras (+ testes). 3. Extensão do editor e cartões nas notas. 4. Telas de baralhos e cartões. 5. Sessão de revisão + Foco. 6. Início, Personalização, menu. 7. E2E + acessibilidade + ADR/CHANGELOG.
A migration vai para o Supabase só com a aprovação do Renan.
