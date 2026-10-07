import type { ComponentType, ReactNode } from "react";

/**
 * Cartão de número (referência "Total courses 36 · Completed 17"): ícone num quadrado de vidro,
 * rótulo e o número GRANDE com unidade pequena. Números usam tabular-nums para não "pularem".
 */
export function CartaoDeNumero({
  Icone,
  rotulo,
  valor,
  unidade,
  children,
}: {
  Icone: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rotulo: string;
  valor: number | string;
  unidade?: string;
  children?: ReactNode;
}) {
  return (
    <div className="cartao flex min-h-[132px] flex-col justify-between gap-4 rounded-xl p-4">
      <div className="flex items-center gap-2.5">
        <span className="bg-brand-soft/60 grid size-9 shrink-0 place-items-center rounded-md">
          <Icone className="text-accent size-[18px]" aria-hidden />
        </span>
        <span className="text-ink-muted text-body-sm font-semibold">{rotulo}</span>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-numeric-lg tabular-nums">{valor}</span>
        {unidade && <span className="text-ink-muted text-body-sm">{unidade}</span>}
      </p>
      {children}
    </div>
  );
}
