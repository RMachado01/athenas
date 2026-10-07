import { Check } from "lucide-react";

/**
 * Selo recortado (referência "Daily Streaks"): 8 pontas arredondadas, cheio e com ✓ quando o dia
 * foi cumprido, apagado quando não. O dia de hoje ganha um aro. A letra/abreviação fica em cima.
 * Informação nunca só por cor: o estado também vai em texto para leitor de tela.
 */
export function SeloDoDia({
  rotulo,
  cumprido,
  hoje = false,
  futuro = false,
  descricao,
}: {
  rotulo: string;
  cumprido: boolean;
  hoje?: boolean;
  futuro?: boolean;
  /** Ex.: "terça: 2 tarefas concluídas". */
  descricao: string;
}) {
  return (
    <li className="flex flex-col items-center gap-2" aria-label={descricao}>
      <span
        aria-hidden="true"
        className={`text-label ${hoje ? "text-accent" : "text-ink-muted"} uppercase`}
      >
        {rotulo.slice(0, 1)}
      </span>
      <span className="relative grid size-10 place-items-center" aria-hidden="true">
        <svg viewBox="0 0 40 40" className="absolute inset-0 size-full">
          <path
            d="M20 2c3.2 0 4.7 2.6 7.7 3.5 3 .9 5.9-.3 7.8 2.3 1.9 2.6.6 5.2 1.5 8.3.9 3 3.6 4.3 3.6 7.5s-2.7 4.5-3.6 7.5c-.9 3.1.4 5.7-1.5 8.3-1.9 2.6-4.8 1.4-7.8 2.3C24.7 38 23.2 40 20 40s-4.7-2-7.7-2.9c-3-.9-5.9.3-7.8-2.3-1.9-2.6-.6-5.2-1.5-8.3C2 23.5-.7 22.2-.7 19s2.7-4.5 3.6-7.5c.9-3.1-.4-5.7 1.5-8.3C6.3.6 9.2 1.8 12.2.9 15.3 0 16.8 2 20 2Z"
            transform="translate(1 -1) scale(.96)"
            fill={cumprido ? "var(--accent)" : "var(--card)"}
            stroke={hoje ? "var(--accent)" : "var(--glass-border)"}
            strokeWidth={hoje ? 2 : 1}
            opacity={futuro && !cumprido ? 0.55 : 1}
          />
        </svg>
        {cumprido && <Check className="text-on-accent relative size-5" strokeWidth={3} />}
      </span>
      <span className="sr-only">{descricao}</span>
    </li>
  );
}
