# FocusTimer

Timer Pomodoro do modo Foco, ligado a uma tarefa; cada sessão concluída vira tempo registrado no dashboard.

**Anatomia:** overline (sessão X de N) · nome da tarefa em Cormorant · tempo em `numeric-xl` com números tabulares · barra fina de progresso (`brand-soft` → `accent`) · pontos de sessões · Iniciar/Pausar + Pular pausa.

**Comportamento:** padrão 25/5, pausa longa 15 a cada 4 (configurável). O tempo é calculado a partir de `started_at` (não de um contador), então sobrevive a aba em segundo plano e recarregamento. Ao terminar: som discreto opcional + notificação do navegador.

**Movimento:** o card abre crescendo a partir do botão "Começar foco" (shared layout) sobre o `scrim`; na pausa o fundo troca para `brand`.

**Acessibilidade:** `role="timer"`; anunciar só mudanças de fase (`aria-live="polite"` num elemento separado), nunca cada segundo. Atalho espaço = iniciar/pausar.
