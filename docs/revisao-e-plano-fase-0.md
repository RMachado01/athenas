# Athenas — Revisão do design e plano da Fase 0

7 de outubro de 2026 · Status: **v2 — decisões confirmadas, aguardando OK final do plano** (nenhum código de aplicação foi escrito)

Parte 0: decisões confirmadas e o que mudou com o escopo multiusuário/social.
Parte 1: pontos de atenção encontrados entre system design, design system e telas.
Parte 2: plano da Fase 0 (Fundação) em passos pequenos e verificáveis.
Parte 3: roadmap reavaliado com grupos de estudo.

Legenda de severidade: 🔴 resolver antes de codar a área afetada · 🟡 resolver durante a fase certa · 🟢 polimento.

---

## Parte 0 — Decisões confirmadas e mudança de escopo

| # | Decisão |
|---|---|
| Q1 | Nome: **Athenas** (slug `athenas`). Ver nota de nome abaixo. |
| Q2 | Código em `C:\dev\athenas` (fora do OneDrive). |
| Q3 | **pnpm**. |
| Q4 | Progresso simples: trilhas = tarefas concluídas ÷ total; metas `count` = tarefas ligadas, com contador manual opcional. |
| Q5 | Aplicar correção de tokens (B1/B2). Diretriz do produto: **luxuoso, customizável e agradável** → ADR-003, Emenda 1. |
| Q6 | **Tailwind v4**. |
| Q7 | **Recomendação minha: login entra na Fase 0** (passos 9–10). Motivo: o produto agora é multiusuário; login + RLS + isolamento entre usuários é a espinha dorsal e é o que prova que a fundação funciona de ponta a ponta. Adiar só empurraria o risco. Cadastro **fechado por convite** durante as Fases 0–2. |

**Mudança de escopo (multiusuário + grupos de estudo públicos/privados + troca de ideias):** é a maior mudança até agora. Efeitos, todos já registrados:

- Nova **ADR-006** (grupos e camada social) e **emendas** nas ADRs 001, 002, 003 e 005.
- `profiles` privado + `public_profiles` desde a Fase 0.
- Privacidade por construção: o mundo pessoal nunca é lido por grupos; só **agregados consentidos** (`share_level`, padrão `none`).
- Novos pré-requisitos antes de abrir grupos ao público: termos, privacidade, denúncia/bloqueio, exclusão/exportação de dados (LGPD), CAPTCHA, limite de taxa.
- O social **não** entra antes do portão da Fase 1 (usar o app pessoal de verdade). Um app social vazio é pior que um app pessoal excelente.
- Faltam **telas sociais** no design system (Grupos, Descobrir, Página do grupo, Mural, Convites, Perfil público, Denunciar). Sugiro desenhá-las em paralelo à Fase 1, com o mesmo cuidado dos 3 temas.

**Nota sobre o nome "Athenas".** Pesquisei rapidamente: não achei app de estudo chamado exatamente "Athenas", mas há **nomes muito próximos no mesmo nicho**: *Athenify* (study tracker + focus timer, com streaks), *Athena AI* (assistente de estudos) e um app Android open source "Athena" (monitoramento de estudos). Não é bloqueio, mas antes de registrar domínio/marca: checar domínio `.com`/`.com.br`, **busca de marca no INPI** (classes de software/educação) e lojas de apps. O custo de renomear sobe a cada passo, então proponho essa checagem no Passo 0 (15 minutos).

**Tecnologias adicionais aprovadas** (detalhes na ADR-001, Emenda 1): `motion` (Framer Motion) + View Transitions, `cmdk`, `vaul`, `sonner`, `dnd-kit`, `next-intl`, Turnstile, Resend, rate limit na borda, Storybook, e no Postgres `pg_trgm`, `pgmq` e (depois) `pgvector`.

---

## Parte 1 — Pontos de atenção

### A. Inconsistências entre os documentos

| # | Sev. | O que encontrei | Onde | Sugestão |
|---|---|---|---|---|
| A1 | 🔴 | **Offline se contradiz:** NFR e seção PWA prometem marcar tarefas offline e fila de mutações; a seção de Riscos diz "só leitura + timer, fila na Fase 3". | system-design | Resolvido na **ADR-004**; editar o system-design. |
| A2 | 🔴 | **Timer não prevê pausa.** `restante = planned − (agora − started_at)` ignora pausas, mas a tela de Foco tem Pausar/Continuar. `focus_sessions` não tem onde guardar pausa. | system-design × Focus | `paused_at` + `paused_ms` (**ADR-002**). |
| A3 | 🔴 | **Pausa longa sem coluna:** FocusTimer fala "15 min a cada 4"; `profiles` só tem `pomodoro_focus_min` e `pomodoro_break_min`; `kind` só `focus\|break`. | FocusTimer × modelo | Adicionar `long_break_min`, `sessions_per_cycle`, `kind='long_break'`. |
| A4 | 🔴 | **Escopo do Google insuficiente** (`calendar.events` não cria a agenda "Athenas") e **modo de teste expira o refresh token em 7 dias**. | system-design (Google) | **ADR-005**. |
| A5 | 🔴 | **`google_tokens.sync_token` único**, mas o `syncToken` é por agenda (primária + Athenas). Sem estado de sync para o "sincronizada há 2 min" de Ajustes. | modelo × Settings | Tabelas `google_connections` / `google_calendars` (**ADR-005**). |
| A6 | 🔴 | **Seed:** "trilhas já nascem como template" (requisito) × `seed.sql` (só roda em `db reset` local). | requisitos × pastas | Trigger `handle_new_user` semeia por usuário; `seed.sql` só para dados de dev. |
| A7 | 🔴 | **Cadastro aberto:** Google OAuth habilitado = qualquer pessoa cria conta no seu projeto. | Auth | Desativar signups/allowlist (**ADR-001**). |
| A8 | 🟡 | **Fases × telas:** o Dashboard (MVP) mostra *Sequência* (Fase 3), *Meta do trimestre* e *Próximos blocos* (Fase 2). A Mobile tem Calendário e Metas na barra. | roadmap × Main/Mobile | Criar views/funções de streak e meta já na Fase 1 (é SQL barato); só a UI de conquistas/heatmap espera a Fase 3. Dashboard MVP mostra cards "vazios" bem desenhados para o que ainda não existe. |
| A9 | 🟡 | **Definição de "progresso" ausente:** "62%" por trilha (Dashboard), "31 de 50 exercícios" e "PL-300 48%" (Metas). Nada diz o que é contado. | Main/Goals × modelo | Regras na **ADR-002** (itens de metas e `v_track_progress`). Preciso da sua decisão (pergunta Q4). |
| A10 | 🟡 | **Metas recorrentes** ("15h por semana") sem modelo de recorrência. | Goals × `goals` | `recurring` + janela corrente calculada na view. |
| A11 | 🟡 | **Vocabulário de status de meta** difere: GoalCard diz "no ritmo / atrasada X dias / meta batida"; Metas mostra "Precisa de 1h50/dia" e "Começa em 9/10". | GoalCard × Goals | Unificar: `v_goal_progress` devolve `status` + `hint`. |
| A12 | 🟡 | **Conquistas fora do modelo:** "Foco profundo: 4 pomodoros sem pausa" (precisa de sequência de sessões) e "Primeiro projeto: publicar no GitHub" (evento externo) não cabem nas regras `streak`/`hours_total`; trigger "após cada sessão" não vê "Mês completo" (meta). | Goals × `achievements` | Tipos de regra extras (`pomodoros_in_row`, `goal_completed`) e marcação manual para eventos externos. |
| A13 | 🟡 | **"Todas as tabelas têm `user_id`"** é falso para `achievements` (global) e `profiles` (usa `id`). | modelo | Documentado na ADR-002. |
| A14 | 🟡 | **Nomes de trilha divergem:** system-design "Git + dbt"; Dashboard "Git + dbt"; Tarefas usa chips "Git" e "dbt" separados; Dashboard "Power BI e modelagem" × chip "Power BI". Rota `/ajustes` × nav "Personalização". | vários | Definir lista canônica (nome completo + monograma) e usar um só. |
| A15 | 🟡 | **Tela de Foco** tem "Som ambiente" e "notificações silenciadas até 15:05". Som ambiente não está em requisitos/modelo (áudio, licença, cache offline); um site não consegue "silenciar notificações" do aparelho — só as do app. | Focus | Cortar som ambiente do MVP; reescrever o texto ("Lembretes do app pausados"). |
| A16 | 🟡 | **Calendário já mostra IA** ("Sábado tem 4h livres. Encaixar?") enquanto o system-design põe IA como "quando quiser". | Calendar × riscos | Marcar o card como Fase 4 ou torná-lo regra simples (sem IA: horas livres × tarefas atrasadas). |
| A17 | 🟡 | **Notificação com app fechado** ("service worker garante... quando suportado") não é confiável. | system-design | MVP: só com app aberto; Web Push na Fase 3 (**ADR-004**). |
| A18 | 🟡 | **Tarefas com prazo sem hora** ("sex, 09/10") × `due_at timestamptz`. | Tasks × `tasks` | Prazo "dia inteiro" vs "com horário" — decidir (`due_on date` + `due_time`). |
| A19 | 🟢 | **Números do mockup:** 3h20 de 4h = 83%, mockup diz 82% (Dashboard e Mobile). Mockup de Tarefas "14 abertas" × "/14" do Dashboard (conceitos diferentes). | Main/Mobile | Ajustar números de exemplo para os cálculos fecharem (vão virar testes). |
| A20 | 🟢 | **Faltam telas/estados:** login, primeiro uso (onboarding + conectar Google), formulário de Nova meta, modal de Novo bloco, gestão de Trilhas (módulo MVP sem tela), command palette, estados vazios/erro/offline. | telas | Desenhar as de login, onboarding, Nova meta e offline antes da Fase 1. |
| A21 | 🟢 | **Navegação mobile não alcança "Personalização"** (4 abas + FAB, sem Ajustes). | Mobile | Avatar/menu no cabeçalho, ou "Mais". |
| A22 | 🟢 | **"Estudos de Renan"** e "Bom dia, Renan" estão fixos; saudação não muda por horário. | Nav/Main | Vir do `profiles.name`; saudação por faixa horária. |
| A23 | 🟢 | **Nome do produto indefinido** (checklist final: "Escolher o nome definitivo") e repositório, pacote, domínio, manifest dependem dele. | system-design | Decidir antes do `git init` (pergunta Q1). |

### B. Design system × implementação (acessibilidade e tokens)

Calculei os contrastes (WCAG 2.2) a partir de `tokens.json`. O resto passou com folga (ex.: `ink` ≥ 12:1; `accent` ≥ 6,6:1 nos escuros).

| # | Sev. | Achado | Medida | Correção proposta |
|---|---|---|---|---|
| B1 | 🔴 | `border-strong` (bordas de input/checkbox) abaixo de **3:1** sobre `surface` nos 3 temas — o README promete 3:1 (WCAG 1.4.11). | 2,83 / 2,76 / 2,81 | ponderosa `#5a8070` (3,38) · burgundy `#9a6470` (3,32) · camel `#9a8362` (3,37) |
| B2 | 🔴 | `accent` do **camel** sobre `bg` = **4,24:1** (<4,5) para texto/links dourados fora de cards (`a{color:accent}` nos mockups). | 4,24 | camel `accent` `#7f6228` (4,82 sobre bg; `on-accent` 5,4); `accent-hover` `#735624` continua mais escuro ✓ |
| B3 | 🟡 | `ink-muted` sobre `brand` no camel = 2,8:1. | 2,82 | Nunca usar texto secundário sobre chips `brand` (regra no README). |
| B4 | 🟡 | Trilha de barra/anel (`brand-soft` sobre `surface`) tem 1,4–1,9:1; **heatmap** nível 0–2 depende só de cor. | — | Valor sempre em texto (já há "62%") e heatmap com `title`/tabela acessível alternativa. |
| B5 | 🟡 | **Alvos de toque:** README: botão md = 40px; `theme.css` usa 44px. Checkbox: README 20px, CSS 22px, subtarefas nativas 18px (WCAG 2.2 exige ≥24px, ou espaçamento equivalente). | — | Botão md = 44px; checkbox visual 22px com **área de toque 44px**. |
| B6 | 🟡 | **Atalhos de tecla única** (`N`, `F`, `X`, espaço) precisam poder ser desativados/remapeados (WCAG 2.1.4) e ficar inativos em campos de texto. | — | Toggle em Ajustes; ignorar em `input/textarea`. |
| B7 | 🟡 | **Escala tipográfica:** "Cormorant só a partir de 28px", mas Metas usa 26px (GoalCard README diz 24px) e labels usam 10–11px, mono 11–12px (fora da escala). | — | Ajustar tokens (adicionar `display-md` 28px) e corrigir usos. |
| B8 | 🟡 | `prefers-reduced-motion`: três descrições diferentes ("tudo vira fade" / "fades, sem deslocamento" / CSS que remove tudo). | — | Padronizar: manter fade de opacidade ≤160ms, remover movimento/molas. |
| B9 | 🟡 | `data-theme` está num `div` nos mockups; Radix usa portais fora dele. `theme.css` sem `color-scheme`. "Automático" ambíguo (relógio × `prefers-color-scheme`). | — | **ADR-003.** |
| B10 | 🟢 | Três cópias dos tokens (`tokens.json`, `theme.css`, `tokens.css`). | — | Gerar CSS a partir do JSON (ADR-003). |

### C. Dados e arquitetura (resumo; detalhes nas ADRs)

- 🔴 **Views sem `security_invoker` vazam dados** entre usuários (ignoram RLS). **FKs compostas** `(user_id, x_id)` evitam referenciar linha de outro usuário. (ADR-002)
- 🔴 **Duas portas de escrita** (Server Actions *e* supabase-js direto): Zod "igual no cliente e servidor" não vale para o cliente direto. Escolhemos uma porta + CHECKs no banco. (ADR-001)
- 🟡 `focus_sessions.task_id` deve ser `ON DELETE SET NULL` com `track_id` copiado — senão apagar tarefa apaga horas estudadas. Falta `source = manual` para estudo sem timer. (ADR-002)
- 🟡 `fn_current_streak(user_id)` com parâmetro de usuário + `security definer` é brecha; usar `auth.uid()`. (ADR-002)
- 🟡 **Free tier:** projeto Supabase **pausa após 7 dias** sem atividade e **não tem backup PITR**; Vercel Hobby **proíbe uso comercial**. (ADR-001)
- 🟡 **Recharts** e **FullCalendar** brigam com o design e o orçamento de performance; preferir SVG/CSS e grade própria. (ADR-001)
- 🟡 **Tailwind:** com v3 e `var(--hex)` puro, `bg-accent/50` não funciona. Recomendo v4 (`@theme inline`). (ADR-003)
- 🟡 `manifest.json` é estático: não há `theme_color` por tema. (ADR-003)
- 🟢 `chrono-node` em pt-BR é parcial: planejar parser próprio para `#trilha`/`!prioridade` e testes do quick add.

### D. Ambiente (Windows + OneDrive)

- 🔴 **Não desenvolva dentro do OneDrive** (`Documentos\Estudos`): `node_modules` e `.next` (milhares de arquivos) são sincronizados e travam/corrompem. Use `C:\dev\athenas` e deixe a pasta `Estudos\docs` como cópia de leitura.
- 🟡 Supabase local exige **Docker Desktop + WSL2** (Windows 11 Home suporta). Pré-requisito do passo 8.
- 🟡 A pasta atual **não é repositório Git**; os commits pequenos começam no passo 1.

---

## Parte 2 — Plano da Fase 0 (Fundação)

**Objetivo da fase:** ter um esqueleto **vazio mas completo**, do `git push` ao site no ar: CI verde, 3 temas sem flash, banco com migrations versionadas e RLS testada, login protegido, deploy na Vercel. Nenhuma feature de estudo ainda.

**Portão de saída (critério de uso real, não de código):** você abre a URL de produção no celular, entra com o Google, vê o tema que escolheu sem piscar, e o CI bloqueia um PR que quebre contraste, RLS ou build.

**Regras de trabalho:** um PR curto por passo; *Conventional Commits* em português (`feat:`, `fix:`, `chore:`, `docs:`, `test:`); `main` protegida; comentários de código em português e didáticos; cada passo termina com uma **verificação** que você consegue rodar.

> Estimativa: ~5–8 sessões curtas. Cada passo abaixo é pequeno o bastante para revisar em ~15 min.

### Passo 0 — Decisões e pré-requisitos (sem código)
- Decisões já tomadas (Parte 0). Falta só a **checagem rápida do nome "Athenas"**: domínio, INPI, lojas de apps.
- Instalar/conferir: Git, Node LTS, pnpm, Docker Desktop (WSL2), Supabase CLI, GitHub CLI; contas GitHub, Vercel, Supabase, Google Cloud.
- **Verifica:** `git --version`, `node -v`, `pnpm -v`, `docker version`, `supabase --version`, `gh --version` respondem.

### Passo 1 — Repositório
- Criar `C:\dev\athenas` (fora do OneDrive), `git init`, `.gitignore`, `.editorconfig`, `README` curto, copiar `docs/` (incl. ADRs).
- **Commit:** `chore: inicia repositório com docs, ADRs e design system`
- **Verifica:** `git log --oneline` mostra 1 commit; `docs/adr/` presente.

### Passo 2 — Esqueleto Next.js
- `create-next-app` (App Router, TypeScript, ESLint, Tailwind, sem `src/`, alias `@/`), versões **fixadas** na versão estável atual.
- **Commit:** `feat: cria esqueleto Next.js com TypeScript e Tailwind`
- **Verifica:** `pnpm dev` abre a página; `pnpm build` termina sem erro.

### Passo 3 — Qualidade de código
- TypeScript `strict` + `noUncheckedIndexedAccess`; Prettier; regras de ESLint; Vitest; scripts `lint`, `typecheck`, `test`, `format:check`.
- **Commit:** `chore: configura lint, formatação, typecheck e Vitest`
- **Verifica:** `pnpm lint && pnpm typecheck && pnpm test` passam (1 teste de exemplo).

### Passo 4 — Estrutura de pastas
- Criar a árvore do system-design (`app/(auth)/login`, `app/(app)/…`, `features/*`, `components/ui`, `lib`, `styles`, `supabase`, `tests/{unit,e2e,a11y}`) com um `README.md` curto em cada pasta explicando a regra daquela camada (ex.: "`features/` não importa de outra feature").
- **Commit:** `chore: cria estrutura de pastas por funcionalidade`
- **Verifica:** `tree` bate com o desenho; build continua verde.

### Passo 5 — Tokens e contraste (a decisão do ADR-003)
- Script `scripts/build-tokens.ts`: `docs/design-system/tokens.json` → `styles/tokens.css` (3 temas + `color-scheme`) + `@theme inline` do Tailwind v4.
- Teste de contraste: percorre pares obrigatórios (tabela B) e falha se < 4,5:1 (texto) ou < 3:1 (bordas/ícones). **Primeiro roda vermelho** (B1 e B2 reprovam) → aplicamos as correções aprovadas em `tokens.json` → fica verde.
- **Commits:** `test: adiciona verificação de contraste dos tokens` → `fix: corrige border-strong e accent do camel para atingir contraste` → `feat: gera tokens CSS e Tailwind a partir de tokens.json`
- **Verifica:** `pnpm tokens:check` falha se `tokens.css` estiver desatualizado; `pnpm test` cobre os contrastes.

### Passo 6 — Tema sem flash
- `layout.tsx`: fontes via `next/font`, `cookies()` → `<html data-theme>`, script inline mínimo, `auto` por CSS; página `/dev/temas` (só em desenvolvimento) com amostras de tokens e um seletor provisório.
- **Commit:** `feat: aplica tema no servidor com cookie, sem flash`
- **Verifica:** recarregar (Ctrl+Shift+R) nos 3 temas e no auto não mostra tema errado; Lighthouse sem CLS de fonte.

### Passo 7 — Playwright + acessibilidade
- Playwright (Chromium) + `@axe-core/playwright`; testes: tema correto no primeiro paint (3 temas + auto com `colorScheme` emulado), zero violações axe em `/dev/temas`.
- **Commit:** `test: adiciona e2e de tema sem flash e verificação axe`
- **Verifica:** `pnpm e2e` verde local.

### Passo 8 — Supabase local e primeira migration
- `supabase init`; `config.toml` (cadastro **controlado**: sem signup livre; convites/allowlist no beta); migration `0001` (extensões, `profiles` **privado** + `public_profiles` (handle, nome, avatar), RLS, trigger `handle_new_user` que cria os dois e semeia trilhas-template em `tracks`); testes **pgTAP** (`supabase/tests`): usuário A não vê perfil privado/trilhas do B; `public_profiles` é legível por autenticados mas só editável pelo dono; trigger cria perfil.
- **Commits:** `feat(db): cria profiles, public_profiles e tracks com RLS` · `test(db): garante isolamento entre usuários com pgTAP`
- **Verifica:** `supabase start` → `supabase db reset` → `supabase test db` verdes; `supabase db lint` sem erro.
- *Escopo propositalmente mínimo:* as demais tabelas (tasks, goals, focus_sessions, study_blocks, views) entram na **Fase 1** pelo mesmo caminho.

### Passo 9 — Cliente Supabase e login Google (só identidade, multiusuário)
- `@supabase/ssr` (cliente browser/servidor + proxy/middleware de sessão), `.env.example`, `/login` mínimo, rota `(app)` protegida mostrando "Olá, {nome}" via `profiles`; teste E2E com **dois usuários** provando que um não vê dados do outro; `supabase gen types` em `lib/database.types.ts`.
- **Commit:** `feat: login com Google e rota protegida`
- **Verifica:** local (provider desabilitado → usa e-mail de teste) e depois na nuvem no passo 10; `getUser()` no servidor; rota protegida redireciona.

### Passo 10 — Supabase na nuvem
- Criar projeto (**São Paulo**), `supabase link`, `supabase db push` (as migrations sobem **só por arquivo**, nunca por clique no painel); configurar Google OAuth (identidade) e URLs de redirect; beta fechado: cadastro só por convite/allowlist (seu e-mail + convidados), confirmação de e-mail ligada; `.env` real só na Vercel/local (nunca no Git).
- **Commit:** `chore: configura projeto Supabase e variáveis de ambiente`
- **Verifica:** `supabase migration list` local = remoto; painel → Advisors (segurança) sem alertas de RLS.

### Passo 11 — CI no GitHub Actions
- `gh repo create` (privado), proteção da `main`; workflow com jobs em paralelo: **qualidade** (`lint`, `typecheck`, `test`, `tokens:check`), **banco** (`supabase start` + `db lint` + `test db`), **e2e/a11y** (Playwright), **build**, e a matriz de contraste **tema × acento** do ADR-003. Cache do pnpm.
- **Commit:** `ci: adiciona pipeline de qualidade, banco e e2e`
- **Verifica:** PR de teste fica verde; PR que quebra um contraste/RLS **fica vermelho**.

### Passo 12 — Primeiro deploy na Vercel
- Importar o repo; região `gru1`; variáveis de ambiente; Preview por PR; adicionar a URL de produção/preview aos redirects do Supabase.
- **Verifica:** URL de produção abre; login funciona no celular; tema persiste; Lighthouse mobile (meta: LCP < 1,5 s); Vercel Analytics ligado.

### Passo 13 — Rede de segurança do plano gratuito
- GitHub Action semanal de **backup** (`pg_dump` → artefato privado) e verificação simples de atividade (evita pausa em 7 dias).
- **Commit:** `ci: backup semanal do banco`
- **Verifica:** executar manualmente (`workflow_dispatch`) e restaurar o dump num Supabase local.

### Passo 14 — Fechamento
- Atualizar o system-design com as correções da Parte 1 (A1–A7 no mínimo); `CHANGELOG`/tag `v0.0.1-fundacao`; checklist do portão de saída.
- **Verifica:** portão de saída cumprido; ADRs passam de *Proposed* → *Accepted*.

---

## Parte 3 — Roadmap reavaliado (com grupos de estudo)

| Fase | Entrega | Portão de saída (uso real) |
|---|---|---|
| **0 — Fundação** | Repo, tokens e 3 temas sem flash, Supabase com migrations e RLS testada, login multiusuário, CI, deploy | Você entra pelo celular, tema certo, CI barra regressão |
| **1 — MVP pessoal** | Tarefas, trilhas, foco (Pomodoro + offline do timer), dashboard, streak (SQL) | **Você usa 2 semanas de verdade** |
| **2 — Planejamento** | Calendário, metas, Google Agenda (importar → exportar), personalização luxuosa (acento, densidade, fontes) | Calendário substitui o que você usava |
| **3 — Grupos (corte 1)** | Criar/entrar/sair, descoberta pública por tema/objetivo, papéis, convites, ranking consentido, mural com respostas, denúncia/bloqueio, notificações in-app, termos e LGPD | Um grupo real de 5+ pessoas usa por 2 semanas |
| **4 — Ao vivo e retenção** | Salas de estudo com timer compartilhado, chat, desafios coletivos, Web Push, conquistas sociais, fila de escrita offline | — |

**Aviso honesto:** social + personalização avançada + Google + offline é muito mais que as ~12 semanas do system-design. Com tempo parcial, espere **meses**, não semanas. Por isso os portões: cada fase deve ser *útil sozinha*. Se o tempo apertar, a ordem de corte é: fila offline → chat ao vivo → ranking → busca semântica. **Nunca** cortar teste de RLS nem termos/denúncia antes de abrir grupos públicos.

---

## Próximo passo

Se você aprovar este plano, eu começo pelo **Passo 0** (checagem do nome + conferência de ferramentas) e sigo **um passo por vez**, mostrando o resultado de cada verificação antes do próximo.
