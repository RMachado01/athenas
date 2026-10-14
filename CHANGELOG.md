# Changelog

## Em desenvolvimento

- Flashcards com repetição espaçada (FSRS): baralhos ligados a trilhas, cartões feitos à mão ou escritos nas notas como `pergunta :: resposta`, revisão com 4 botões que mostram o próximo intervalo, Desfazer, resumo no fim, card "Revisar hoje" no Início e tempo de revisão contando no Foco.
- Pesquisa de produto, auditoria de design e roadmap em `docs/`.

## v0.1.0 — Fundação (2026-10-07)

Primeira versão no ar: nenhuma funcionalidade de estudo ainda, mas toda a base.

- Next 16.4 + React 19 + Tailwind 4, TypeScript estrito, pnpm, versões fixas.
- Tokens do design system gerados de `tokens.json`; 3 temas + automático; teste de contraste WCAG 2.2 AA.
- Tema aplicado antes da primeira pintura (sem flash); fontes self-hosted.
- Banco (Supabase, São Paulo): `profiles` (privado), `public_profiles`, `tracks`; RLS forçada; visitante sem acesso.
- Login com Google (só identidade), sessão por `proxy.ts`, rotas protegidas por padrão.
- Testes: unidade, banco (PGlite), E2E e acessibilidade (Playwright + axe).
- CI no GitHub Actions; deploy na Vercel (gru1); backup semanal criptografado (workflow).

## v0.2.0 — Tarefas e visual mobile (2026-10-07)

- Tarefas: adicionar rápido em linguagem natural, grupos por prazo, subtarefas, detalhes e trilhas.
- Início: resumo do dia, anel de progresso, constância da semana e progresso por trilha.
- Design "Cristal" mobile-first: vidro, nebulosa, barra inferior flutuante, folhas inferiores.
- Novos temas Preto e Branco e Amber (7 no total).
- Testes e2e e de acessibilidade em viewport de celular.
