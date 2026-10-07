const ROTULO = { 1: "baixa", 2: "média", 3: "alta" } as const;

/** As 3 barrinhas de prioridade do design (douradas = ativas), com texto para leitor de tela. */
export function BarrasDePrioridade({ prioridade }: { prioridade: 1 | 2 | 3 }) {
  return (
    <span
      role="img"
      aria-label={`Prioridade ${ROTULO[prioridade]}`}
      className="flex shrink-0 items-center gap-0.5"
    >
      {[1, 2, 3].map((nivel) => (
        <i
          key={nivel}
          aria-hidden="true"
          className={`block h-3.5 w-1 rounded-pill ${nivel <= prioridade ? "bg-accent" : "bg-glass-border"}`}
        />
      ))}
    </span>
  );
}
