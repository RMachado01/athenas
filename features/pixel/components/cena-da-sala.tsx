import { ALTURA_DA_SALA, LARGURA_DA_SALA, desenharSala } from "../sala/desenho";

// A sala não muda: desenhamos uma vez só, na carga do módulo.
const RETANGULOS = desenharSala();

/**
 * A sala-biblioteca em SVG (retângulos de bordas nítidas). Decorativa: o leitor de tela ignora.
 * A classe `cenario-sala` deixa a cena em escala de cinza no tema Preto e Branco (ver globals.css);
 * os pets ficam numa camada de cima e continuam coloridos.
 */
export function CenaDaSala() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${LARGURA_DA_SALA} ${ALTURA_DA_SALA}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className="cenario-sala absolute inset-0 size-full"
    >
      {RETANGULOS.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={r.cor}
          fillOpacity={r.opacidade}
        />
      ))}
    </svg>
  );
}
