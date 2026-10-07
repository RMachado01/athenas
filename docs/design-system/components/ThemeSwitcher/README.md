# ThemeSwitcher

Escolhe entre os três temas (Ponderosa, Burgundy, Camel) na tela de Personalização; a troca é instantânea e animada.

**Comportamento:** grava em `profiles.theme` (Supabase) e num cookie, para o servidor já renderizar o `<html data-theme>` certo e não piscar o tema errado no carregamento. Opção extra "Automático": Camel de dia, Ponderosa à noite (segue `prefers-color-scheme`).

**Movimento:** `document.startViewTransition()` faz o cross-fade de todas as cores em `duration-slow` / `ease-in-out`; sem suporte, as cores transicionam via CSS.

**Acessibilidade:** `role="radiogroup"` com `role="radio"` + `aria-checked`; setas mudam a seleção; cada opção tem nome legível (não só cor).
