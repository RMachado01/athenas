/**
 * A sala-biblioteca (vista de lado, como um palco), desenhada por código em uma tela de
 * 160 x 100 "pixels". Devolve uma lista de retângulos coloridos; a tela os pinta em SVG com
 * bordas nítidas. Nada aqui é aleatório de verdade: os livros das estantes saem de uma
 * sequência fixa (semente), então a sala é sempre igual, em qualquer aparelho.
 *
 * Luz âmbar de abajur, madeira escura, janela de céu noturno com lua: a direção visual das
 * referências do Renan (bibliotecas aconchegantes). No tema preto e branco a CENA vira cinza
 * (filtro de CSS); os pets não, porque ficam em outra camada.
 */

export const LARGURA_DA_SALA = 160;
export const ALTURA_DA_SALA = 100;
/** Linha do chão: de onde para baixo é piso (os pets andam em cima dela). */
export const CHAO_Y = 78;

export interface Ret {
  x: number;
  y: number;
  w: number;
  h: number;
  cor: string;
  /** Transparência (0 a 1). Só o brilho do abajur usa. */
  opacidade?: number;
}

const COR = {
  paredeAlta: "#46301f",
  paredeBaixa: "#3b2519",
  lambri: "#2f1d13",
  lambriLuz: "#38241a",
  moldura: "#5f3f27",
  madeira: "#6b4528",
  madeiraEscura: "#4e301c",
  madeiraClara: "#82552f",
  piso: "#5a3a22",
  pisoLinha: "#4a2f1b",
  pisoClaro: "#654127",
  vidro: "#1b2a4a",
  vidroClaro: "#243962",
  lua: "#f4eac0",
  luaSombra: "#d9cc98",
  estrela: "#e8e2c0",
  abajur: "#f2b84b",
  abajurSombra: "#c98a2a",
  luz: "#ffcf6b",
  tapete: "#6b2f2f",
  tapeteBorda: "#8a4a3a",
  tapeteDesenho: "#a8654f",
  vaso: "#8a4a2a",
  folha: "#3f7a45",
  folhaClara: "#5ea060",
  caneca: "#e8e0d0",
  caneca2: "#b8aea0",
} as const;

const LOMBADAS = [
  "#8c3b3b",
  "#3b5c8c",
  "#3b8c5a",
  "#c9a23a",
  "#7a4a8c",
  "#c46a3a",
  "#4a7a7a",
  "#a8553a",
  "#d8c9a0",
] as const;

/** Gerador de números fixos (mesma semente = mesma sequência): a sala nunca muda sozinha. */
function sequencia(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function retangulo(
  x: number,
  y: number,
  w: number,
  h: number,
  cor: string,
  opacidade?: number,
): Ret {
  return opacidade === undefined ? { x, y, w, h, cor } : { x, y, w, h, cor, opacidade };
}

/** Estante com 5 prateleiras de livros em pé, de cores e alturas variadas. */
function estante(x: number, y: number, w: number, h: number, semente: number): Ret[] {
  const r: Ret[] = [];
  const sorte = sequencia(semente);
  r.push(retangulo(x, y, w, h, COR.madeiraEscura));
  r.push(retangulo(x + 1, y + 1, w - 2, h - 2, "#2a1a10")); // fundo
  const prateleiras = 5;
  const vao = Math.floor((h - 2) / prateleiras);
  for (let p = 0; p < prateleiras; p += 1) {
    const topo = y + 1 + p * vao;
    const chao = topo + vao - 2;
    let cursor = x + 2;
    while (cursor < x + w - 4) {
      const largura = 2 + Math.floor(sorte() * 3); // 2 a 4
      if (cursor + largura > x + w - 2) break;
      if (sorte() < 0.12) {
        cursor += 3; // um vão de vez em quando
        continue;
      }
      const altura = vao - 5 + Math.floor(sorte() * 4); // lombadas de alturas diferentes
      const cor = LOMBADAS[Math.floor(sorte() * LOMBADAS.length)]!;
      r.push(retangulo(cursor, chao - altura, largura, altura, cor));
      // faixa clara no alto da lombada (dá "volume" de livro)
      r.push(retangulo(cursor, chao - altura, largura, 1, "#ffffff", 0.18));
      cursor += largura;
    }
    r.push(retangulo(x + 1, chao, w - 2, 2, COR.madeira)); // a prateleira
  }
  // quina de luz do lado de dentro
  r.push(retangulo(x, y, w, 1, COR.madeiraClara));
  return r;
}

function janela(x: number, y: number): Ret[] {
  const w = 38;
  const h = 34;
  const r: Ret[] = [
    retangulo(x - 2, y - 2, w + 4, h + 4, COR.moldura),
    retangulo(x, y, w, h, COR.vidro),
    retangulo(x, y + h / 2, w, h / 2, COR.vidroClaro, 0.55), // horizonte mais claro
  ];
  // estrelas
  for (const [ex, ey] of [
    [4, 4],
    [12, 9],
    [26, 5],
    [31, 12],
    [8, 18],
    [22, 14],
  ] as const) {
    r.push(retangulo(x + ex, y + ey, 1, 1, COR.estrela));
  }
  // lua (círculo de 6 pixels, com crescente)
  r.push(retangulo(x + 27, y + 18, 4, 6, COR.lua));
  r.push(retangulo(x + 26, y + 19, 6, 4, COR.lua));
  r.push(retangulo(x + 29, y + 19, 2, 4, COR.luaSombra));
  // vidraça em cruz
  r.push(retangulo(x + w / 2 - 1, y, 2, h, COR.moldura));
  r.push(retangulo(x, y + h / 2 - 1, w, 2, COR.moldura));
  // peitoril
  r.push(retangulo(x - 4, y + h + 2, w + 8, 3, COR.madeiraClara));
  return r;
}

function mesaComAbajur(x: number, y: number): Ret[] {
  const r: Ret[] = [];
  // brilho do abajur: degraus de transparência (pixel, não degradê)
  r.push(retangulo(x - 6, y - 36, 62, 34, COR.luz, 0.05));
  r.push(retangulo(x - 2, y - 30, 54, 28, COR.luz, 0.06));
  r.push(retangulo(x + 4, y - 24, 42, 22, COR.luz, 0.07));
  // tampo, gaveta e pernas
  r.push(retangulo(x, y, 50, 3, COR.madeiraClara));
  r.push(retangulo(x, y + 3, 50, 2, COR.madeiraEscura));
  r.push(retangulo(x + 3, y + 5, 3, 11, COR.madeira));
  r.push(retangulo(x + 44, y + 5, 3, 11, COR.madeira));
  r.push(retangulo(x + 7, y + 5, 36, 6, COR.madeira));
  r.push(retangulo(x + 22, y + 7, 6, 2, COR.abajurSombra)); // puxador
  // abajur
  r.push(retangulo(x + 6, y - 2, 6, 2, COR.madeiraEscura)); // base
  r.push(retangulo(x + 8, y - 12, 2, 10, COR.madeiraEscura)); // haste
  r.push(retangulo(x + 4, y - 18, 10, 6, COR.abajur));
  r.push(retangulo(x + 4, y - 14, 10, 2, COR.abajurSombra));
  // livros empilhados e caderno aberto
  r.push(retangulo(x + 30, y - 3, 12, 3, "#3b5c8c"));
  r.push(retangulo(x + 31, y - 6, 10, 3, "#8c3b3b"));
  r.push(retangulo(x + 32, y - 8, 8, 2, "#c9a23a"));
  r.push(retangulo(x + 16, y - 2, 11, 2, "#efe6cf"));
  r.push(retangulo(x + 21, y - 2, 1, 2, COR.pisoLinha));
  // caneca
  r.push(retangulo(x + 44, y - 5, 4, 5, COR.caneca));
  r.push(retangulo(x + 44, y - 2, 4, 2, COR.caneca2));
  r.push(retangulo(x + 48, y - 4, 1, 3, COR.caneca2));
  return r;
}

function planta(x: number, y: number): Ret[] {
  return [
    retangulo(x + 3, y + 8, 12, 12, COR.vaso),
    retangulo(x + 2, y + 6, 14, 3, "#a35b36"),
    retangulo(x + 8, y - 2, 2, 9, COR.folha),
    retangulo(x + 3, y - 4, 5, 3, COR.folha),
    retangulo(x + 4, y - 7, 3, 3, COR.folhaClara),
    retangulo(x + 10, y - 6, 5, 3, COR.folha),
    retangulo(x + 12, y - 9, 3, 3, COR.folhaClara),
    retangulo(x, y, 6, 3, COR.folhaClara),
    retangulo(x + 12, y + 1, 6, 3, COR.folha),
  ];
}

function piso(): Ret[] {
  const r: Ret[] = [retangulo(0, CHAO_Y, LARGURA_DA_SALA, ALTURA_DA_SALA - CHAO_Y, COR.piso)];
  // tábuas: linhas horizontais e emendas escalonadas
  for (let y = CHAO_Y; y < ALTURA_DA_SALA; y += 5) {
    r.push(retangulo(0, y, LARGURA_DA_SALA, 1, COR.pisoLinha));
    const deslocamento = ((y - CHAO_Y) / 5) % 2 === 0 ? 0 : 14;
    // A última tábua é cortada pela borda da tela: a emenda não pode passar dela.
    const alturaDaEmenda = Math.min(4, ALTURA_DA_SALA - (y + 1));
    for (let x = deslocamento; x < LARGURA_DA_SALA; x += 28) {
      r.push(retangulo(x, y + 1, 1, alturaDaEmenda, COR.pisoLinha));
    }
    r.push(retangulo(0, y + 1, LARGURA_DA_SALA, 1, COR.pisoClaro, 0.5));
  }
  return r;
}

function tapete(): Ret[] {
  const x = 38;
  const y = 88;
  return [
    retangulo(x, y, 84, 9, COR.tapeteBorda),
    retangulo(x + 2, y + 1, 80, 7, COR.tapete),
    retangulo(x + 6, y + 3, 72, 1, COR.tapeteDesenho),
    retangulo(x + 6, y + 5, 72, 1, COR.tapeteDesenho),
    retangulo(x + 40, y + 2, 4, 5, COR.tapeteDesenho),
  ];
}

/** Todos os retângulos da sala, de trás para a frente (o último fica por cima). */
export function desenharSala(): Ret[] {
  const r: Ret[] = [];
  // parede: faixa alta mais clara, lambri (madeira) embaixo
  r.push(retangulo(0, 0, LARGURA_DA_SALA, CHAO_Y, COR.paredeAlta));
  r.push(retangulo(0, 40, LARGURA_DA_SALA, CHAO_Y - 40, COR.paredeBaixa));
  r.push(retangulo(0, 56, LARGURA_DA_SALA, CHAO_Y - 56, COR.lambri));
  for (let x = 0; x < LARGURA_DA_SALA; x += 10) {
    r.push(retangulo(x, 58, 1, CHAO_Y - 58, COR.lambriLuz)); // frestas do lambri
  }
  r.push(retangulo(0, 55, LARGURA_DA_SALA, 2, COR.moldura)); // moldura entre parede e lambri
  r.push(retangulo(0, CHAO_Y - 2, LARGURA_DA_SALA, 2, COR.madeiraEscura)); // rodapé
  r.push(...piso());
  r.push(...janela(61, 12));
  r.push(...estante(4, 6, 44, CHAO_Y - 6, 7));
  r.push(...estante(112, 6, 44, CHAO_Y - 6, 23));
  r.push(...mesaComAbajur(54, 62));
  r.push(...planta(100, 58));
  r.push(...tapete());
  return r;
}
