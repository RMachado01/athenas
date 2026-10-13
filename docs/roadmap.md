# Roadmap do Athenas

**Atualizado:** 2026-10-12 · Aprovado pelo Renan a partir de [pesquisa de produto](pesquisa/2026-10-12-pesquisa-de-produto.md) e [auditoria de design](pesquisa/2026-10-12-auditoria-de-design.md).
Princípio: o app é para **qualquer estudante** (concurso, ENEM, faculdade, programação, idiomas, medicina, OAB, certificações), não para uma trilha só.

## Feito

Tarefas e trilhas · Foco/Pomodoro (streak, mapa de calor) · 7 temas + Personalização · Metas · Agenda + Google Agenda (importar) · Murais · Notas ligadas.

## Agora

1. **Flashcards** (FSRS, sintaxe Obsidian `::`, baralhos, revisão com 4 botões, card no Início, tempo conta no Foco). Spec: `superpowers/specs/2026-10-12-flashcards-design.md`.
2. **Polimento para publicar** (auditoria, itens 1–5, 8, 12): manifest/ícones/`viewportFit`, Toaster acima da nav, campos 16 px, animar folhas/menus, blur só no chrome, `.tocavel` e `touch-action`, alvos 44 px.

## Próximo

3. **Navegação e transições**: rótulos na nav, aba "Estudo" (Notas, Murais, Flashcards), View Transitions com shared element, `loading.tsx`, header de voltar, foco no h1, haptics.
4. **Onboarding por perfil de estudante** com trilha modelo e baralho de exemplo + onboarding de SRS (3 telas).
5. **Importar edital/matriz como trilha** (texto oficial: editais, Matriz ENEM, BNCC, OAB).
6. **Estudo ativo nas notas**: modo blurting e "Me teste".
7. **Flashcards v2**: ida e volta `:::`, lacunas `==cloze==`, multilinha `?`, linter de cartões, previsão de carga, dias leves, estatísticas, calibrar o FSRS por pessoa.
8. **Grafo de notas** (com "Ver como lista").
9. **Streak saudável**: semanal com congelamento; estatísticas privadas por padrão.

## Depois (exige base legal)

10. **Conformidade ECA Digital / LGPD**: data de nascimento, vínculo com responsável < 16, privacidade por padrão, denúncia e bloqueio. Validar com advogado antes de abrir para menores de 18.
11. **Salas silenciosas** (body doubling, intenção declarada, Supabase Realtime presence).
12. **Biblioteca pixel art** com avatares, status, música (só exibição) e "estudando agora".
13. **Trilhas comunitárias CC BY-SA** com fork.
14. Google Agenda etapa 2 (exportar com outbox); Flowtime no Foco; desktop com nav lateral.
