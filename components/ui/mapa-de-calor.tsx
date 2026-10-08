import type { CelulaDeCalor } from "@/features/focus/resumos";

/** Preenchimento de cada nível: a cor do tema com mais ou menos força (no Preto e Branco vira cinza). */
const PREENCHIMENTO: Record<CelulaDeCalor["nivel"], string> = {
  0: "color-mix(in srgb, var(--ink) 9%, transparent)",
  1: "color-mix(in srgb, var(--accent) 28%, transparent)",
  2: "color-mix(in srgb, var(--accent) 50%, transparent)",
  3: "color-mix(in srgb, var(--accent) 75%, transparent)",
  4: "var(--accent)",
};

/**
 * Mapa de calor de estudo (referência "habit tracker"): uma coluna por semana, 7 linhas de
 * segunda a domingo, cada quadradinho mais forte quanto mais a pessoa estudou naquele dia.
 * É decorativo para quem usa leitor de tela, que recebe só o resumo em `descricao`.
 */
export function MapaDeCalor({
  grade,
  descricao,
}: {
  grade: readonly (readonly CelulaDeCalor[])[];
  descricao: string;
}) {
  return (
    <div role="img" aria-label={descricao} className="flex w-full justify-between gap-1">
      {grade.map((semana, s) => (
        <div key={s} className="flex flex-1 flex-col gap-1" aria-hidden="true">
          {semana.map((c) => (
            <span
              key={c.dia}
              title={c.futuro ? undefined : `${c.dia}: ${c.minutos} min`}
              className="aspect-square w-full rounded-[5px]"
              style={{
                background: c.futuro ? "transparent" : PREENCHIMENTO[c.nivel],
                outline: c.futuro ? "1px dashed var(--glass-border)" : undefined,
                outlineOffset: c.futuro ? "-1px" : undefined,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Legenda "menos ▢▢▢▢▢ mais" (aria-hidden: o resumo já está na descrição do mapa). */
export function LegendaDoCalor() {
  return (
    <div
      aria-hidden="true"
      className="text-ink-muted text-body-sm flex items-center justify-end gap-1.5"
    >
      menos
      {([0, 1, 2, 3, 4] as const).map((n) => (
        <span key={n} className="size-3 rounded-[4px]" style={{ background: PREENCHIMENTO[n] }} />
      ))}
      mais
    </div>
  );
}
