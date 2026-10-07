# Button

Dispara ações; o primário dourado é a única ação principal de uma área.

| Variante | Quando | Visual |
|---|---|---|
| `primary` | Ação principal (Começar foco, Salvar meta) | fundo `accent`, texto `on-accent` |
| `secondary` | Ações de apoio (Nova tarefa, Filtrar) | transparente, borda `border-strong`; hover borda e texto `accent` |
| `ghost` | Cancelar, ações terciárias | só texto `ink-muted`; hover fundo `surface-raised` |

**Tamanhos:** sm (32px, `body-sm`), md (40px, padrão), lg (48px, CTA do Foco).

**Estados:** hover troca cor em `duration-instant`; press escala 0.98; disabled opacidade 45%; loading troca o ícone por spinner e mantém a largura.

**Acessibilidade:** `<button>` nativo; foco com anel `focus-ring` 2px + offset 2px; botão só-ícone precisa de `aria-label`.

| ✅ Faça | ❌ Evite |
|---|---|
| Um primário por card/tela | Dois botões dourados lado a lado |
| Verbo no imperativo | "OK", "Clique aqui" |
