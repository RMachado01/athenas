/**
 * Presets de movimento do design system (docs/design-system/tokens.json: duration e easing).
 * Centralizados aqui para nenhuma tela inventar a própria curva ou duração.
 *
 * Regra de ouro: animar só `transform` e `opacity` (60 fps no celular).
 * "Reduzir movimento" é tratado globalmente pelo <MotionConfig reducedMotion="user">.
 */

/** cubic-bezier(0.22, 1, 0.36, 1): entradas e expansões. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** cubic-bezier(0.55, 0, 1, 0.45): saídas (ex.: tarefa concluída sumindo). */
export const EASE_IN = [0.55, 0, 1, 0.45] as const;
/** cubic-bezier(0.65, 0, 0.35, 1): troca de tema e de rota. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Segundos (a biblioteca de animação usa segundos; o CSS usa ms). */
export const DURACAO = {
  instante: 0.09,
  rapida: 0.16,
  base: 0.24,
  lenta: 0.42,
} as const;

/** Mola padrão (380/32) e a de celebração (260/20) do design system. */
export const MOLA = { type: "spring", stiffness: 380, damping: 32 } as const;
export const MOLA_CELEBRACAO = { type: "spring", stiffness: 260, damping: 20 } as const;

/** Entrada de card/linha: some 8px para baixo e aparece (stagger de 40 ms fica a cargo de quem lista). */
export const ENTRADA = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURACAO.base, ease: EASE_OUT },
} as const;

/** Atraso de cascata entre itens, limitado: depois do 8º item entram juntos. */
export function atrasoDeCascata(indice: number): number {
  return Math.min(indice, 8) * 0.04;
}
