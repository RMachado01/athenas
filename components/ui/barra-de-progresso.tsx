/**
 * Barra de progresso do design (referência "Continue Learning"): trilho em vidro, preenchimento em
 * degradê da cor do tema e uma PONTA BRILHANTE (a "cabeça" da barra). Animar a largura é barato
 * aqui (um elemento pequeno) e a transição some com "reduzir movimento" (regra global do CSS).
 *
 * Acessível: role="progressbar" com valor e rótulo.
 */
export function BarraDeProgresso({
  valor,
  rotulo,
  className = "",
}: {
  /** 0 a 100. */
  valor: number;
  /** Ex.: "Progresso da trilha SQL". Descreve o que está sendo medido. */
  rotulo: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`bg-card border-card-border relative h-3 w-full rounded-pill border ${className}`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-pill transition-[width] duration-(--duration-slow) ease-out"
        style={{
          width: `max(${v}%, 12px)`,
          background: "linear-gradient(90deg, var(--brand-soft), var(--accent))",
        }}
      >
        {/* Ponta brilhante */}
        <span
          aria-hidden="true"
          className="bg-accent absolute top-1/2 right-0 size-3 -translate-y-1/2 rounded-pill shadow-[0_0_14px_2px_color-mix(in_srgb,var(--accent)_70%,transparent)]"
        />
      </div>
    </div>
  );
}
