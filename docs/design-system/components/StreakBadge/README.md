# StreakBadge

Mostra a sequência de dias em que a meta diária mínima de estudo foi cumprida.

**Regra:** um dia conta quando o tempo de foco registrado ≥ meta diária mínima (padrão 30 min). Um "dia de descanso" por semana pode ser marcado sem quebrar a sequência.

**Estados:** ativa (selo `accent`) · em risco — passou das 20h e ainda falta tempo (`warning`, mostra quanto falta) · quebrada (`ink-muted`, texto encorajador, nunca punitivo).

**Movimento:** ao subir, o número rola (mola 260/20) e o selo faz um único brilho dourado. Nada de fogos.

**Acessibilidade:** texto completo para leitor de tela: "Sequência de 7 dias, ativa".
