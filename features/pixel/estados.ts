/**
 * O "cérebro" do pet: de tempos em tempos decide o que fazer (andar, ficar parado, dormir).
 * Função pura: recebe o estado atual, onde o pet está (0 = canto esquerdo, 1 = canto direito) e
 * uma função de sorteio (0 a 1); devolve a decisão. Assim os testes usam sorteio previsível.
 */
import type { EstadoDoPet } from "./pets/especies";

export interface Decisao {
  estado: EstadoDoPet;
  /** Quanto tempo o pet fica nesse estado antes de decidir de novo. */
  duracaoMs: number;
  /** Só para "andando": para onde vai (0 a 1). */
  alvo?: number;
}

/** Quanto tempo o pet leva para cruzar a sala inteira andando. */
export const VELOCIDADE_MS_POR_TELA = 7000;
/** Quanto tempo fica feliz depois de um carinho. */
export const CARINHO_MS = 1800;

const MARGEM = 0.05;
const CAMINHADA_MINIMA = 0.2;

const entre = (min: number, max: number, r: number) => min + (max - min) * r;

export function direcaoPara(de: number, para: number): 1 | -1 {
  return para >= de ? 1 : -1;
}

function andar(posicao: number, sorteio: () => number): Decisao {
  // Vai para o lado com mais espaço; de vez em quando, para o outro (se couber).
  const maisEspacoNaDireita = posicao < 0.5;
  const inverte = sorteio() < 0.25;
  let direcao: 1 | -1 = maisEspacoNaDireita !== inverte ? 1 : -1;
  const cabe = (d: 1 | -1) =>
    d === 1 ? 1 - MARGEM - posicao >= CAMINHADA_MINIMA : posicao - MARGEM >= CAMINHADA_MINIMA;
  if (!cabe(direcao)) direcao = direcao === 1 ? -1 : 1;

  const espaco = direcao === 1 ? 1 - MARGEM - posicao : posicao - MARGEM;
  const distancia = entre(CAMINHADA_MINIMA, Math.max(CAMINHADA_MINIMA, espaco), sorteio());
  const alvo = Math.min(1 - MARGEM, Math.max(MARGEM, posicao + direcao * distancia));
  return {
    estado: "andando",
    alvo,
    duracaoMs: Math.max(1, Math.round(Math.abs(alvo - posicao) * VELOCIDADE_MS_POR_TELA)),
  };
}

function parar(sorteio: () => number): Decisao {
  return { estado: "parado", duracaoMs: Math.round(entre(2500, 6000, sorteio())) };
}

function dormir(sorteio: () => number): Decisao {
  return { estado: "dormindo", duracaoMs: Math.round(entre(8000, 16000, sorteio())) };
}

/** O que o pet faz a seguir. */
export function proximaDecisao(
  atual: EstadoDoPet,
  posicao: number,
  sorteio: () => number,
): Decisao {
  const r = sorteio();
  switch (atual) {
    case "dormindo":
      // Quem dorme costuma ficar dormindo; mais cedo ou mais tarde acorda parado.
      return r < 0.3 ? dormir(sorteio) : parar(sorteio);
    case "andando":
      return r < 0.7 ? parar(sorteio) : andar(posicao, sorteio);
    case "parado":
    case "feliz":
      if (r < 0.55) return andar(posicao, sorteio);
      if (r < 0.8) return parar(sorteio);
      return dormir(sorteio);
  }
}

/** Um carinho: o pet para e fica feliz. */
export function carinho(): Decisao {
  return { estado: "feliz", duracaoMs: CARINHO_MS };
}
