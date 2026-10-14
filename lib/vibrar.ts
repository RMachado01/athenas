/**
 * Retorno tátil curto (haptics). Funciona no Android (Chrome); o iPhone ignora em silêncio,
 * porque o Safari não expõe a vibração para sites. Nunca deve ser o ÚNICO sinal de algo.
 *  - "toque": confirmação leve (concluir tarefa). O fim do Pomodoro tem vibração própria, mais
 *    forte, no cronômetro (precisa ser sentida com o celular longe da mão).
 */
const PADROES = { toque: 12 } as const;

export function vibrar(tipo: keyof typeof PADROES = "toque"): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(PADROES[tipo]);
    }
  } catch {
    // Alguns navegadores lançam erro se a página não recebeu toque ainda: só ignoramos.
  }
}
