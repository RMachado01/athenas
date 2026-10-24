/**
 * Gera o QUADRO DE CONCEITOS do AVATAR pixel (página HTML para o Renan aprovar): o bonequinho,
 * poses, tons de pele, cabelos e cores, roupas, acessórios e a cena "estudando na mesa" com o
 * pet. Tudo desenhado pelo motor real do app. Rodar:
 *   QUADRO_AVATAR_SAIDA=<arquivo.html> ./node_modules/.bin/vitest run \
 *     --config scripts/vitest.gerador.config.ts scripts/quadro-avatar.gerar.ts
 */
import { writeFileSync } from "node:fs";
import { test } from "vitest";
import {
  quadrosDoAvatar,
  tamanhoDoAvatar,
  type EscolhasDoAvatar,
} from "@/features/pixel/avatar/montar";
import {
  ACESSORIOS_DO_AVATAR,
  CABELOS,
  CORES_DE_CABELO,
  PELES,
  POSES,
  ROUPAS,
  paletaDoAvatar,
  type PoseDoAvatar,
} from "@/features/pixel/avatar/pecas";
import { quadrosDoPet, tamanhoDoPet } from "@/features/pixel/pets/animacoes";
import { CATALOGO, paletaDoPet } from "@/features/pixel/pets/catalogo";
import {
  ALTURA_DA_SALA,
  CHAO_Y,
  LARGURA_DA_SALA,
  desenharSala,
} from "@/features/pixel/sala/desenho";
import {
  BARRA_DO_RESUMO,
  CSS,
  FONTES,
  caixinhaAprovar,
  esc,
  jsDoQuadro,
  sprite,
} from "./quadro-comum";

const acharPele = (id: string) => PELES.find((p) => p.id === id)!;
const acharCabelo = (id: string) => CORES_DE_CABELO.find((c) => c.id === id)!;
const acharRoupa = (id: string) => ROUPAS.find((r) => r.id === id)!;

/** Uma combinação completa (para mostrar variedade nas seções). */
interface Combo extends EscolhasDoAvatar {
  pele: string;
  corDoCabelo: string;
}

const COMBOS: readonly Combo[] = [
  { pele: "p2", cabelo: "curto", corDoCabelo: "castanho", roupa: "moletom" },
  { pele: "p5", cabelo: "black", corDoCabelo: "preto", roupa: "camiseta" },
  { pele: "p1", cabelo: "longo", corDoCabelo: "ruivo", roupa: "listrada", acessorio: "oculos" },
  { pele: "p4", cabelo: "rabo", corDoCabelo: "preto", roupa: "uniforme" },
  { pele: "p3", cabelo: "cacheado", corDoCabelo: "castanho", roupa: "jaleco", acessorio: "fone" },
  { pele: "p6", cabelo: "coque", corDoCabelo: "rosa", roupa: "social" },
];

function avatar(pose: PoseDoAvatar, c: Combo, escala = 3) {
  const anim = POSES.find((p) => p.id === pose)!;
  const paleta = paletaDoAvatar(acharPele(c.pele), acharCabelo(c.corDoCabelo), acharRoupa(c.roupa));
  return sprite(quadrosDoAvatar(pose, c), paleta, anim.cicloMs, escala);
}

const figura = (arte: string, legenda: string, extra = "") =>
  `<figure class="pet">${arte}<figcaption>${esc(legenda)}</figcaption>${extra}</figure>`;

const item = (codigo: string, nome: string, nota: string, conteudo: string, largo = false) =>
  `<article class="item${largo ? " item-largo" : ""}"><header class="item-cab"><span class="codigo">${codigo}</span><h3>${esc(nome)}</h3>${caixinhaAprovar(codigo, nome)}</header>${nota ? `<p class="nota">${esc(nota)}</p>` : ""}<div class="palco-mini">${conteudo}</div></article>`;

const secao = (id: string, titulo: string, intro: string, itens: string) =>
  `<section id="${id}" aria-labelledby="t-${id}"><h2 id="t-${id}">${titulo}</h2><p class="intro">${intro}</p><div class="grade-itens">${itens}</div></section>`;

// ---------------------------------------------------------------------------
function secaoBase() {
  const arte = COMBOS.map((c) => figura(avatar("parado", c, 4), "")).join("");
  return secao(
    "base",
    "O bonequinho",
    "Estilo “chibi”: cabeça grande e rosto de frente (expressivo), corpo de lado como os pets, contorno escuro e poucas cores. Mesma escala e mesma grade dos pets. Aprovando aqui, o resto segue este jeito.",
    item(
      "B1",
      "Proporção chibi",
      `${tamanhoDoAvatar().largura} x ${tamanhoDoAvatar().altura} pixels (o gato tem 30 de largura).`,
      arte,
      true,
    ),
  );
}

function secaoPoses() {
  const itens = POSES.map((p) =>
    item(
      p.codigo,
      p.nome,
      `${p.descricao} (${p.quadros.length} quadros · ${(p.cicloMs / 1000).toFixed(1)} s)`,
      COMBOS.slice(0, 4)
        .map((c) => figura(avatar(p.id, c), ""))
        .join(""),
    ),
  ).join("");
  return secao(
    "poses",
    "Poses e movimentos",
    "Os mesmos desenhos servem para todas as combinações.",
    itens,
  );
}

function secaoPeles() {
  const itens = PELES.map((p, i) =>
    item(`T${i + 1}`, p.nome, "", figura(avatar("parado", { ...COMBOS[0]!, pele: p.id }), "")),
  ).join("");
  return secao(
    "peles",
    "Tons de pele",
    "Seis tons, do mais claro ao mais escuro, com sombra e bochecha combinando.",
    itens,
  );
}

function secaoCabelos() {
  const estilos = CABELOS.map((c, i) =>
    item(
      `H${i + 1}`,
      c.nome,
      "",
      ["castanho", "preto", "loiro"]
        .map((cor, k) =>
          figura(
            avatar("parado", {
              pele: ["p2", "p5", "p1"][k]!,
              cabelo: c.id,
              corDoCabelo: cor,
              roupa: "camiseta",
            }),
            "",
          ),
        )
        .join(""),
    ),
  ).join("");
  const cores = CORES_DE_CABELO.map((c, i) =>
    item(
      `K${i + 1}`,
      c.nome,
      "",
      figura(
        avatar("parado", { pele: "p3", cabelo: "longo", corDoCabelo: c.id, roupa: "moletom" }),
        "",
      ),
    ),
  ).join("");
  return (
    secao(
      "cabelos",
      "Cabelos",
      "Oito cortes (o comprido e o rabo de cavalo têm uma parte atrás do corpo).",
      estilos,
    ) + secao("cores-cabelo", "Cores de cabelo", "Naturais e algumas divertidas.", cores)
  );
}

function secaoRoupas() {
  const itens = ROUPAS.map((r, i) =>
    item(
      `R${i + 1}`,
      r.nome,
      "",
      ["parado", "sentado"]
        .map((pose) =>
          figura(
            avatar(pose as PoseDoAvatar, {
              ...COMBOS[i % COMBOS.length]!,
              roupa: r.id,
              acessorio: null,
            }),
            "",
          ),
        )
        .join(""),
    ),
  ).join("");
  return secao("roupas", "Roupas", "Cada roupa aparece em pé e sentada.", itens);
}

function secaoAcessorios() {
  const itens = ACESSORIOS_DO_AVATAR.map((a, i) =>
    item(
      `X${i + 1}`,
      a.nome,
      "",
      COMBOS.slice(0, 3)
        .map((c) => figura(avatar("parado", { ...c, acessorio: a.id }), ""))
        .join(""),
    ),
  ).join("");
  return secao("acessorios", "Acessórios", "Um por vez, na cabeça (como nos pets).", itens);
}

// ---------------------------------------------------------------------------
// Cena: o avatar sentado na mesa da Sala, com o pet deitado ao lado.
// ---------------------------------------------------------------------------
const ESCALA_DA_CENA = 3;

/** A sala (os mesmos retângulos do app) como imagem SVG. */
function salaEmSvg(extras: string): string {
  const rects = desenharSala()
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.cor}"${r.opacidade !== undefined ? ` fill-opacity="${r.opacidade}"` : ""}/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA_DA_SALA} ${ALTURA_DA_SALA}" shape-rendering="crispEdges" width="${LARGURA_DA_SALA * ESCALA_DA_CENA}" height="${ALTURA_DA_SALA * ESCALA_DA_CENA}">${rects}${extras}</svg>`;
}

/** Onde fica, na grade, o pixel mais à direita de uma letra (para alinhar a mão na mesa). */
function pontaDireita(q: readonly string[], letra: string): { x: number; y: number } {
  let melhor = { x: -1, y: -1 };
  q.forEach((linha, y) => {
    const x = linha.lastIndexOf(letra);
    if (x > melhor.x) melhor = { x, y };
  });
  return melhor;
}

function cenaDaMesa(c: Combo, pose: "sentado" | "lendo") {
  const MESA = { x: 54, tampo: 62 };
  const [primeiro] = quadrosDoAvatar(pose, c);
  const mao = pontaDireita(primeiro!, "s");
  const ax = MESA.x + 2 - mao.x;
  const ay = MESA.tampo - 1 - mao.y;
  // Cadeira: assento logo abaixo das coxas, encosto atrás das costas, pés no chão.
  const coxa = primeiro!.findIndex((l) => l.includes("t"));
  const assento = ay + coxa + 2;
  const cadeira = [
    `<rect x="${ax + 3}" y="${assento}" width="11" height="2" fill="#6b4a2f"/>`,
    `<rect x="${ax + 2}" y="${assento - 12}" width="2" height="14" fill="#5a3d26"/>`,
    `<rect x="${ax + 3}" y="${assento + 2}" width="2" height="${CHAO_Y - assento - 2}" fill="#5a3d26"/>`,
    `<rect x="${ax + 12}" y="${assento + 2}" width="2" height="${CHAO_Y - assento - 2}" fill="#5a3d26"/>`,
  ].join("");
  const { altura: altPet } = tamanhoDoPet("gato");
  const px = 110;
  const py = CHAO_Y - (altPet - 1);
  const u = (n: number) => `${n * ESCALA_DA_CENA}px`;
  const anim = POSES.find((p) => p.id === pose)!;
  const paleta = paletaDoAvatar(acharPele(c.pele), acharCabelo(c.corDoCabelo), acharRoupa(c.roupa));
  const pet = CATALOGO.gato.variacoes[0]!;
  return `<div class="cena-sala" style="width:${u(LARGURA_DA_SALA)};height:${u(ALTURA_DA_SALA)}">
    <img alt="" src="data:image/svg+xml;utf8,${encodeURIComponent(salaEmSvg(cadeira))}" width="${LARGURA_DA_SALA * ESCALA_DA_CENA}" height="${ALTURA_DA_SALA * ESCALA_DA_CENA}">
    <span class="no-palco" style="left:${u(px)};top:${u(py)}">${sprite(quadrosDoPet("gato", "descansando"), paletaDoPet(pet), 1600, ESCALA_DA_CENA)}</span>
    <span class="no-palco" style="left:${u(ax)};top:${u(ay)}">${sprite(quadrosDoAvatar(pose, c), paleta, anim.cicloMs, ESCALA_DA_CENA)}</span>
  </div>`;
}

function secaoCena() {
  return secao(
    "cena",
    "Na Sala",
    "O avatar estuda na mesa da biblioteca (numa cadeira alta: os pezinhos balançam) e o pet faz companhia. Mais tarde, nas salas compartilhadas, cada pessoa aparece assim na sua mesinha.",
    item(
      "CENA1",
      "Estudando na mesa",
      "Escrevendo no caderno; o pet deitado ao lado.",
      cenaDaMesa(COMBOS[0]!, "sentado"),
      true,
    ) +
      item("CENA2", "Lendo na mesa", "Segurando um livro.", cenaDaMesa(COMBOS[2]!, "lendo"), true),
  );
}

const CSS_DO_AVATAR = `
.cena-sala { position: relative; max-width: 100%; overflow: hidden; border-radius: 4px; }
.cena-sala img { display: block; image-rendering: pixelated; }
.no-palco { position: absolute; line-height: 0; }
@media (max-width: 520px) { .cena-sala { transform: scale(.7); transform-origin: top left; margin-bottom: -90px; } }
`;

test("gera o quadro do avatar", () => {
  const html = `<title>Avatar Pixel do Athenas</title>
<meta name="claude:viewport-fit-sides" content="cover">
${FONTES}
<style>${CSS}${CSS_DO_AVATAR}</style>
<main class="pagina">
  <header class="topo">
    <span class="olho">Athenas · Sala pixel · avatar · conceitos para aprovar</span>
    <h1>Avatar Pixel do Athenas</h1>
    <p class="intro">Seu bonequinho na Sala, no mesmo estilo dos pets e montado em camadas (cabelo, pele, roupa, acessório). Tudo foi desenhado pelo motor do app: o que você aprovar entra pronto. Marque <b>Aprovo</b> e copie o resumo para o chat; o que não marcar, eu ajusto.</p>
    <div class="como"><span><b>B</b> bonequinho</span><span><b>P</b> poses</span><span><b>T</b> pele</span><span><b>H</b> cabelo</span><span><b>K</b> cor do cabelo</span><span><b>R</b> roupa</span><span><b>X</b> acessório</span><span><b>CENA</b> na sala</span></div>
    <nav class="atalhos" aria-label="Seções"><a href="#base">Bonequinho</a><a href="#cena">Na Sala</a><a href="#poses">Poses</a><a href="#peles">Pele</a><a href="#cabelos">Cabelos</a><a href="#cores-cabelo">Cores</a><a href="#roupas">Roupas</a><a href="#acessorios">Acessórios</a></nav>
  </header>
  ${secaoBase()}
  ${secaoCena()}
  ${secaoPoses()}
  ${secaoPeles()}
  ${secaoCabelos()}
  ${secaoRoupas()}
  ${secaoAcessorios()}
</main>
${BARRA_DO_RESUMO}
<script>${jsDoQuadro("athenas-quadro-avatar-r1")}</script>`;
  writeFileSync(process.env.QUADRO_AVATAR_SAIDA ?? "docs/pesquisa/quadro-avatar.html", html);
});
