# Athenas

Rede social de estudos: tarefas, foco (Pomodoro), metas, calendário, grupos de estudo
e três temas visuais de estética _old money_. PWA multiusuário.

> Status: **Fase 0 — Fundação**. Login, banco com RLS, temas e CI prontos; sem funcionalidades de estudo ainda.

## Rodar localmente

```bash
pnpm install
cp .env.example .env.local   # preencha com a URL e a chave publishable do Supabase
pnpm dev                     # http://localhost:3000
```

Verificações: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`, `pnpm tokens:check`.

## Documentação

- [`docs/system-design.md`](docs/system-design.md) — requisitos, stack, arquitetura, modelo de dados
- [`docs/adr/`](docs/adr/) — decisões de arquitetura (ADR-001 a ADR-006)
- [`docs/revisao-e-plano-fase-0.md`](docs/revisao-e-plano-fase-0.md) — revisão e plano da Fase 0
- [`docs/pesquisa-paralela-2026-10-07.md`](docs/pesquisa-paralela-2026-10-07.md) — pesquisa de apoio
- [`docs/design-system/`](docs/design-system/) e [`docs/telas/`](docs/telas/) — design system e mockups

## Convenções

- Commits pequenos, em português, no formato _Conventional Commits_ (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`).
- Comentários no código em português, didáticos.
- Segredos nunca entram no Git (use `.env.local`; veja `.env.example`).
