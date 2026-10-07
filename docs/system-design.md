# Athenaeum — System Design

Oct 7, 2026 · @Renan

## Visão geral e requisitos

Athenaeum é um PWA pessoal (1 usuário, pronto pra virar multiusuário depois) que junta tarefas, calendário, metas, sessões de foco e progresso de estudo num lugar só, com 3 temas *old money* e animações fluidas. Ele roda em Next.js na Vercel com Supabase (Postgres + Auth) e sincroniza blocos de estudo com o Google Agenda.

**Requisitos funcionais**

| Módulo | O que faz | Prioridade |
| --- | --- | --- |
| Tarefas | CRUD, trilha, prazo, prioridade, subtarefas, quick add em linguagem natural, concluir com animação | MVP |
| Trilhas | Agrupam tarefas e metas (SQL, Power BI, Python, Git + dbt, Azure, Inglês); já nascem como template | MVP |
| Foco (Pomodoro) | Timer 25/5 ligado a uma tarefa; cada sessão vira registro de tempo | MVP |
| Dashboard | Hoje, horas da semana, sequência, próximos blocos, progresso por trilha | MVP |
| Calendário | Visão dia/semana/mês, arrastar e redimensionar blocos de estudo | Fase 2 |
| Google Agenda | Importa eventos (somente leitura) e exporta blocos de estudo | Fase 2 |
| Metas | Meta por trilha, semanal ou com prazo; progress ring e status de ritmo | Fase 2 |
| Gamificação | Sequência (streak), conquistas, mapa de calor de constância | Fase 3 |
| Personalização | 3 temas + automático, meta diária, duração do pomodoro, animações on/off | MVP (tema) / Fase 3 |

**Requisitos não funcionais**

- **UX primeiro:** primeira pintura < 1,5 s no celular (LCP), interações respondem em < 100 ms (INP), animações a 60 fps só com `transform` e `opacity`.
- **Offline:** dá pra ver o dia, marcar tarefas e rodar o timer sem internet; sincroniza quando voltar.
- **Acessibilidade:** WCAG 2.2 AA, contraste 4.5:1 nos 3 temas, tudo operável por teclado, respeito a `prefers-reduced-motion`.
- **Segurança:** Row Level Security em todas as tabelas; token do Google guardado só no servidor.
- **Custo:** R$ 0/mês no início (planos gratuitos de Vercel e Supabase dão conta de 1 usuário com folga).

## Stack de tecnologias

A escolha prioriza três coisas: entregar rápido sozinho, UX fluida e treinar o que aparece nas vagas de dados (SQL e Postgres de verdade, TypeScript, Git). Versões exatas: confira na hora de instalar — fixe a versão estável mais recente de cada pacote.

| Camada | Tecnologia | Por quê | Trade-off |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) + React + TypeScript | Server Components, rotas, Server Actions; deploy nativo na Vercel | Curva do App Router; cuidado com o que é client vs server |
| Estilo | Tailwind CSS mapeado para os tokens (CSS variables) | Rápido, e o tema muda só trocando `data-theme` | Classes longas; resolva com componentes |
| Componentes base | Radix UI (via shadcn/ui), restilizados | Acessibilidade pronta (diálogos, menus, foco) | Precisa tirar a cara "padrão shadcn" com os tokens |
| Animação | Framer Motion (`motion`) + View Transitions API | Layout animations, molas, shared element no Foco | \~30 kB; usar `LazyMotion` para carregar sob demanda |
| Ícones | Lucide | Traço fino combina com a serifa | — |
| Fontes | `next/font` com Cormorant Garamond, Instrument Sans, JetBrains Mono | Sem layout shift, self-hosted automático | — |
| Dados no cliente | TanStack Query | Cache, updates otimistas (check instantâneo) e retry | Mais um conceito pra aprender |
| Estado de UI | Zustand | Timer, tema e modais sem prop drilling | — |
| Formulários | React Hook Form + Zod | Validação igual no cliente e no servidor | — |
| Datas | date-fns (locale pt-BR) + chrono-node | Formatação e quick add em linguagem natural | chrono tem suporte parcial a pt-BR; testar |
| Calendário | FullCalendar (ou grade própria) | Arrastar/redimensionar já resolvido | Estilizar dá trabalho; grade própria dá mais controle |
| Gráficos | Recharts (ou SVG próprio) | Barras, linhas, heatmap simples | — |
| Banco + Auth | Supabase: Postgres, Auth (Google OAuth), RLS, Edge Functions, pg\_cron | SQL de verdade, auth pronta, gratuito | Lock-in leve; migrations versionadas mitigam |
| Offline / PWA | Serwist (service worker) + IndexedDB (Dexie) | Funciona sem rede, instalável | Sincronização offline exige cuidado com conflitos |
| Integração | Google Calendar API (OAuth, escopo `calendar.events`) | Blocos de estudo na agenda pessoal | Verificação do app no Google se for público |
| Qualidade | ESLint, Prettier, Vitest, Playwright, axe | Testes de unidade, E2E e acessibilidade | — |
| Deploy | Vercel + GitHub Actions | Preview por PR, CI com testes | — |
| Observabilidade | Vercel Analytics + Sentry (plano grátis) | Erros e Web Vitals reais | — |

## Arquitetura

São três peças e nenhum servidor pra manter: o navegador (PWA) lê e grava direto no Supabase, protegido por RLS; a Vercel renderiza as telas e roda as Server Actions; e Edge Functions do Supabase cuidam do Google Agenda.

&#91;embedded content: arquitetura · navegador, Vercel, Supabase e Google\]

Fluxo típico: você conclui uma tarefa → a UI marca na hora (otimista) → TanStack Query grava no Postgres → o Realtime avisa as outras abas → as views recalculam progresso e streak na próxima leitura.

## Modelo de dados (Supabase / Postgres)

São 9 tabelas, todas com `user_id` e RLS `user_id = auth.uid()`; o tempo estudado nunca é guardado como total, só como sessões, e os números do dashboard saem de views SQL.

| Tabela | Colunas principais | Observações |
| --- | --- | --- |
| `profiles` | id (= auth.users), name, theme, daily\_goal\_min, streak\_min\_min, pomodoro\_focus\_min, pomodoro\_break\_min, rest\_weekday, reduced\_motion, timezone | Uma linha por usuário; o tema também vai num cookie |
| `tracks` | id, user\_id, name, monogram, sort\_order, archived\_at | Trilhas: SQL, Power BI, Python… (seed inicial) |
| `goals` | id, user\_id, track\_id?, title, kind (`hours` · `count` · `milestone`), target\_value, unit, period (`week` · `month` · `custom`), starts\_on, due\_on, completed\_at | Progresso é calculado, não salvo |
| `tasks` | id, user\_id, track\_id?, goal\_id?, parent\_id?, title, notes, priority (1–3), status (`todo` · `doing` · `done`), due\_at, estimate\_min, completed\_at, sort\_order | `parent_id` = subtarefas |
| `study_blocks` | id, user\_id, task\_id?, starts\_at, ends\_at, source (`app` · `google`), google\_event\_id, etag, status | Blocos do calendário; eventos do Google entram como somente leitura |
| `focus_sessions` | id, user\_id, task\_id?, track\_id?, started\_at, ended\_at, planned\_min, kind (`focus` · `break`), completed | Fonte de verdade das horas |
| `achievements` | id, code, title, description, rule (jsonb) | Catálogo global (sem user\_id) |
| `user_achievements` | user\_id, achievement\_id, unlocked\_at | Desbloqueios |
| `google_tokens` | user\_id, refresh\_token (criptografado), scope, sync\_token, updated\_at | Sem policy de leitura no cliente: só a Edge Function acessa |

**Views e funções**

- `v_daily_study` — minutos de foco por dia (fuso do usuário). Alimenta gráfico, heatmap e streak.
- `v_goal_progress` — progresso de cada meta (soma de sessões ou contagem de tarefas no período).
- `fn_current_streak(user_id)` — dias seguidos com minutos ≥ `streak_min_min`, pulando o dia de descanso.
- Índices: `tasks (user_id, status, due_at)`, `focus_sessions (user_id, started_at)`, `study_blocks (user_id, starts_at)`.

Bônus pro seu estudo: essas views são exatamente o tipo de SQL (agregação por dia, window functions pro streak) que cai nos testes técnicos de dados.

## Hierarquia visual, navegação e UX

Cada tela responde uma pergunta só, e o olho segue sempre a mesma ordem: **saudação/título em serifa → número herói em mono dourado → ação primária dourada → conteúdo em cards com filete**. O dourado é raro de propósito, então onde ele aparece é onde está a próxima ação.

**Mapa de telas**

| Tela | Pergunta que responde | Elemento herói | Ação primária |
| --- | --- | --- | --- |
| Dashboard | "O que faço agora e como estou indo?" | Saudação + % da meta do dia | Começar foco |
| Tarefas | "O que falta e o que está atrasado?" | Grupos Atrasadas / Hoje / Semana | Adicionar rápido |
| Calendário | "Quando vou estudar?" | Grade da semana + linha dourada do agora | Novo bloco de estudo |
| Metas | "Estou no ritmo dos meus objetivos?" | Progress rings + mapa de calor | Nova meta |
| Foco | "Só isso agora." | Timer em 72 px | Iniciar / Pausar |
| Personalização | "Como eu quero que isso seja?" | Cards de tema com preview ao vivo | (salva sozinho) |

**Navegação**

- Desktop: sidebar fixa de 248 px; mobile: barra inferior com 4 abas + botão central de Foco (o FAB dourado).
- Command palette (`Ctrl/⌘ + K`) para criar tarefa, pular de tela e iniciar foco sem mouse.
- Atalhos: `N` nova tarefa, `F` foco, `X` concluir, `espaço` pausa o timer, `G` depois `C` vai pro calendário.
- O modo Foco esconde toda a navegação e silencia lembretes: o app sai da frente.

**Princípios de UX que guiam as decisões**

1. **Atrito zero pra começar a estudar:** do app aberto ao timer rodando em 1 clique (Começar foco já escolhe a próxima tarefa de maior prioridade).
2. **Tudo é otimista:** marcar, mover e editar respondem na hora; a rede confirma depois e desfaz com toast se falhar.
3. **Feedback de progresso constante, mas discreto:** cada sessão de foco mexe no ring, na barra e no streak — você vê o esforço virar número.
4. **Encorajar sem punir:** streak quebrada mostra "recomece hoje", nunca vermelho de culpa.
5. **Movimento com função:** stagger de 40 ms na entrada, check que se desenha, ring animando até o valor novo, cross-fade de tema via View Transitions; com `prefers-reduced-motion` tudo vira fade.

## Google Agenda, timer, streaks e PWA

As quatro partes "difíceis" do sistema seguem a mesma regra: o servidor é a fonte da verdade e o cliente só mostra e otimiza.

**Google Agenda (sincronização em duas mãos)**

- Login com Google pelo Supabase Auth pedindo o escopo `calendar.events` e `access_type=offline`; o refresh token vai pra `google_tokens` via Edge Function.
- **Exportar:** criar/mover um bloco de estudo chama a Edge Function `gcal-push`, que cria ou atualiza o evento numa agenda separada "Athenaeum" (não polui a agenda principal) e guarda `google_event_id` + `etag`.
- **Importar:** `gcal-pull` roda a cada 15 min (pg\_cron) e ao abrir o calendário, usando `syncToken` incremental; eventos externos entram como `source = google`, somente leitura.
- Conflito: se o evento mudou nos dois lados, ganha a edição mais recente pelo `updated`, e o app avisa num toast.

**Timer de foco**

- O tempo restante é sempre `planned_min − (agora − started_at)`; nunca um contador que decrementa. Assim aguenta aba em segundo plano, recarregar a página e trocar de dispositivo.
- Iniciar grava `focus_sessions` com `started_at`; pausar/encerrar grava `ended_at`. Sem rede, a sessão fica no IndexedDB e sobe depois.
- Fim da sessão: Notification API + som opcional; o service worker garante o aviso mesmo com a aba fechada (via notificação agendada quando suportado).

**Streaks e conquistas**

- `fn_current_streak` conta dias com minutos ≥ mínimo, no fuso do usuário, pulando o dia de descanso.
- Conquistas são regras em `jsonb` (`{"type":"streak","days":7}`, `{"type":"hours_total","value":100}`) checadas por um trigger após cada `focus_session` concluída.
- Desbloqueio dispara a animação do filete dourado no cliente via Supabase Realtime.

**PWA e offline**

- Manifest com ícone monograma, `display: standalone`, cor de tema por tema escolhido.
- Serwist faz cache do app shell; dados de hoje e da semana ficam no IndexedDB (Dexie).
- Fila de mutações offline (criar/concluir tarefa, sessões) reenviada em ordem ao voltar a rede.

## Estrutura de pastas e roadmap

O código se organiza por funcionalidade (cada módulo com seus componentes, ações e queries), e o build vai em 4 fases de cerca de 12 semanas no total, com o MVP em uso a partir da semana 5.

```text
athenaeum/
├─ app/                      # rotas (App Router)
│  ├─ (auth)/login/
│  ├─ (app)/layout.tsx       # sidebar + tema
│  ├─ (app)/page.tsx         # Dashboard
│  ├─ (app)/tarefas/  calendario/  metas/  foco/  ajustes/
│  └─ api/                   # route handlers (webhooks)
├─ features/                 # um módulo por funcionalidade
│  ├─ tasks/   (components, actions.ts, queries.ts, schema.ts)
│  ├─ focus/   calendar/   goals/   gamification/   settings/
├─ components/ui/            # Button, Card, Input… (do design system)
├─ lib/                      # supabase client, motion presets, datas
├─ styles/tokens.css         # os 3 temas em CSS variables
├─ supabase/
│  ├─ migrations/            # SQL versionado (tabelas, RLS, views)
│  ├─ functions/gcal-push/   gcal-pull/
│  └─ seed.sql               # trilhas e metas iniciais
└─ tests/  (unit, e2e, a11y)
```

&#91;embedded content: roadmap · 4 fases, 2 portões\]

Cada portão é um critério de uso real, não de código: só começa a fase seguinte quando o app já está te ajudando a estudar.

## Riscos e decisões a revisitar

O maior risco não é técnico: é o projeto crescer e roubar o tempo dos estudos que ele deveria organizar. Por isso o MVP é pequeno e já usável na semana 5.

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Escopo infla (calendário, gamificação, IA…) | Alto: atrasa o uso real | Usar o app a partir do MVP; só entra feature que você sentiu falta usando |
| Sincronização com Google dá conflito/duplicata | Médio | Agenda separada "Athenaeum", `etag` + `syncToken`, fase 2 só depois do MVP estável |
| Offline com fila de mutações gera inconsistência | Médio | Começar com offline só leitura + timer; fila de escrita na fase 3 |
| Animações pesadas no celular | Médio | Só `transform`/`opacity`, `LazyMotion`, medir INP no Vercel Analytics |
| Verificação do app pelo Google se virar público | Baixo agora | Enquanto for só você, o app fica em modo de teste no Google Cloud |

**Revisitar quando…**

- **Virar multiusuário/SaaS:** RLS já está pronto; faltam onboarding, planos e limites por usuário.
- **Os dados crescerem:** mover agregações pesadas pra materialized views atualizadas pelo pg\_cron.
- **Quiser IA:** um "planejador da semana" que distribui tarefas nos horários livres (encaixa direto no card de sugestão do Calendário).

**Próximos passos**

- [ ] Escolher o nome definitivo (opções: Athenaeum, Alma Mater, Ex Libris, Codex, Scriptorium)
- [ ] Criar o repositório e o projeto no Supabase
- [ ] Rodar a Fase 0 do roadmap
