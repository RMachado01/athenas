# Athenas

[![CI](https://github.com/RMachado01/athenas/actions/workflows/ci.yml/badge.svg)](https://github.com/RMachado01/athenas/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=white)

Rede social de estudos em PWA, mobile-first: organiza tarefas, foco, metas e
revisão num só lugar, com grupos de estudo e uma sala em pixel art com pets
que acompanham a rotina.

## Funcionalidades

- **Tarefas** com adição rápida em linguagem natural, subtarefas, trilhas com
  cor e quatro visões: lista, quadro (status, trilha ou prioridade, com
  arrastar), calendário do mês e mural de post-its.
- **Flashcards com repetição espaçada (FSRS):** baralhos ligados às trilhas,
  cartões escritos à mão ou direto nas notas (`pergunta :: resposta`), revisão
  com os próximos intervalos visíveis e desfazer.
- **Foco (Pomodoro), metas, notas, agenda** e um Início com resumo do dia,
  anel de progresso e constância da semana.
- **Sala em pixel art** com pets (adoção, acessórios, reações, brincadeiras e
  "estudar junto").
- **7 temas** com tokens gerados de um único `tokens.json` e contraste
  verificado (WCAG 2.2 AA), aplicados antes da primeira pintura.

## Arquitetura e qualidade

- **Next.js (App Router) + React 19 + TypeScript estrito**, organizado por
  funcionalidade em `features/`, com dependências em uma só direção.
- **Supabase (Postgres + Auth):** RLS forçada em todas as tabelas, perfil
  público separado do privado e login com Google só para identidade.
- **Testes:** unidade (Vitest), RLS do banco com PGlite, E2E e acessibilidade
  (Playwright + axe), inclusive em viewport de celular.
- **CI no GitHub Actions:** formatação, lint, tokens, tipos, testes e build a
  cada PR, além de backup semanal criptografado do banco.
- **Decisões registradas em ADRs** ([`docs/adr/`](docs/adr/)) e histórico de
  versões no [`CHANGELOG.md`](CHANGELOG.md).

## Rodar localmente

```bash
pnpm install
cp .env.example .env.local   # URL e chave publishable do Supabase
pnpm dev                     # http://localhost:3000
```

Verificações: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`,
`pnpm tokens:check`.

## Documentação

- [`docs/system-design.md`](docs/system-design.md) — requisitos, stack,
  arquitetura e modelo de dados
- [`docs/adr/`](docs/adr/) — decisões de arquitetura (ADR-001 a ADR-006)
- [`docs/roadmap.md`](docs/roadmap.md) — o que já foi feito e o que vem
- [`docs/design-system/`](docs/design-system/) e [`docs/telas/`](docs/telas/)
  — design system e mockups

## Convenções

- Commits pequenos, em português, no formato _Conventional Commits_ (`feat:`,
  `fix:`, `chore:`, `docs:`, `test:`, `ci:`).
- Comentários no código em português, didáticos.
- Segredos nunca entram no Git (use `.env.local`; veja `.env.example`).
