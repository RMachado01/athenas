# Auditoria de UI/UX — Athenas

**Data:** 2026-10-12 · **Origem:** agente designer com a skill ui-ux-pro-max (só leitura de código, sem screenshots) · **Status:** aprovada pelo Renan.

**Nota: 7,5/10.** Base sólida (tokens, foco visível, reduced transparency, fallback sem blur, Radix, `data-motion`, alvos de 44 px quase sempre). Faltam: PWA de verdade, navegação, peso do vidro e um sistema de transições.

## Os 5 problemas principais

1. **Sem PWA:** não há `app/manifest.ts`, ícones, service worker nem tela offline.
2. **Bottom nav só com ícones** (`navegacao.tsx:75,89`, rótulos `sr-only`); Notas/Murais/Personalização escondidos no menu do avatar (`inicio-view.tsx:112-138`).
3. **Blur demais:** `.cartao` com `backdrop-filter: blur(18px)` em cada linha (`globals.css:98`) → jank e bateria em Android médio.
4. **Sem animação** de folha, menu e troca de rota (`folha-inferior.tsx:118-121`).
5. **Toast sobre a nav** (`providers.tsx:44`, `bottom-right` sem offset).

## Achados

**Acessibilidade**
- (média) `navegacao.tsx:73` aba "em breve" como `<span aria-disabled>`: remover ou explicar.
- (média) `personalizacao-view.tsx:79-90,147` radiogroup sem setas → `RadioGroup` do Radix.
- (média) foco não vai ao `h1` na troca de rota.
- (baixa) `inicio-view.tsx:196` "Atrasadas" só pela cor → ícone.
- (baixa) `inicio-view.tsx:158` h1 "Carregando…".

**Toque**
- (média) chips `min-h-9` (36 px) em `inicio-view.tsx:189-210`, `adicionar-rapido.tsx:135`; `min-h-8` em `agenda-view.tsx:234`, `itens-do-quadro.tsx:126` → área de 44 px.
- (média) faltam `touch-action: manipulation` e `-webkit-tap-highlight-color: transparent`.
- (média) cartões clicáveis sem `:active`.
- (baixa) folha com "alça" mas sem swipe para fechar.

**Performance**
- (alta) blur só no chrome (nav, folhas, toasts, menus); `.cartao` com fundo `color-mix` sem blur.
- (média) `loading.tsx` por rota.
- (média) nebulosa fixa: `will-change`/`contain`.
- (baixa) `100vh` → `100dvh`.

**Estilo e layout**
- (média) CTA primário duplicado no Início; "+" da nav deve flutuar ~8 px com sombra colorida.
- (baixa) sombra do chip selecionado → token `--shadow-glow-accent`.
- (média) Toaster: `bottom-center` com offset `calc(6.5rem + env(safe-area-inset-bottom))`.
- (média) desktop preso em 480 px → nav lateral e coluna de 640 px em ≥1024 px.
- (baixa) `viewport.viewportFit: "cover"`.

**Tipografia e cor**
- (média) campos com menos de 16 px (`painel-de-detalhes.tsx:26`) → zoom no iOS; regra global `font-size: max(16px, 1em)`.
- (média) `text-[11px]` na agenda e `--text-label` 11 px → 12 px.
- (baixa) uso editorial do Cormorant (timer, manchete).
- (verificar) contraste de `--ink-muted` sobre `--card` nos 7 temas.

**Animação e feedback**
- (alta) folha/dropdown/overlay animados via `data-state` do Radix.
- (média) indicador da nav com `layoutId` e mola.
- (baixa) saída mais rápida que entrada (160 ms vs 240 ms).
- (média) "salvo" visível em Personalização.

**Navegação**
- (alta) rótulos visíveis na nav; tirar Notas/Murais do menu do avatar ("Mais" ou aba "Estudo").
- (média) header de voltar padrão nos detalhes.

## Transições propostas

Tokens: instante 90 ms, rápida 160, base 240, lenta 420; mola 380/32; celebração 260/20. Tudo atrás de `data-motion` / reduced motion.

1. View Transitions de rota (`experimental.viewTransition`); shared element lista→detalhe (nota, mural) em 360 ms; direção ida/volta.
2. Nav com pílula `layoutId` e `whileTap`.
3. Classe `.tocavel` (scale .98 em 90 ms).
4. `lib/vibrar.ts` (Android; iOS ignora).
5. Concluir tarefa: pop + partículas douradas.
6. `loading.tsx` no formato da tela; crossfade de 160 ms.
7. Folha com mola e swipe para fechar.
8. Toasts 240/160 ms, 4 s (6 s com ação).
9. Troca de tema com `clip-path: circle()` a partir do toque.
10. Nebulosa viva opcional (só `data-motion=full`).

## Inspirações

- Vidro/nebulosa: Liquid Glass (iOS 26), Revolut, Arc, Linear, Raycast, Things 3, Structured, Opal, Endel; Forest/Flora/Focus Friend.
- Flashcards: AnkiMobile (intervalo nos botões), RemNote, Mochi, Duolingo. Cartão `.vidro-forte` com virada 3D (crossfade no reduzido); botões só após virar, com cor + rótulo + intervalo; teclas 1–4; swipe opcional; progresso e resumo final.
- Grafo: Obsidian, Logseq, Heptabase, Capacities; esmaecer não vizinhos; "Ver como lista".
- Sala pixel: Gather, Habbo, Stardew; janela de vidro; `image-rendering: pixelated`; avatares 32 px ×3; idle de 2 frames.

## Top 15

1. Manifest + ícones + `viewportFit` · 2. Toaster acima da nav · 3. Campos 16 px · 4. Animar folha/menu/overlay · 5. Blur só no chrome · 6. Rótulos na nav + `layoutId` · 7. Reorganizar navegação · 8. `.tocavel` + `touch-action` · 9. `loading.tsx` · 10. View Transitions + shared element · 11. Foco no h1 + header de voltar · 12. Alvos 44 px · 13. Tipografia ≥ 12 px + contraste · 14. RadioGroup + "salvo" · 15. Haptics, celebração e swipe nas folhas.
