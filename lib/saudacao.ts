/**
 * Saudação do Dashboard no tom do design system ("Bom dia, Renan"), no fuso DA PESSOA.
 * Funções puras: recebem a data como parâmetro, então são fáceis de testar.
 */

const FUSO_PADRAO = "America/Sao_Paulo";

/** Hora (0–23) de um instante num fuso. Fuso inválido cai no padrão em vez de quebrar a tela. */
function horaNoFuso(agora: Date, fuso: string): number {
  const formatar = (tz: string) =>
    Number(
      new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz })
        .formatToParts(agora)
        .find((p) => p.type === "hour")?.value,
    );
  try {
    return formatar(fuso);
  } catch {
    return formatar(FUSO_PADRAO);
  }
}

export function saudacao(agora: Date, fuso: string = FUSO_PADRAO): string {
  const hora = horaNoFuso(agora, fuso);
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** "Ana Silva" -> "Ana". Nome vazio vira "estudante" para a frase nunca ficar quebrada. */
export function primeiroNome(nome: string | null | undefined): string {
  const limpo = (nome ?? "").trim().split(/\s+/)[0];
  return limpo ? limpo : "estudante";
}
