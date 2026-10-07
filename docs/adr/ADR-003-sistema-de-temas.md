# ADR-003: Sistema de temas — tokens em CSS variables + `data-theme`, sem flash do tema errado

**Status:** Accepted (2026-10-07, Fase 0)
**Date:** 2026-10-07
**Deciders:** Renan

## Context

São 3 temas (ponderosa, burgundy, camel) + opção "Automático", e o design system promete: *"nenhum componente conhece hex; trocar de tema é trocar `data-theme`"*. O risco técnico é o **flash do tema errado**: a página chega em ponderosa e, meio segundo depois, vira camel. Em tema escuro → claro isso é um clarão desagradável (e quebra a sensação *old money*).

Fatos relevantes que levantei lendo os arquivos:

- `tokens.json` e `docs/telas/theme.css` são **duas fontes** dos mesmos valores (e `styles/tokens.css` seria a terceira). Vão divergir.
- Nos mockups, `data-theme` está num `<div class="app">`, mas o README manda colocar no `<html>`. **Portais do Radix** (modais, popovers, command palette) renderizam fora de `.app` — com o atributo num div, eles perderiam o tema.
- "Automático" é descrito de dois jeitos: *"segue `prefers-color-scheme`"* (README/ThemeSwitcher) e *"Camel de dia, Ponderosa à noite"* (Ajustes). São comportamentos diferentes (preferência do SO ≠ hora do relógio).
- Tailwind v4 (CSS-first) mapeia tokens com `@theme inline`; com Tailwind v3 e `var(--hex)` puro, **modificadores de opacidade (`bg-accent/50`) não funcionam**.
- `theme.css` não define `color-scheme`, então `<select>`, scrollbars e checkbox nativos (usados em Ajustes/Tarefas) ficam claros em tema escuro.
- O manifest PWA é **estático**: não dá para ter `theme_color` por tema (o system-design promete isso).

## Decision

1. **Fonte única de verdade: `tokens.json`.** Um script (`scripts/build-tokens`) gera `styles/tokens.css` (os 3 temas) e a configuração do Tailwind. O CI falha se o arquivo gerado estiver desatualizado. (Evita drift e rende um bom mini-pipeline de dados para o portfólio.)
2. **Atributo no `<html>`**, nunca em div interno: `<html data-theme="ponderosa" lang="pt-BR">`. Assim portais e `body` herdam.
3. **Tokens semânticos em CSS variables** (`--bg`, `--surface`, `--ink`, `--accent`…). **Tailwind v4** com `@theme inline { --color-surface: var(--surface); … }`; componentes só usam classes semânticas (`bg-surface text-ink`), nunca hex. Tokens não cromáticos (espaço, raio, duração, easing) entram no mesmo `@theme`.
4. **Cada tema declara `color-scheme`** (`dark` para ponderosa/burgundy, `light` para camel) para controles nativos.
5. **Sem flash — três camadas:**
   - **Servidor:** o tema escolhido vive num **cookie** (`theme=ponderosa|burgundy|camel|auto`, `SameSite=Lax`, 1 ano). O `layout.tsx` raiz lê `cookies()` e renderiza `<html data-theme>` já correto. (`profiles.theme` é a cópia durável para outros dispositivos; no login o cookie é reconciliado com o banco.)
   - **"Automático" resolvido só com CSS**, sem JS: `html[data-theme="auto"]` define as variáveis do Camel e, dentro de `@media (prefers-color-scheme: dark)`, as do Ponderosa. O navegador resolve antes de pintar — zero flash e sem depender do servidor conhecer a preferência do SO.
   - **Script inline bloqueante mínimo** no `<head>` (≈10 linhas) como rede de segurança para HTML servido do cache do service worker (o app shell pode ter sido cacheado com outro tema): lê o cookie e corrige `data-theme` antes da primeira pintura.
6. **Troca em runtime:** `document.startViewTransition()` faz o cross-fade (`duration-slow`, `ease-in-out`); sem suporte, as `transition` de cor do CSS cobrem. Ordem: atualiza cookie → muda atributo → (assíncrono) grava `profiles.theme` com otimismo.
7. **"Automático" = `prefers-color-scheme`** (Camel claro / Ponderosa escuro), **não** horário do relógio. Ajustar o texto da tela de Ajustes ("segue o modo claro/escuro do seu aparelho").
8. **`<meta name="theme-color">`** muda dinamicamente com o tema (com `media` para o auto); o `theme_color` do manifest fica fixo em Ponderosa (limitação da plataforma).
9. **Fontes** via `next/font` (self-host, `display: swap` com métricas ajustadas) — nada de `<link>` do Google Fonts.
10. **Persistência de preferência de movimento** igual: cookie/atributo `data-motion="reduced"` (do toggle "Animações completas") lido no servidor; `prefers-reduced-motion` do SO é o padrão.

## Options Considered

### Option A: CSS variables + `data-theme` no `<html>` + cookie lido no servidor (escolhida)

| Dimensão | Avaliação |
|---|---|
| Complexidade | Baixa-média |
| Custo | Zero |
| Escalabilidade | Novo tema = novo bloco de variáveis |
| Familiaridade | Alta |

**Prós:** sem flash; zero JS no caminho crítico (exceto 10 linhas); troca instantânea; funciona com Radix portals; acessível.
**Contras:** ler `cookies()` torna o layout dinâmico (não estático) — aceitável: o app é autenticado e já dinâmico; o shell offline é tratado pelo script de segurança.

### Option B: `next-themes` (biblioteca pronta)

**Prós:** resolve flash com script próprio, popular.
**Contras:** só `localStorage` (servidor não sabe o tema → primeiro HTML sempre "genérico"), `suppressHydrationWarning`, menos controle com 3 temas + auto + banco; você aprende menos.

### Option C: Classes Tailwind `dark:`/variantes por tema

**Prós:** familiar.
**Contras:** cada componente conhece cada tema (viola "nenhum componente conhece hex"); 3 temas explodem as variantes.

### Option D: Tema só em `localStorage` aplicado no cliente

**Contras:** flash garantido; descartada.

## Trade-off Analysis

O flash vem do **descompasso** entre "quem decide o tema" (cliente) e "quem pinta o primeiro HTML" (servidor). A solução é colocar a decisão onde o primeiro HTML nasce (cookie no servidor) e deixar o CSS resolver o que o servidor não sabe (o "Automático"). O script inline fica como cinto de segurança porque o service worker pode servir HTML antigo. Abrimos mão de página 100% estática, que de qualquer forma não existe num app logado.

## Consequences

- **Mais fácil:** adicionar tema; auditar contraste por tema (um script percorre `tokens.json`); componentes simples.
- **Mais difícil:** manter cookie ↔ `profiles.theme` coerentes; testar "sem flash" (Playwright: tirar screenshot no primeiro paint com `data-theme` esperado).
- **Contraste — corrigir antes de implementar** (calculei com WCAG 2.2; detalhes em `revisao-e-plano-fase-0.md`):
  - `border-strong` dá **2,8:1** sobre `surface` nos 3 temas (README promete 3:1; exigência WCAG 1.4.11 para bordas de input/checkbox). Clarear/escurecer o token.
  - `accent` (camel) sobre `bg` dá **4,24:1** (<4,5) — afeta links/texto dourado fora de cards.
  - `brand-soft` como *trilha* de barra/anel tem 1,4–1,9:1 sobre `surface` (marca onde falta); aceitável como decoração, mas o *valor* precisa ser comunicado por texto (já é: "62%").
  - `ink-muted` sobre `brand` no camel dá 2,8:1 — não usar texto secundário sobre chips `brand`.
- **Revisitar:** novo tema (ex.: alto contraste) e `prefers-contrast`.

## Action Items

1. [ ] Script `build-tokens` (`tokens.json` → `styles/tokens.css` + `@theme`) e checagem no CI.
2. [ ] Script de contraste automatizado (falha o CI se algum par de tokens obrigatório <4,5:1 ou <3:1).
3. [ ] `layout.tsx` com cookie, `data-theme` no `<html>`, script inline mínimo e `color-scheme` por tema.
4. [ ] Teste Playwright "sem flash" para os 3 temas + auto (com `colorScheme` emulado).
5. [ ] Ajustar o texto do "Automático" na tela Ajustes e decidir `theme-color` dinâmico.

---

## Emenda 1 (2026-10-07) — personalização luxuosa e por usuário

Requisito novo: o aplicativo deve ser **luxuoso, customizável pelo usuário e visualmente agradável**. Isso estende (não substitui) as decisões acima.

**Princípio: personalização com trilhos.** Luxo vem de **curadoria**, não de liberdade total. Um seletor de cor livre produz combinações feias e contraste ruim. Então:

1. **Camadas de personalização** (todas guardadas em `profiles.appearance jsonb`, espelhadas em cookie para o servidor renderizar sem flash):
   - **Tema base:** ponderosa · burgundy · camel · automático (já decidido) — e espaço para temas novos (ex.: *Midnight Navy*, *Ivory & Ink*).
   - **Acento:** paleta curada de 6–8 metais/tons (ouro, ouro rosé, prata, cobre, esmeralda, bordô…). Cada acento é **pré-validado** para cada tema (script de contraste do CI testa tema × acento).
   - **Densidade:** confortável · compacta (muda `space-*`).
   - **Tipografia:** 2–3 pares curados (ex.: Cormorant + Instrument Sans; Playfair + Inter; Fraunces + Instrument Sans), carregados sob demanda via `next/font`.
   - **Movimento:** completo · reduzido (e `prefers-reduced-motion`).
   - **Layout do Dashboard:** widgets que o usuário reordena/oculta (preferência por usuário, `dnd-kit`).
2. **Implementação:** atributos `data-theme`, `data-accent`, `data-density`, `data-font` no `<html>`; cada um redefine apenas as variáveis do seu domínio (`--accent*`, `--space-*`, `--font-display`). **Nenhum componente muda** — é a mesma regra de "componentes não conhecem valores".
3. **Acento personalizado (opcional, avançado):** se permitirmos cor própria, o app a **ajusta automaticamente** para atingir contraste (cálculo em OKLCH, mantendo matiz e variando luminosidade) e **recusa** valores que não passem.
4. **Pré-visualização ao vivo** em Ajustes (já no mockup) e persistência otimista (cookie → banco).
5. **Acabamento "luxo" (movimento com função):** `motion` com `LazyMotion`, molas definidas nos tokens, filete duplo dourado como ornamento único por tela, textura/ruído sutil opcional em superfícies (CSS, sem imagem pesada), hover com elevação mínima, skeleton elegante em vez de spinner, e **desempenho primeiro** (só `transform`/`opacity`; medir INP).
6. **Perfil público:** o usuário escolhe se mostra tema/acento no perfil (identidade visual como parte da personalidade, mas opcional).

**Efeito no CI:** o teste de contraste passa a cobrir a matriz **tema × acento × par de tokens**; falha o build se algum par obrigatório reprovar.

---

## Emenda 2 (2026-10-07) — leitura do cookie no `<head>`, não no servidor

Ao implementar (Fase 0, passo 6) a documentação do Next 16.4 mostrou que, com **Cache Components** (ligado por padrão), chamar `cookies()` no layout raiz **impede o pré-render** da rota. Isso também prenderia o *shell* offline do PWA a um único tema.

**Decisão revisada:** a decisão 5 acima (cookie lido no servidor) é **substituída** por:

1. O `<html>` sempre é renderizado com `data-theme="auto"` (estático, cacheável).
2. Um **script bloqueante mínimo no `<head>`** (`lib/tema.ts → scriptTemaInicial`) lê o cookie `athenas-theme` e troca o `data-theme` **antes da primeira pintura**. Só aceita valores da lista (`ponderosa | burgundy | camel | auto`); valor inválido é ignorado.
3. Sem cookie, o CSS `html[data-theme="auto"]` resolve pelo claro/escuro do aparelho, sem JavaScript.
4. Funciona igual para HTML servido do cache do service worker.
5. `aplicarTema()` grava o cookie, aplica o atributo (com View Transition, exceto se o usuário pediu menos movimento) e atualiza `<meta name="theme-color">`.

**Trade-offs:** o tema explícito depende de JavaScript (sem JS, cai no `auto` — aceitável); `suppressHydrationWarning` no `<html>`. **Vantagem:** a rota continua estática/cacheável e o app shell offline fica correto em qualquer tema.

**Verificação:** testes de unidade executam o script contra um `document` falso (cookie válido, inválido, malicioso, erro); o teste E2E "sem flash" com Playwright vem no passo 7.
