# Plano: Visões das Tarefas

Spec: `docs/superpowers/specs/2026-10-14-visoes-das-tarefas-design.md`. Cada passo = um commit pequeno.

## PR 1 — Base + Quadro
1. Migração + testes de banco (RED→GREEN) + `lib/database.types.ts`.
2. Cor da trilha: tipo, consulta, helper `corDaTrilha`, pacotes com cor, folha "Trilhas".
3. `start_on`: tipo, normalização (início exige prazo, nunca depois do prazo), campo no painel.
4. Seletor de visão + persistência no perfil.
5. Regras puras do Quadro (colunas por status/trilha/prioridade, mover) com testes unitários.
6. dnd-kit (workflow de dependências) + componente do Quadro + menu "Mover para…".
7. E2E + acessibilidade (8 temas) + build. PR.

## PR 2 — Calendário
Regras puras (grade do mês, faixas de barras), tela, folha do dia, arrastar/esticar, testes.

## PR 3 — Mural das Tarefas
`task_positions` (consulta/mutação), tela com canvas, bandeja "Chegando", testes.
