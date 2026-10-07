# Input

Campo de texto com label em overline, placeholder de exemplo e helper/erro abaixo.

**Estados:** default (borda `border-strong`) · foco (borda `accent` + halo de 3px `brand-soft`) · erro (borda e helper `danger`, `aria-invalid`) · desabilitado (opacidade 45%).

**Variante "quick add":** no topo da lista de Tarefas, aceita linguagem natural — "SQL CTE amanhã 19h #sql !alta" vira tarefa com trilha, prazo e prioridade.

**Acessibilidade:** `<label for>` sempre visível (placeholder não substitui label); erro ligado via `aria-describedby`.
