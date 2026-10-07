/**
 * Formata uma quantidade de minutos no estilo do Athenas: "45 min", "3h20", "2h00".
 *
 * Por que isso existe: o design mostra tempo sempre assim (Dashboard: "3h20 hoje").
 * Centralizar aqui evita cada tela inventar o próprio formato.
 *
 * Regras:
 *  - menos de 60 min  -> "45 min"
 *  - 60 min ou mais   -> "XhYY" (minutos sempre com 2 dígitos, para não "pular" na tela)
 *  - valores inválidos (negativo, NaN) viram "0 min" em vez de quebrar a interface.
 */
export function formatarDuracao(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return "0 min";

  const total = Math.round(minutos);
  if (total < 60) return `${total} min`;

  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}
