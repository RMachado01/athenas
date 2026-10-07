# TaskItem

Linha de tarefa de estudo com check animado, trilha, prazo e prioridade.

**Anatomia:** checkbox (20px, `radius-sm`) · título (`heading-3`) · meta-linha (chip da trilha em `brand` + prazo em `body-sm`) · prioridade (3 barrinhas, `accent` = ativa).

**Estados:** default · hover (`surface-raised`) · concluída (check preenche `accent`, traço desenha via `stroke-dashoffset`, título risca da esquerda pra direita, opacidade 60%) · atrasada (prazo em `danger`) · arrastando (`shadow-float`, escala 1.02).

**Movimento:** ao concluir, depois de 600ms a linha sai com `ease-in` e entra na seção "Concluídas" (layout animation do Framer Motion). Desfazer via toast por 5s.

**Acessibilidade:** checkbox é `<button aria-pressed>` (ou `<input type=checkbox>`); lista com `role=list`; prioridade tem `aria-label`; atalho `x` conclui a tarefa focada.
