# Visões das Tarefas (Lista, Quadro, Calendário, Mural) — desenho

**Data:** 2026-10-14 · **Aprovado pelo Renan no chat** (sem revisão do arquivo, por pedido dele).

## Intenção
Escolher, ao clique, como ver as tarefas, no estilo Notion (referências: Kanban por fase com colunas
coloridas e contagem; calendário do mês com barras de vários dias, caixinha "Concluído" e etiqueta
colorida). Mobile primeiro. O app é para qualquer estudante, não só uma trilha.

## Decisões (todas confirmadas pelo Renan)
1. **Quadro:** botão "Agrupar por" com **Status** (A fazer · Fazendo · Feito), **Trilha** ou **Prioridade**.
2. **Mural das Tarefas:** um mural próprio com todas as tarefas abertas como post-its posicionáveis.
3. **Calendário:** a tarefa ganha **"Começa em"** (opcional). Início + prazo = barra de vários dias.
4. **Cor/etiqueta:** a **trilha ganha uma cor** (as 8 cores dos murais). Sem etiquetas livres por tarefa.
5. **Arrastar:** biblioteca `@dnd-kit/core`. Todo arrastar tem alternativa por menu/teclado (WCAG 2.5.7).

## Dados (migração `20261017120000_visoes_das_tarefas.sql`)
- `tracks.color` (8 cores, padrão `azul`); trilhas existentes recebem cores diferentes por ordem.
- `tasks.start_on date` + checks: início exige prazo e `start_on <= due_on`. `v_tasks` é recriada
  (ela usa `t.*`, que o Postgres "congela" na criação) com `start_on`.
- `task_positions (user_id, task_id, x, y)`: posição no Mural. PK `(user_id, task_id)`, FK composta
  com `on delete cascade`, RLS forçado, só o dono.
- A visão escolhida fica em `profiles.appearance.visao_tarefas` (jsonb que já existe).

## Telas
- **Seletor** Lista · Quadro · Calendário · Mural no topo de Tarefas. A Lista atual não muda.
- **Quadro:** colunas com cabeçalho colorido e contagem; rolagem horizontal com encaixe no celular;
  "+ Nova" por coluna; arrastar muda o campo agrupado; menu "Mover para…" em cada cartão.
- **Calendário:** mês, setas, "Hoje"; barras multi-dia em faixas; caixinha de concluir; tocar no dia
  abre folha com as tarefas e "adicionar"; arrastar a barra move as datas; ponta estica o período.
- **Mural:** reaproveita o componente de canvas dos murais; posição salva em `task_positions`;
  bandeja "Chegando" para tarefas sem posição.
- **Trilhas:** folha "Trilhas" para criar, renomear e escolher a cor.

## Entrega (3 PRs encadeados sobre #16)
1. Base + Quadro (cor da trilha, "Começa em", seletor de visão, gerenciar trilhas, Quadro).
2. Calendário do mês.
3. Mural das Tarefas.

## Testes
Banco (PGlite): cor, `start_on`, `task_positions` e isolamento. Unitários das regras puras.
E2E no celular com o Supabase falso. Acessibilidade (axe) nos 8 temas em cada visão nova.
