/**
 * Motor de arte pixel do Athenas. Toda a arte é feita em CÓDIGO (sem arquivos de imagem de
 * terceiros): cada desenho é uma "grade" de letras, uma letra por pixel, e uma paleta diz a cor
 * de cada letra. O ponto "." é transparente.
 *
 *   ["..b..",        b = base, o = contorno, e = olho...
 *    ".bbb.",        (as letras mudam de desenho para desenho; quem manda é a paleta)
 *    "..b.."]
 *
 * Do desenho ao ecrã: componer (junta peças) → contornar (contorno automático) → SVG com
 * retângulos de bordas nítidas → faixa de quadros animada com CSS `steps()`.
 * Funções puras, sem tela: ficam fáceis de testar.
 */

export type Grade = readonly string[];
export type Paleta = Readonly<Record<string, string>>;

export interface Camada {
  grade: Grade;
  x: number;
  y: number;
}

export const TRANSPARENTE = ".";

/** Junta as peças numa tela de `largura` x `altura`. A peça mais para o fim da lista fica por cima. */
export function componer(camadas: readonly Camada[], largura: number, altura: number): string[] {
  const tela = Array.from({ length: altura }, () => Array<string>(largura).fill(TRANSPARENTE));
  for (const { grade, x, y } of camadas) {
    grade.forEach((linha, j) => {
      for (let i = 0; i < linha.length; i += 1) {
        const px = x + i;
        const py = y + j;
        const s = linha[i]!;
        if (s === TRANSPARENTE || px < 0 || py < 0 || px >= largura || py >= altura) continue;
        tela[py]![px] = s;
      }
    });
  }
  return tela.map((linha) => linha.join(""));
}

/**
 * Contorno automático: toda célula vazia que encosta (cima, baixo, esquerda, direita) num pixel
 * do desenho vira `simbolo`. Assim só se desenha o PREENCHIMENTO e o contorno grosso, típico
 * do estilo, aparece sozinho (inclusive entre as pernas). Deixe 1 pixel de margem na tela.
 */
export function contornar(grade: Grade, simbolo = "o"): string[] {
  return grade.map((linha, j) =>
    Array.from(linha, (s, i) => {
      if (s !== TRANSPARENTE) return s;
      const vizinhos = [grade[j - 1]?.[i], grade[j + 1]?.[i], linha[i - 1], linha[i + 1]];
      return vizinhos.some((v) => v !== undefined && v !== TRANSPARENTE) ? simbolo : s;
    }).join(""),
  );
}

/** Vira o desenho para o outro lado (o pet que anda para a esquerda). */
export function espelhar(grade: Grade): string[] {
  return grade.map((linha) => Array.from(linha).reverse().join(""));
}

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  cor: string;
}

/** Junta pixels vizinhos de mesma cor, na mesma linha, em retângulos (SVG bem menor). */
export function runsDaGrade(grade: Grade, paleta: Paleta): Retangulo[] {
  const rets: Retangulo[] = [];
  grade.forEach((linha, y) => {
    let i = 0;
    while (i < linha.length) {
      const s = linha[i]!;
      const cor = s === TRANSPARENTE ? undefined : paleta[s];
      if (!cor) {
        i += 1;
        continue;
      }
      let fim = i + 1;
      while (fim < linha.length && linha[fim] === s) fim += 1;
      rets.push({ x: i, y, w: fim - i, cor });
      i = fim;
    }
  });
  return rets;
}

const CABECALHO = 'xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"';

function retangulosSvg(grade: Grade, paleta: Paleta, deslocamentoX = 0): string {
  return runsDaGrade(grade, paleta)
    .map(
      (r) =>
        `<rect x="${r.x + deslocamentoX}" y="${r.y}" width="${r.w}" height="1" fill="${r.cor}"/>`,
    )
    .join("");
}

/** Um desenho como SVG: o viewBox é em pixels do desenho, então escala sem borrar. */
export function gradeParaSvg(grade: Grade, paleta: Paleta): string {
  const largura = grade[0]?.length ?? 0;
  return `<svg ${CABECALHO} viewBox="0 0 ${largura} ${grade.length}">${retangulosSvg(grade, paleta)}</svg>`;
}

export interface Faixa {
  svg: string;
  url: string;
  largura: number;
  altura: number;
  quadros: number;
}

/** Vários quadros lado a lado num SVG só (a "spritesheet"); o CSS mostra um quadro por vez. */
export function faixaSvg(quadros: readonly Grade[], paleta: Paleta): Faixa {
  const largura = quadros[0]?.[0]?.length ?? 0;
  const altura = quadros[0]?.length ?? 0;
  for (const q of quadros) {
    if (q.length !== altura || q.some((l) => l.length !== largura)) {
      throw new Error("Todos os quadros da faixa precisam ter o mesmo tamanho");
    }
  }
  const corpo = quadros.map((q, n) => retangulosSvg(q, paleta, n * largura)).join("");
  const svg = `<svg ${CABECALHO} viewBox="0 0 ${largura * quadros.length} ${altura}">${corpo}</svg>`;
  return { svg, url: urlDeSvg(svg), largura, altura, quadros: quadros.length };
}

/** SVG como "data URL", pronto para `background-image`. */
export function urlDeSvg(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Confere a grade: retangular e só com símbolos permitidos. Devolve a lista de problemas. */
export function validarGrade(grade: Grade, permitidos: ReadonlySet<string>): string[] {
  const erros: string[] = [];
  const largura = grade[0]?.length ?? 0;
  grade.forEach((linha, j) => {
    if (linha.length !== largura) {
      erros.push(`linha ${j}: largura ${linha.length}, esperado ${largura}`);
    }
    for (const s of linha) {
      if (s !== TRANSPARENTE && !permitidos.has(s))
        erros.push(`linha ${j}: símbolo "${s}" desconhecido`);
    }
  });
  return erros;
}
