# ADR-002: Modelo de dados e RLS — sessões de foco como fonte da verdade; progresso e streak calculados em views

**Status:** Proposed
**Date:** 2026-10-07
**Deciders:** Renan

## Context

O app mostra muitos números: horas do dia, horas da semana, % da meta, sequência (streak), progresso por trilha, mapa de calor, conquistas. A tentação clássica é guardar esses totais em colunas (`goals.progress`, `profiles.streak`). O problema: **totais guardados envelhecem** — editar uma sessão, mudar de fuso, apagar uma tarefa ou mexer na meta deixa o número errado, e você nunca sabe qual está certo.

Outras forças:

- Hoje há 1 usuário, mas o modelo precisa nascer **multiusuário-seguro** (RLS desde o dia 1).
- O navegador fala direto com o banco (ADR-001), então **a RLS é a única barreira** de segurança — erro aqui = vazamento.
- O projeto é portfólio de dados: views, window functions e testes de SQL são parte do valor.
- O system-design define 9 tabelas, mas a revisão (ver `revisao-e-plano-fase-0.md`) achou lacunas que afetam esta decisão: pausa do timer, sessão manual, vínculo bloco↔sessão, recorrência de metas, definição de "progresso da trilha", dia de descanso, sincronização por calendário.

## Decision

### 1. Fonte da verdade: `focus_sessions` (append-only na prática)

Tempo estudado **nunca** é um total guardado. Só existem sessões (fatos). Todo número do dashboard é uma **consulta** sobre fatos. Princípio de modelagem de dados que você vai reconhecer de BI: *guardar o fato no menor grão; derivar as métricas*.

Ajustes ao esboço do system-design:

| Ponto | Decisão | Por quê |
|---|---|---|
| Pausa do timer | `focus_sessions` ganha `paused_at timestamptz null` e `paused_ms int default 0`. Tempo decorrido = `(now − started_at) − paused_ms` (− pausa em curso). | A fórmula original `planned − (agora − started_at)` ignora pausas. O Foco do mockup tem "Pausar/Continuar". |
| Tipos de sessão | `kind in ('focus','break','long_break')`; só `focus` conta como estudo. | `FocusTimer` fala de pausa longa a cada 4; o esboço só tinha `break`. |
| Estudo sem timer | `source in ('timer','manual')`. Sessão manual = "estudei 40 min de videoaula". | Sem isso o streak pune quem estudou fora do app. |
| Sobrevivência a deleções | `task_id`/`track_id` com `ON DELETE SET NULL`, e `track_id` **copiado** na sessão. | Apagar uma tarefa não pode apagar horas estudadas. |
| Sessão interrompida | Conta pelo tempo real (`ended_at − started_at − paused_ms`); `completed` só diz se bateu o planejado (conta pomodoros). | Regra explícita para o número "3h20 hoje". |
| Idempotência | `id uuid` **gerado no cliente**; `insert ... on conflict (id) do nothing`. | Permite reenviar offline sem duplicar (ADR-004). |
| Bloco ↔ sessão | `focus_sessions.study_block_id uuid null`. | O bloco "concluído" do calendário vira *derivado* ("existe sessão ligada a ele"), não um estado guardado. |
| Fuso | Tudo `timestamptz`; "dia" é calculado em `profiles.timezone`. Sessão que cruza meia-noite é **atribuída ao dia em que começou** (simples e explicável; documentar). | Evita o bug clássico de streak quebrado por UTC. |

### 2. Progresso e streak são **views/funções**, nunca colunas

- `v_daily_study (user_id, day, minutes)` — soma de minutos de foco por dia no fuso do usuário.
- `v_goal_progress` — progresso **e** ritmo ("no ritmo", "atrasada X dias", "precisa de 1h50/dia"); a UI não calcula regra de negócio.
- `v_track_progress` — a spec original **não define** o "62%" de cada trilha no Dashboard. Decisão: % = tarefas concluídas ÷ tarefas totais da trilha (simples); horas por trilha ficam em outra view. Revisitar se não refletir o que você sente.
- `fn_current_streak()` e `fn_longest_streak()` — "gaps and islands" (window functions: `day − row_number() over (order by day)` agrupa dias consecutivos). **Dia de descanso:** a contagem trata o `rest_weekday` como "ponte": se ele é o único dia faltante entre dois dias válidos, não quebra. O "recorde: 12 dias" do Dashboard sai de `fn_longest_streak`, sem tabela extra.
- Quando medir lento (centenas de milhares de linhas, improvável aqui), promover para *materialized view* com `pg_cron` — não antes.

### 3. Metas: progresso por **fonte explícita**

O esboço (`kind = hours | count | milestone`) não diz **o que é contado** em "31 de 50 exercícios" ou "PL-300 48%". Decisão:

- `hours`: soma de minutos de foco (filtrável por `track_id`) no período.
- `count`: **tarefas concluídas ligadas à meta** (`tasks.goal_id`) com peso `1`. Para "31 de 50 exercícios", crie tarefas ou use um contador manual (coluna `goals.manual_progress`). O mockup mistura os dois; vamos escolher na Fase 2 e anotar aqui.
- `milestone`: `progress = concluídas/total` das tarefas ligadas (marcos viram tarefas).
- **Recorrência** ("15h por semana" todo semana): meta com `period = week|month` e `recurring boolean`; a view gera a janela corrente (`date_trunc` no fuso do usuário) em vez de exigir uma linha nova por semana.

### 4. RLS — regras do jogo

1. **Toda** tabela com `ENABLE ROW LEVEL SECURITY` **e** `FORCE`; policies `to authenticated`, nunca `public`.
2. Policies separadas por comando (`select`, `insert`, `update`, `delete`) com `using` **e** `with check`.
3. Usar `(select auth.uid())` (com `select` em volta) para o Postgres avaliar uma vez por query, não por linha; `user_id` sempre indexado.
4. **Views com `security_invoker = true`.** Por padrão, uma view roda com os poderes do dono e **ignora a RLS** — vazaria dados de todos os usuários. Esta é a armadilha nº 1 do Supabase.
5. Funções expostas ao cliente **não recebem `user_id` como parâmetro** (usam `auth.uid()`); `security definer` só onde inevitável, com `search_path` fixo.
6. **FKs compostas contra "vazamento por referência":** `tasks (user_id, track_id) → tracks (user_id, id)`. Sem isso, a RLS de `tasks` aceita `track_id` de *outro* usuário (UUID adivinhado). Isso também vale para `parent_id` (subtarefa) e `goal_id`.
7. `achievements` é catálogo global (**sem** `user_id` — o system-design diz "todas com user_id", mas esta é exceção): `select` para `authenticated`, nenhuma escrita pelo cliente. `user_achievements` só é escrita pela função/trigger de desbloqueio (`security definer`).
8. `google_tokens` vai para um schema **não exposto** pela API (`private`), com o refresh token no **Supabase Vault**; só Edge Functions (service role) acessam.
9. **Testes de RLS são obrigatórios** (pgTAP via `supabase test db`): usuário A não lê/escreve nada do B, inclusive via views e FKs. Roda no CI (Fase 0).
10. Criação de usuário: trigger `on auth.users insert` cria `profiles` e **semeia trilhas-template** para aquele usuário (o `seed.sql` do system-design só roda em `db reset` local — não serve para "trilhas que já nascem como template").

### 5. Esquema de migrations

Uma migration por assunto, em ordem, sempre aditiva: `extensions → profiles → tracks/goals/tasks → focus_sessions → study_blocks → views/funções → rls → achievements → private/google`. Nunca editar migration já aplicada; corrigir com nova migration.

## Options Considered

### Option A: Fatos + views (escolhida)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Média (SQL de views/janelas) |
| Custo | Zero |
| Escalabilidade | Boa até ~milhões de linhas com índices; materialized view depois |
| Familiaridade | Ótima para quem estuda BI/SQL |

**Prós:** números sempre consistentes; corrigir sessão corrige tudo; ótimo material de portfólio (CTEs, window functions, testes); sem jobs de recálculo.
**Contras:** cada leitura recalcula (barato nesta escala); regra de negócio fica no SQL (precisa de teste).

### Option B: Totais guardados e incrementais (`profiles.streak`, `goals.progress`)

**Prós:** leitura trivial e rápida.
**Contras:** drift garantido; precisa de triggers/jobs para manter; difícil de depurar ("por que o streak é 6?"); quebra com fuso, edição e exclusão.

### Option C: Event sourcing completo / tabela de eventos genérica

**Prós:** auditável.
**Contras:** over-engineering para este escopo; mais difícil de consultar.

## Trade-off Analysis

Escolhemos **consistência acima de velocidade de leitura**. Com 1 usuário, recalcular 365 dias de sessões é microsegundos; o que custa caro é um número errado que você deixa de confiar. Também preferimos regra de negócio no SQL (testável, versionada) a espalhá-la entre front e back.

O custo extra é o **rigor de RLS** (itens 1–9). Aceitamos porque, sem camada de API intermediária, é isso que mantém a porta trancada quando virar multiusuário.

## Consequences

- **Mais fácil:** corrigir dados (editar sessão); reusar as mesmas views em dashboard, heatmap, conquistas; tornar-se multiusuário.
- **Mais difícil:** exige disciplina de teste SQL; a UI depende de views (mudar regra = nova migration).
- **Revisitar:** materialized views quando medir lentidão; granularidade de pausas se quiser análise fina (hoje só `paused_ms`); conquistas que dependem de eventos externos ("publicar projeto no GitHub") não cabem em regras de sessão — viram marcação manual.

## Action Items

1. [ ] Escrever o DDL das tabelas (com FKs compostas, `CHECK`s, índices) na migration 0002–0005.
2. [ ] Escrever policies + `security_invoker` nas views e pgTAP para cada tabela.
3. [ ] Implementar `fn_current_streak`/`fn_longest_streak` com testes de borda: dia de descanso, virada de fuso, sessão que cruza meia-noite, dia só com sessão manual.
4. [ ] Decidir definição final de "progresso" para metas `count` (peso, contador manual) antes da Fase 2.
5. [ ] Trigger `handle_new_user` (profile + trilhas-template) e gatilho de conquistas com `security definer`.

---

## Emenda 1 (2026-10-07) — multiusuário real e grupos

A frase de contexto "hoje há 1 usuário" deixou de valer: **o produto é multiusuário desde o dia 1** (ver **ADR-006**). Consequências para este modelo:

1. **`profiles` é privado; nasce `public_profiles`** (handle, nome de exibição, avatar, bio) para tudo que outras pessoas podem ver. Nenhum campo privado (fuso, metas, preferências) é legível por outros usuários.
2. **O mundo pessoal não sabe que grupos existem.** As policies das tabelas pessoais continuam só `user_id = auth.uid()`. Compartilhamento acontece **apenas** por funções `security definer` que devolvem agregados consentidos (`share_level` em `group_members`). Isso mantém as regras 1–10 acima intactas.
3. **Dados de grupo** (ADR-006) seguem o padrão de pertencimento: funções `stable security definer` com `search_path` fixo (`is_group_member`, `has_group_role`), chamadas dentro de `(select …)` nas policies.
4. **Exclusão de conta e LGPD:** FKs para `auth.users` com `ON DELETE CASCADE` no mundo pessoal; no mundo social, anonimizar (`author_id → null` + "Usuário removido") onde o histórico do grupo precisar sobreviver. Função de **exportação** dos dados do usuário.
5. **`user_id` + FKs compostas** viram requisito de segurança entre pessoas reais (antes era integridade). Testes pgTAP de isolamento entre A e B passam a ser **portão de CI** desde a Fase 0.
6. **Fuso e "dia":** continua por usuário (`profiles.timezone`); rankings de grupo usam o fuso de **cada** usuário para decidir a que dia pertence a sessão, e o período do grupo (semana) é definido em UTC ou no fuso do grupo — decidir na Fase 3 e registrar aqui.
