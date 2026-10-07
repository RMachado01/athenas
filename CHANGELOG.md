# Changelog

## v0.1.0 — Fundação (2026-10-07)

Primeira versão no ar: nenhuma funcionalidade de estudo ainda, mas toda a base.

- Next 16.4 + React 19 + Tailwind 4, TypeScript estrito, pnpm, versões fixas.
- Tokens do design system gerados de `tokens.json`; 3 temas + automático; teste de contraste WCAG 2.2 AA.
- Tema aplicado antes da primeira pintura (sem flash); fontes self-hosted.
- Banco (Supabase, São Paulo): `profiles` (privado), `public_profiles`, `tracks`; RLS forçada; visitante sem acesso.
- Login com Google (só identidade), sessão por `proxy.ts`, rotas protegidas por padrão.
- Testes: unidade, banco (PGlite), E2E e acessibilidade (Playwright + axe).
- CI no GitHub Actions; deploy na Vercel (gru1); backup semanal criptografado (workflow).
