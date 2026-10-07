# ADR-004: Escopo do offline no MVP — só leitura + timer agora; fila de escrita depois

**Status:** Proposed
**Date:** 2026-10-07
**Deciders:** Renan

## Context

O system-design se contradiz sobre offline:

- *Requisitos não funcionais*: "dá pra ver o dia, **marcar tarefas** e rodar o timer sem internet; sincroniza quando voltar".
- *PWA e offline*: "fila de mutações offline (**criar/concluir tarefa**, sessões) reenviada em ordem".
- *Riscos*: "**começar com offline só leitura + timer; fila de escrita na fase 3**".

Esta ADR resolve a contradição a favor do trecho de *Riscos* (e do seu pedido). O motivo é conceitual: **ler cache é fácil; escrever offline é um problema de sistemas distribuídos** (conflitos, ordem, duplicatas, erros parciais). Não vale pagar essa conta antes de o app ser usado de verdade.

O que o timer exige é diferente de "fila de escrita genérica": uma sessão de foco é um **fato que só é criado, nunca disputado** (append-only). Isso torna possível gravar offline com segurança *sem* resolver conflitos (ver ADR-002: `id` gerado no cliente, `insert ... on conflict do nothing`).

Outras forças:

- Notificação de fim de pomodoro com a aba fechada **não é garantida**: a Notification Triggers API (agendar notificação local no service worker) foi abandonada pelo Chrome; o caminho confiável é **Web Push** (servidor envia), que no iOS só funciona para PWA instalado na tela inicial. O system-design assume "notificação agendada quando suportado" — frágil.
- Abas em segundo plano têm timers de JS estrangulados; por isso o tempo deve vir de timestamps (já decidido).
- Serwist + Next 16 (Turbopack/webpack): compatibilidade precisa ser verificada na versão instalada.
- Dados pessoais no IndexedDB ficam sem criptografia no aparelho.

## Decision

### Dentro do MVP (Fase 1)

1. **App shell offline** via Serwist: precache de JS/CSS/fontes/ícones, página `/offline` de fallback, estratégia *stale-while-revalidate* para navegação do app logado.
2. **Leitura offline do essencial:** "Hoje" e "Semana" (tarefas abertas e do período, blocos da semana, metas ativas, perfil, trilhas) ficam num **snapshot no IndexedDB**. Implementação: persistir o cache do TanStack Query em IndexedDB (via Dexie como storage) — menos código do que um espelho relacional manual.
3. **UI honesta quando offline:** faixa discreta "Sem conexão — modo leitura" e **ações de escrita desabilitadas com explicação** (nada de checkbox que parece funcionar e depois reverte). Exceção: o timer.
4. **Timer offline com outbox mínimo:**
   - Tabela Dexie `outbox_focus_sessions`.
   - **Iniciar** (online): grava a sessão aberta no servidor (outro aparelho a vê). **Iniciar offline:** só local.
   - **Encerrar:** a sessão é enviada **já fechada** (`started_at`, `ended_at`, `paused_ms`, `planned_min`, `completed`). Assim nunca há "sessão aberta" no servidor vinda do offline, e não há conflito com outro aparelho.
   - Reenvio ao reconectar e ao abrir o app, em ordem, **idempotente** (UUID do cliente + `on conflict do nothing`), com retry e backoff; o item só sai do outbox após confirmação.
   - Índice parcial único no servidor: no máximo 1 sessão **aberta** por usuário.
5. **Relógio do aparelho:** `started_at`/`ended_at` vêm do aparelho; o servidor guarda `created_at = now()` e a view de qualidade marca diferenças absurdas (> 5 min entre `ended_at` e `created_at` com aparelho online) — só para diagnóstico, sem bloquear.
6. **Autenticação offline:** falha de rede ao renovar o token **não** desloga. Só `invalid_grant`/401 explícito do servidor desloga. No logout, **limpar** IndexedDB e caches do SW (dados pessoais).
7. **Notificação de fim de sessão no MVP:** quando o app/aba estiver aberto (inclusive PWA em segundo plano ativo): Notification API + som opcional + título da aba. **Não prometer** aviso com app fechado.

### Fora do MVP (Fase 3)

- **Fila de escrita genérica** (criar/editar/concluir tarefas, mover blocos).
- **Web Push** para fim de sessão e lembrete de bloco (tabela `push_subscriptions`, chaves VAPID, envio por Edge Function agendada via pg_cron).
- Política de conflito para edições concorrentes (proposta: *last-write-wins* por campo usando `updated_at` do servidor e um `mutation_id` por operação; ADR própria quando chegar a hora).

## Options Considered

### Option A: Leitura + timer com outbox append-only (escolhida)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Baixa-média |
| Custo | Zero |
| Risco de dados | Mínimo (sem conflito) |
| Familiaridade | Média |

**Prós:** cobre os dois usos realmente críticos (ver o dia, estudar no metrô); sem conflitos; ensina idempotência.
**Contras:** não dá para concluir tarefa offline (frustração pontual).

### Option B: Offline-first completo com fila de mutações desde já

**Prós:** experiência "nativa".
**Contras:** conflitos, ordenação, retries, migração de schema no IndexedDB, testes difíceis; atrasa o MVP (que deve estar em uso na semana 5).

### Option C: Só online (sem offline algum)

**Prós:** simplicidade máxima.
**Contras:** o timer falha em metrô/avião, justo onde se estuda; PWA perde o sentido.

### Option D: Sync engine pronto (PowerSync, ElectricSQL, RxDB)

**Prós:** resolve sync de verdade.
**Contras:** outra dependência/serviço grande, curva alta, custo; reavaliar na Fase 3 se a fila caseira ficar dolorosa.

## Trade-off Analysis

Dividimos "offline" em **dois problemas de dificuldades muito diferentes**: ler (barato) e escrever fatos imutáveis (barato com UUID de cliente), versus editar estado compartilhado (caro). Fazemos os dois primeiros agora e adiamos o terceiro até existir uso real que mostre se ele é mesmo necessário — exatamente a regra do system-design ("só entra feature que você sentiu falta usando").

## Consequences

- **Mais fácil:** MVP enxuto; sem bugs de conflito; o timer é confiável.
- **Mais difícil:** UX offline tem que ser clara (estados desabilitados com texto); precisa de teste Playwright com `context.setOffline(true)`.
- **A revisitar:** após 4 semanas de uso, medir "quantas vezes tentei concluir tarefa offline?" para decidir a Fase 3; compatibilidade Serwist × bundler; Web Push no iOS.

## Action Items

1. [ ] Verificar compatibilidade Serwist com o bundler do Next instalado; se preciso, build com webpack.
2. [ ] Definir o conjunto exato do snapshot offline ("Hoje" + "Semana") e a política de invalidação.
3. [ ] Implementar outbox de sessões + testes (offline→online, reenvio duplicado, app fechado no meio).
4. [ ] Teste E2E offline (Playwright) + teste de "não deslogar sem rede".
5. [ ] Atualizar o system-design para eliminar a contradição entre os 3 trechos sobre offline.
