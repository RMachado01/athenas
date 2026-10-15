# ADR-005: Sincronização com o Google Agenda — agenda separada, `syncToken`, `etag` e conflitos

**Status:** Accepted (2026-10-15) — Etapa 1 (importar) implementada, ver Emenda 2; Etapa 2 (exportar com outbox) pendente
**Date:** 2026-10-07
**Deciders:** Renan

## Context

Requisito (Fase 2): **exportar** blocos de estudo para o Google Agenda e **importar** eventos externos (somente leitura) para o calendário do app (o mockup mostra "Plantão na central" e "Almoço em família" em tracejado azul). Sincronização bidirecional é o ponto onde mais apps criam **duplicatas, loops e perda de dados**; por isso a estratégia precisa ser explícita.

Problemas que encontrei ao cruzar o system-design com a documentação do Google (**confirmar escopos e limites na documentação oficial na hora de implementar** — eles mudam):

1. **Escopo insuficiente.** O plano pede `calendar.events`, mas esse escopo gerencia *eventos*; **criar a agenda secundária "Athenas" exige outro escopo** (`calendar.app.created`, que também restringe a escrita às agendas criadas pelo app, ou o amplo `calendar`). Para *listar* agendas do usuário, outro (`calendar.calendarlist.readonly`).
2. **Modo de teste derruba o token em 7 dias.** O system-design diz "enquanto for só você, o app fica em modo de teste". Para apps externos em *Testing*, o **refresh token expira em 7 dias** — a sincronização pararia semanalmente. Alternativa: publicar o app como **"In production" sem verificação** (limite de 100 usuários e tela de aviso "app não verificado") — para uso pessoal, é o caminho.
3. **Supabase Auth não guarda o refresh token do Google** (só o entrega no login, uma vez) e exige `access_type=offline` + `prompt=consent` para recebê-lo. Prender a integração ao login é frágil.
4. **`google_tokens.sync_token` único** não basta: `syncToken` é **por agenda** (a primária e a "Athenas" têm tokens diferentes).
5. Falta estado de sincronização para a UI ("Conectada · sincronizada há 2 min" em Ajustes) e para erros ("Reconectar").
6. O refresh token está descrito como "criptografado" sem dizer como.

## Decision

### Conexão (identidade ≠ calendário)

- **Login com Google só com escopos de identidade** (`openid email profile`). A integração é um **fluxo separado**, iniciado em Ajustes → "Conectar Google Agenda" (autorização incremental, `access_type=offline`, `prompt=consent`, `include_granted_scopes=true`), implementado como rota/Edge Function nossa (code flow com `state` + PKCE).
- **Escopos mínimos (princípio do menor privilégio):** escrever só na agenda do app (`calendar.app.created`) + **ler** eventos das demais (`calendar.events.readonly`) + listar agendas (`calendar.calendarlist.readonly`). Evitar o amplo `calendar.events` com escrita em tudo.
- **Publicar o projeto no Google Cloud como "In production"** (não verificado, ≤100 usuários) em vez de "Testing". Se virar SaaS: passar pela verificação do Google.
- **Refresh token no Supabase Vault**, referenciado em `private.google_connections` (schema não exposto pela API). Sem policy para `authenticated`; só Edge Functions com `service_role`.
- `invalid_grant`/revogação ⇒ `status = 'needs_reauth'`, UI mostra "Reconectar" (voz do design system: *"Não deu pra sincronizar com o Google. Tentar de novo?"*).

### Modelo (adições ao ADR-002)

- `private.google_connections (user_id pk, vault_secret_id, scopes, status, last_synced_at, last_error)`.
- `google_calendars (user_id, google_calendar_id, role 'athenas'|'import', sync_token, enabled, sync_locked_until)` — um `syncToken` **por agenda**.
- `study_blocks` ganha: `google_calendar_id`, `google_event_id`, `etag`, `google_updated_at`, `updated_at` (trigger), `sync_state` (`pending_push|synced|conflict|error`), `is_all_day`, `status` inclui `cancelled`. Chave única `(user_id, google_calendar_id, google_event_id)`.
- **RLS:** linhas `source = 'google'` são **somente leitura** para o cliente (policies de `update/delete` só para `source = 'app'`).
- Eventos importados guardam só o necessário (título, horário, dia inteiro, fuso). O usuário escolhe quais agendas importar (`enabled`).

### Exportar (app → Google): padrão *outbox*

1. Criar/mover/apagar um bloco `source='app'` marca `sync_state='pending_push'` (trigger).
2. A Edge Function `gcal-push` processa pendentes (acionada por webhook do banco ou cron de 1–5 min, e ao salvar).
3. **Idempotência contra duplicatas:** o `id` do evento no Google é **derivado do UUID do bloco** (a API aceita `id` próprio em base32hex: o hex do UUID sem hífens serve). Se o `insert` for repetido após timeout, o Google responde 409 em vez de criar um segundo evento. Também gravar `extendedProperties.private.athenas_block_id`.
4. Atualizações usam **`If-Match: <etag>`**. `412 Precondition Failed` = alguém mudou no Google ⇒ fluxo de conflito.
5. Apagar bloco ⇒ `events.delete`; `404/410` conta como sucesso.

### Importar (Google → app): `syncToken` incremental

1. **Primeira carga (full sync)** por agenda: `events.list` com `singleEvents=true` e `timeMin` (≈ 30 dias atrás); paginar; só ao receber a **última página** guardar o `nextSyncToken` — e **na mesma transação** em que as linhas foram gravadas (token e dados nunca ficam fora de sincronia).
2. **Cargas seguintes:** `events.list?syncToken=…` (sem `timeMin/timeMax/orderBy`: com token, não se pode filtrar). Eventos `status: cancelled` viram remoção/cancelamento.
3. **`410 Gone`** = token inválido ⇒ descartar o token e refazer full sync (previsto, não é bug).
4. **Quando roda:** `pg_cron` a cada 15 min → Edge Function (via `pg_net`, com segredo no header) **e** ao abrir o calendário se a última carga tem > 2 min. Webhooks (`events.watch`) ficam como otimização futura (exigem endpoint HTTPS público e renovação de canais).
5. **Sem execuções concorrentes:** `sync_locked_until` com *compare-and-set* por agenda (cron + "abri o calendário" não podem rodar juntos).
6. Rate limit/erros: backoff exponencial em `403 rateLimitExceeded`/`429`/`5xx`; erro persistente grava `last_error`.

### Conflitos

- Só pode haver conflito em **blocos do app** (eventos `source='google'` são só leitura): o mesmo bloco foi alterado no app *e* no Google desde a última sincronização (`etag` difere **e** `sync_state='pending_push'`).
- **Regra:** vence a edição **mais recente**, comparando `blocks.updated_at` (carimbo do servidor) com `google_updated_at` (carimbo do Google) — **nunca** relógio do aparelho. A versão perdedora é registrada num log (`sync_log`) e o app avisa com um toast ("Atualizamos o bloco 'X' com a versão do Google Agenda. Desfazer?").
- **Apagou no Google um evento criado pelo app** ⇒ o bloco fica `status='cancelled'` (não é apagado), para preservar o vínculo com `focus_sessions.study_block_id` (ADR-002) e as horas já estudadas.
- **Usuário apagou a agenda "Athenas" no Google** ⇒ `404`: marcar `needs_attention`, oferecer recriar a agenda e reexportar.
- **Dia inteiro e fuso:** eventos de dia inteiro usam `date` (sem horário); converter com o `timezone` do perfil; guardar UTC + fuso original; testar horário de verão.

## Options Considered

### Option A: Agenda separada + syncToken + etag + outbox (escolhida)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Média-alta (é a parte mais difícil do app) |
| Custo | Zero (quotas da API sobram para 1 usuário) |
| Risco de dados | Baixo: nunca mexe na agenda principal |
| Familiaridade | Baixa — por isso o ADR |

**Prós:** isolamento (um bug não bagunça sua agenda real); idempotente; incremental (barato); conflitos raros e bem definidos.
**Contras:** várias peças (OAuth próprio, vault, cron, locks); escopos mais sensíveis a mudanças do Google.

### Option B: Escrever direto na agenda principal

**Prós:** menos código (sem criar agenda).
**Contras:** polui e arrisca editar/apagar eventos reais; difícil desfazer bagunça; escopo mais amplo.

### Option C: Só importar (somente leitura)

**Prós:** simples e seguro.
**Contras:** perde a "mágica" (blocos de estudo no celular, lembretes do Google). Boa **primeira entrega** dentro da Fase 2: importar primeiro, exportar depois.

### Option D: Integração por terceiros (Zapier/Make/Cal.com)

**Prós:** rápido.
**Contras:** latência, custo, dependência, nenhum aprendizado de SQL/integração; descartada.

### Option E: Polling completo sem `syncToken` (listar tudo sempre)

**Contras:** caro, lento, sem detecção confiável de exclusões; descartada.

## Trade-off Analysis

A decisão-chave é **limitar o raio de explosão**: agenda separada + escopo mínimo + eventos importados somente leitura reduzem o que pode dar errado a "meus blocos duplicaram ou sumiram", problema que o ID determinístico, o `etag` e o status `cancelled` neutralizam. Aceitamos mais código de infraestrutura em troca de nunca arriscar a agenda real. Recomendo **entregar em duas etapas dentro da Fase 2**: (1) importar somente leitura; (2) exportar com outbox — a etapa 2 só depois de a 1 ficar estável por alguns dias.

## Consequences

- **Mais fácil:** UX de "blocos no celular"; depuração (log de sync); extensão para outras agendas.
- **Mais difícil:** testes (precisa de mock da API do Google e de uma conta de teste); manutenção da conexão (tokens, escopos).
- **A revisitar:** `events.watch` em vez de cron; verificação do app no Google se virar SaaS; lembretes (evitar notificação duplicada app × Google — decidir se eventos do app criam lembrete no Google ou só o app avisa).

## Action Items

1. [ ] Criar o projeto no Google Cloud, configurar a tela de consentimento e **publicar como "In production"** (sem verificação) já que é só você.
2. [ ] Confirmar na doc do Google os escopos exatos de: criar agenda secundária, listar agendas, ler eventos.
3. [ ] Migrations: `google_connections` (schema `private`), `google_calendars`, colunas de sync em `study_blocks`, `sync_log`.
4. [ ] Implementar conexão OAuth (incremental) + Vault + estado `needs_reauth`.
5. [ ] `gcal-pull` primeiro (full sync + incremental + `410`), com testes contra respostas gravadas.
6. [ ] `gcal-push` com ID determinístico, `If-Match`, tratamento de `412/409/404`.
7. [ ] Testes de conflito (edição nos dois lados), exclusão remota, recriação da agenda e DST.

---

## Emenda 1 (2026-10-07) — impacto do multiusuário

1. **Verificação do app no Google:** "In production sem verificação" vale só até **100 usuários** e mostra tela de aviso. Como os escopos de Calendar são **sensíveis**, para passar disso (ou para uma experiência sem aviso) é preciso **verificar o app** (domínio verificado, política de privacidade, justificativa dos escopos, vídeo de demonstração). Plano: integração com Google Agenda **opcional**, liberada primeiro para o beta fechado; iniciar a verificação quando o Calendário estiver estável.
2. **Escala do sync:** com N usuários, o cron de 15 min não pode chamar tudo de uma vez. Usar **fila** (`pgmq`): o cron só enfileira "sincronizar conexão X"; workers (Edge Functions) consomem em lotes pequenos, com **concorrência limitada** e backoff por usuário.
3. **Isolamento:** `google_connections`/`google_calendars` ficam no schema privado e **por usuário**; a Edge Function sempre carrega as credenciais pelo `user_id` do job (nunca de parâmetro do cliente).
4. **Privacidade:** títulos de eventos importados são **dados pessoais sensíveis** (consultas, plantões). **Nunca** entram em agregados de grupo (ADR-006); a política de privacidade deve citá-los; a desconexão remove as linhas `source='google'` do usuário.

---

## Emenda 2 (2026-10-12) — Etapa 1 implementada: importar (somente leitura)

1. **Rotas do Next em vez de Edge Functions.** A conexão e a sincronização rodam em Route Handlers do Next na Vercel (`/api/google/conectar`, `/retorno`, `/sincronizar`, `/desconectar`). Mesmo modelo de segurança, menos peças e testável junto do resto. O servidor usa a chave secreta do Supabase **só** para chamar funções `gcal_*` (SECURITY DEFINER, EXECUTE apenas para `service_role`), sempre com o `user_id` da sessão validada por `getClaims()`.
2. **Escopos confirmados na documentação oficial:** Etapa 1 = `calendar.events.readonly` + `calendar.calendarlist.readonly`. Etapa 2 acrescentará `calendar.app.created` (criar a agenda "Athenas" e escrever só nela).
3. **Token:** refresh token no **Supabase Vault** (`vault.create_secret`), referenciado por `private.google_connections.vault_secret_id`. O navegador nunca vê o token; o estado da conexão chega à tela por `minha_conexao_google()`, que não devolve segredo.
4. **Tabelas:** `google_calendars` (sync_token por agenda, `enabled`, trava `sync_locked_until`) e `calendar_events` (só leitura para a pessoa; a pessoa só pode alterar `google_calendars.enabled`). `gcal_aplicar_lote` grava eventos e o novo `sync_token` na **mesma transação**.
5. **Quando sincroniza:** ao abrir a Agenda, se a última sincronização tiver mais de 2 min, e pelo botão "Sincronizar agora". O cron de 15 min (com fila) fica para depois.
6. **Janela da carga completa:** 30 dias para trás e 90 à frente. `410 Gone` refaz a carga completa uma vez.
7. **Desligar uma agenda** apaga os eventos dela e esquece o `sync_token` (ao religar, carga completa). **Desconectar** revoga no Google e apaga segredo, conexão, agendas e eventos.
8. **Visual:** tela Agenda no estilo Notion Calendar (grade de horas com linhas finas, faixa "Dia todo", blocos com a cor da agenda na borda esquerda), mobile-first, com os tokens e temas do Athenas. A Agenda é desenhada só no aparelho (evita divergência entre a data do servidor e a do aparelho).
9. **Navegação:** a barra inferior passa a ter Agenda; Personalização foi para o menu do avatar no Início.

**Pendências da Etapa 1 (configuração, feita pela pessoa dona do projeto):** ativar a Google Calendar API; adicionar os dois escopos à tela de consentimento; adicionar a URL de retorno `/api/google/retorno` ao cliente OAuth; publicar como "Em produção" (sem verificação); configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `SUPABASE_SECRET_KEY` na Vercel.