# Roadmap do Athenas

**Atualizado:** 2026-10-14 · Aprovado pelo Renan a partir de [pesquisa de produto](pesquisa/2026-10-12-pesquisa-de-produto.md) e [auditoria de design](pesquisa/2026-10-12-auditoria-de-design.md).
Princípio: o app é para **qualquer estudante** (concurso, ENEM, faculdade, programação, idiomas, medicina, OAB, certificações), não para uma trilha só.

## Feito

Tarefas e trilhas · Foco/Pomodoro (streak, mapa de calor) · 7 temas + Personalização · Metas · Agenda + Google Agenda (importar) · Murais · Notas ligadas · Flashcards · Polimento para publicar (PWA, toques, desfoque, animações, seletor) · Navegação e transições (rótulos na barra, aba Estudo, foco no título, carregamento, folha arrastável, celebração) · Endurecimento de segurança (cabeçalhos HTTP, colunas editáveis, índices).

## Agora

1. **Visões das Tarefas** (escolha do layout ao clique): Lista, Quadro/Kanban, Calendário do mês e Mural livre de post-its.
2. **Biblioteca pixel**: salas, avatares pixel e pets que andam pela tela (escolher e dar nome).
3. **Camada social v1** (a partir de 14 anos, com regras do ECA Digital): perfil com status e foto, selos de estudo, chat nas salas.

## Próximo

4. **Onboarding por perfil de estudante** com trilha modelo e baralho de exemplo + onboarding de SRS (3 telas).
5. **Importar edital/matriz como trilha** (texto oficial: editais, Matriz ENEM, BNCC, OAB).
6. **Estudo ativo nas notas**: modo blurting e "Me teste".
7. **Flashcards v2**: ida e volta `:::`, lacunas `==cloze==`, multilinha `?`, linter de cartões, previsão de carga, dias leves, estatísticas, calibrar o FSRS por pessoa. Também (achados menores da revisão de código): "Revisar mais 10 novos" no fim da sessão, paginação da fila acima de 1.000 cartões, tempo da sessão ao fechar a aba (`pagehide`), esmaecer na virada com movimento reduzido, formulário de cartão que espera confirmar antes de fechar, horário de verão no cálculo da meia-noite, e2e de arquivar/suspender/editar.
8. **Grafo de notas** (com "Ver como lista").
9. **Streak saudável**: semanal com congelamento; estatísticas privadas por padrão.

## Depois (exige base legal)

10. **Conformidade ECA Digital / LGPD**: data de nascimento, vínculo com responsável < 16, privacidade por padrão, denúncia e bloqueio. Validar com advogado antes de abrir para menores de 18.
11. **Salas silenciosas** (body doubling, intenção declarada, Supabase Realtime presence).
12. **Biblioteca pixel art** com avatares, status, música (só exibição) e "estudando agora".
13. **Trilhas comunitárias CC BY-SA** com fork.
14. Google Agenda etapa 2 (exportar com outbox); Flowtime no Foco; desktop com nav lateral; transição com elemento compartilhado (lista → detalhe); nebulosa viva opcional; CSP completa com nonce.
