# ADR-001: Next.js + Supabase (em vez de Next.js + FastAPI ou outras alternativas)

**Status:** Proposed
**Date:** 2026-10-07
**Deciders:** Renan

## Context

O Athenas é um PWA pessoal (1 usuário hoje, multiusuário possível depois) com tarefas, sessões de foco, metas, calendário e integração com o Google Agenda. As forças em jogo:

- **Você está sozinho** e o maior risco do projeto é ele roubar tempo dos estudos (system-design, "Riscos"). Cada servidor/serviço a mais para manter é tempo perdido.
- **Custo R$ 0/mês** no começo.
- **UX fluida:** LCP < 1,5 s no celular, INP < 100 ms, update otimista, offline parcial.
- **Portfólio de dados:** SQL/Postgres de verdade (views, window functions, RLS, migrations) pesa mais do que "mais um CRUD em ORM".
- **Multiusuário no futuro** sem reescrever a camada de segurança.
- Moram em **Windows 11 Home** (Supabase local exige Docker Desktop + WSL2).

## Decision

Usar **Next.js (App Router) + TypeScript** no front/edge de renderização, deployado na **Vercel**, e **Supabase** como backend: Postgres, Auth (Google), RLS, Realtime, Edge Functions e pg_cron.

Regras de uso que tornam a decisão segura (são parte da decisão):

1. **A segurança mora no banco, não no código de aplicação.** Toda tabela com RLS (ver ADR-002). O navegador fala direto com o Supabase via `supabase-js`; a chave `anon` pode ser pública *porque* a RLS protege.
2. **Um só caminho de escrita para dados do usuário:** `supabase-js` no cliente (via TanStack Query, com update otimista). Server Actions ficam reservadas ao que precisa de segredo ou de sessão no servidor. Isso evita o problema das "duas portas" (uma validada pelo Zod no servidor, outra não).
3. **Validação em duas camadas:** Zod nos formulários (feedback rápido) + `CHECK`/`NOT NULL`/FKs no Postgres (garantia real). O Postgres é o "juiz final".
4. **Lógica que precisa de atomicidade** (ex.: concluir tarefa + atualizar algo) vira função SQL (`rpc`), não duas chamadas do cliente.
5. **Segredos (token do Google) só em Edge Functions** com `service_role`.
6. **Região:** projeto Supabase em **São Paulo (sa-east-1)** e funções da Vercel na região `gru1`, para que Vercel ↔ Supabase não cruzem oceano (importa para o LCP).
7. **Auth no Next:** usar `@supabase/ssr` (sessão em cookie, renovada por middleware/proxy do Next — confirmar o nome do arquivo na versão instalada). Nunca confiar em `getSession()` no servidor para autorização; usar `getUser()`/claims verificadas.

## Options Considered

### Option A: Next.js + Supabase (escolhida)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Baixa-média: 2 plataformas gerenciadas, zero servidor próprio |
| Custo | R$ 0 (Vercel Hobby + Supabase Free) |
| Escalabilidade | Sobra para 1 usuário e para centenas; Postgres escala verticalmente |
| Familiaridade | Média (App Router e RLS são curva de aprendizado) |

**Prós:** SQL real (ótimo para portfólio de dados); Auth Google pronta; RLS = segurança multiusuário "de graça"; Realtime; menos código; migrations versionadas (`supabase/migrations`).
**Contras:** lock-in leve (mitigado: é Postgres padrão + SQL versionado, dá para migrar); RLS mal escrita vaza dados (mitigado no ADR-002 com testes); free tier do Supabase **pausa o projeto após 7 dias sem atividade** e **não tem backup point-in-time**; Vercel Hobby é só para uso não comercial.

### Option B: Next.js + FastAPI + Postgres (próprio ou Neon/Railway)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Alta: dois deploys, CORS, auth própria (JWT/refresh), migrações (Alembic), OpenAPI → tipos |
| Custo | R$ 0–25/mês (hosting do Python quase nunca é grátis de verdade; cold starts) |
| Escalabilidade | Excelente, total controle |
| Familiaridade | Alta se você já conhece Python |

**Prós:** Python é a língua dos dados (pandas, dbt-adjacent), controle total, bom para treinar backend.
**Contras:** você reconstrói o que o Supabase já dá (auth, realtime, RLS, cron); mais superfície de ataque; mais coisas para quebrar sozinho; cold start prejudica o INP/LCP; o ganho de aprendizado está em "construir auth", que não é o que você quer treinar.

### Option C: Next.js + Prisma/Drizzle + Postgres gerenciado (Neon) + Auth.js

**Prós:** controle de acesso em TypeScript, Postgres puro, deploy simples.
**Contras:** sem RLS por padrão (autorização vira `where userId = ...` em todo lugar — um esquecimento vaza dados); você monta Auth, Realtime e cron por conta própria; menos "SQL de verdade" (o ORM esconde).

### Option D: Firebase / PocketBase

**Prós:** mais simples ainda (Firebase) ou auto-hospedável (PocketBase).
**Contras:** NoSQL/SQLite — foge do objetivo de treinar Postgres e SQL analítico; Firestore é ruim para agregações (streak, heatmap).

## Trade-off Analysis

A pergunta de fundo é **"onde eu quero gastar minha energia?"**. A Option B/C gasta energia em infraestrutura e auth (valor baixo para o seu objetivo); a Option A gasta energia em **modelagem SQL, RLS e views** (valor alto para BI → Analytics Engineer). Trocamos controle total por velocidade e por um banco que você vai usar de verdade na entrevista.

O preço do lock-in é pequeno porque o contrato com o banco é SQL versionado em Git: se um dia sair do Supabase, `pg_dump` + migrations levam tudo.

**Questionamento honesto da stack (você pediu para só questionar se for problema real).** Dois pontos merecem atenção, não troca de stack:

- **Recharts** é pesado para gráficos que o design resolve com barras CSS, anéis SVG e uma grade de divs (Dashboard e Metas). Recomendo SVG/CSS próprio e só adotar biblioteca se surgir gráfico que o design não cobre.
- **FullCalendar** briga com o design (blocos tracejados do Google, snap de 15 min, linha do "agora", mover com Alt+↑/↓). Decidir só na Fase 2; minha tendência é grade própria.

## Consequences

- **Fica mais fácil:** segurança multiusuário, auth Google, tempo real, agregações em SQL, deploy por PR (preview).
- **Fica mais difícil:** depurar RLS (erro silencioso: query volta vazia); testar o banco (precisa de Supabase local + testes SQL — veja plano da Fase 0); lidar com limites do free tier.
- **A revisitar:** quando virar SaaS → Vercel Pro (Hobby proíbe uso comercial) e Supabase Pro; pausa por inatividade e backups (ver Action Items).

## Action Items

1. [ ] Criar o projeto Supabase na região São Paulo; definir região das funções Vercel (`gru1`).
2. [ ] Configurar **backup semanal** (`pg_dump` num GitHub Action agendado, guardado como artefato privado) já que o free tier não tem PITR.
3. [ ] Colocar um "heartbeat" simples (o próprio uso diário ou um cron leve) para o projeto não pausar quando você viajar.
4. [ ] **Fechar o cadastro:** desativar signups no Supabase Auth (ou allowlist do seu e-mail) enquanto for só você — sem isso, qualquer conta Google cria dados no seu projeto.
5. [ ] Manter o repositório **fora do OneDrive** (ex.: `C:\dev\athenas`): OneDrive sincroniza `node_modules`/`.next` e corrompe/atrasa builds.

---

## Emenda 1 (2026-10-07) — multiusuário e social desde o início

O escopo passou a incluir várias pessoas, grupos de estudo e grupos públicos (**ADR-006**). A decisão de stack **se mantém** (e fica mais forte: RLS e Realtime são justamente o que um app social precisa). O que muda:

1. **Cadastro:** o Action Item 4 ("fechar cadastro") vira **beta fechado por convite/lista de espera** nas Fases 0–2, e **cadastro aberto com proteções** (CAPTCHA, confirmação de e-mail, limite de taxa) quando os grupos abrirem (Fase 3).
2. **Planos gratuitos têm teto:** Supabase Free (conexões Realtime, banco, e-mail de auth limitado, projeto pausa) e **Vercel Hobby não permite uso comercial**. Definir *gatilhos de upgrade* (ex.: > 50 usuários ativos, uso do Realtime, qualquer monetização) e orçar Supabase Pro + Vercel Pro.
3. **Tecnologias adicionais aprovadas (livres para evoluir):**
   - **`motion`** (Framer Motion) com `LazyMotion` + View Transitions para o acabamento "luxuoso"; `cmdk` (command palette), `vaul` (sheets no mobile), `sonner` (toasts), `@dnd-kit` (arrastar), `TanStack Virtual` (listas longas).
   - **`next-intl`** (pt-BR padrão, pronto para outros idiomas — relevante em app multiusuário).
   - **Cloudflare Turnstile** (CAPTCHA), **Resend** (e-mail), **Upstash Redis** ou regras do Vercel Firewall (rate limit na borda).
   - **Storybook** para o design system (também vira vitrine de portfólio).
   - Postgres: `citext`, `pg_trgm`, `pg_cron`, `pgmq` (fila para jobs de sync por usuário) e, **se necessário depois**, `pgvector`.
4. **Observabilidade passa a ser requisito**, não luxo: Sentry + logs das Edge Functions + Web Vitals reais.
