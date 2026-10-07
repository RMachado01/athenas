# GoalCard

Mostra uma meta (por trilha, semanal ou de prazo) com progress ring, prazo e status de ritmo.

**Anatomia:** progress ring 88px (trilha `brand-soft`, progresso `accent`, % em `numeric`) · overline `label` com tipo e prazo · nome da meta em Cormorant 24px · linha de status.

**Status de ritmo:** "no ritmo" (`ink-muted`) · "atrasada X dias" (`warning`) · "Meta batida." (`success` + borda `accent` + filete duplo dourado se desenhando).

**Movimento:** o ring anima do valor anterior até o novo em `duration-slow` / `ease-out`; ao chegar a 100% o filete duplo cresce da esquerda (sem confete — discrição).

**Acessibilidade:** ring com `role="progressbar"`, `aria-valuenow`, `aria-valuemax=100` e `aria-label` com o nome da meta.
