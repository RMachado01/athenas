/**
 * Gera o QUADRO DE CONCEITOS do AVATAR RPG (rodada 2): bonequinho detalhado que "veste" itens
 * por parte (cabeça, rosto, blusa, pernas, pés, costas, mão), poses, cores e a cena na mesa da
 * Sala com o pet. Desenhado pelo motor real do app. Rodar:
 *   QUADRO_AVATAR_SAIDA=<arquivo.html> ./node_modules/.bin/vitest run \
 *     --config scripts/vitest.gerador.config.ts scripts/quadro-avatar.gerar.ts
 */
import { writeFileSync } from "node:fs";
import { test } from "vitest";
import {
  OLHOS_CORES,
  PELES,
  PERNAS_EM,
  POSES,
  type PoseDoAvatar,
} from "@/features/pixel/avatar/corpo";
import {
  CABELOS,
  CORES_DE_CABELO,
  ITENS,
  ROTULO_DA_PARTE,
  type Parte,
} from "@/features/pixel/avatar/itens";
import {
  naGrade,
  paletaDoAvatar,
  quadrosDoAvatar,
  tamanhoDoAvatar,
  type EscolhasDoAvatar,
} from "@/features/pixel/avatar/montar";
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

const BASE: EscolhasDoAvatar = {
  pele: "p2",
  olhos: "castanho",
  cabelo: "curto",
  corDoCabelo: "castanho",
  equipados: {},
};

function avatar(pose: PoseDoAvatar, e: EscolhasDoAvatar, escala = 3) {
  const anim = POSES.find((p) => p.id === pose)!;
  return sprite(quadrosDoAvatar(pose, e), paletaDoAvatar(e), anim.cicloMs, escala);
}

const figura = (arte: string, legenda = "") =>
  `<figure class="pet">${arte}${legenda ? `<figcaption>${esc(legenda)}</figcaption>` : ""}</figure>`;

const item = (codigo: string, nome: string, nota: string, conteudo: string, largo = false) =>
  `<article class="item${largo ? " item-largo" : ""}"><header class="item-cab"><span class="codigo">${codigo}</span><h3>${esc(nome)}</h3>${caixinhaAprovar(codigo, nome)}</header>${nota ? `<p class="nota">${esc(nota)}</p>` : ""}<div class="palco-mini">${conteudo}</div></article>`;

const secao = (id: string, titulo: string, intro: string, itens: string) =>
  `<section id="${id}" aria-labelledby="t-${id}"><h2 id="t-${id}">${titulo}</h2><p class="intro">${intro}</p><div class="grade-itens">${itens}</div></section>`;

// ---------------------------------------------------------------------------
// 1. Peça por peça (o "boneco de papel" sendo vestido)
// ---------------------------------------------------------------------------
function secaoPecaPorPeca() {
  const passos: [string, EscolhasDoAvatar][] = [];
  let e: EscolhasDoAvatar = {
    ...BASE,
    cabelo: "longo",
    corDoCabelo: "ruivo",
    pele: "p1",
    olhos: "verde",
  };
  passos.push(["Base", e]);
  const vestir: [Parte, string, string][] = [
    ["blusa", "tunica", "+ blusa"],
    ["pernas", "aventureiro", "+ pernas"],
    ["pes", "botas", "+ pés"],
    ["costas", "capa", "+ costas"],
    ["mao", "varinha", "+ mão"],
    ["rosto", "oculos", "+ rosto"],
    ["cabeca", "mago", "+ cabeça"],
  ];
  for (const [parte, id, rotulo] of vestir) {
    e = { ...e, equipados: { ...e.equipados, [parte]: id } };
    passos.push([rotulo, e]);
  }
  const { largura, altura } = tamanhoDoAvatar();
  return secao(
    "pecas",
    "Peça por peça",
    "O avatar é um boneco que você veste: cada parte do corpo recebe um item, como num RPG. Trocar uma parte não mexe nas outras.",
    item(
      "B2",
      "Estilo RPG detalhado",
      `Luz e sombra em 3 tons, olhos com íris e brilho, rosto em 3/4. Tela de ${largura} x ${altura} pixels (o avatar da rodada 1 tinha 17 x 27).`,
      passos.map(([rotulo, x]) => figura(avatar("parado", x, 4), rotulo)).join(""),
      true,
    ),
  );
}

// ---------------------------------------------------------------------------
// 2. Conjuntos prontos (atalhos divertidos)
// ---------------------------------------------------------------------------
const CONJUNTOS: { codigo: string; nome: string; nota: string; e: EscolhasDoAvatar }[] = [
  {
    codigo: "J1",
    nome: "Mago estudioso",
    nota: "Chapéu de mago, túnica, capa e varinha.",
    e: {
      ...BASE,
      cabelo: "longo",
      corDoCabelo: "grisalho",
      pele: "p3",
      equipados: { cabeca: "mago", blusa: "tunica", costas: "capa", mao: "varinha", pes: "botas" },
    },
  },
  {
    codigo: "J2",
    nome: "Cientista",
    nota: "Jaleco, óculos redondos e café.",
    e: {
      ...BASE,
      cabelo: "coque",
      corDoCabelo: "preto",
      pele: "p5",
      olhos: "preto",
      equipados: {
        blusa: "jaleco",
        rosto: "oculos",
        mao: "caneca",
        pernas: "calca",
        pes: "sapatilha",
      },
    },
  },
  {
    codigo: "J3",
    nome: "Aventureiro",
    nota: "Boné, mochila, calça de aventureiro e lápis gigante.",
    e: {
      ...BASE,
      cabelo: "curto",
      corDoCabelo: "loiro",
      pele: "p1",
      olhos: "azul",
      equipados: {
        cabeca: "bone",
        costas: "mochila",
        pernas: "aventureiro",
        pes: "botas",
        mao: "lapis",
      },
    },
  },
  {
    codigo: "J4",
    nome: "Cavaleiro dos livros",
    nota: "Armadura, coroa de louros, capa e livro.",
    e: {
      ...BASE,
      cabelo: "cacheado",
      corDoCabelo: "preto",
      pele: "p6",
      olhos: "mel",
      equipados: {
        blusa: "armadura",
        cabeca: "louros",
        costas: "capa",
        mao: "livro",
        pes: "botas",
      },
    },
  },
  {
    codigo: "J5",
    nome: "Modo confortável",
    nota: "Moletom, gorro, bermuda e caneca.",
    e: {
      ...BASE,
      cabelo: "franja",
      corDoCabelo: "rosa",
      pele: "p4",
      equipados: { blusa: "moletom", cabeca: "gorro", pernas: "bermuda", mao: "caneca" },
    },
  },
  {
    codigo: "J6",
    nome: "Fada das provas",
    nota: "Asas de borboleta, saia e varinha.",
    e: {
      ...BASE,
      cabelo: "rabo",
      corDoCabelo: "azul",
      pele: "p2",
      olhos: "verde",
      equipados: {
        costas: "asas",
        pernas: "saia",
        mao: "varinha",
        blusa: "camiseta",
        pes: "sapatilha",
      },
    },
  },
];

function secaoConjuntos() {
  return secao(
    "conjuntos",
    "Conjuntos prontos",
    "Atalhos para vestir de uma vez. A pessoa pode partir de um e trocar o que quiser.",
    CONJUNTOS.map((c) =>
      item(
        c.codigo,
        c.nome,
        c.nota,
        ["parado", "andando", "acenando"]
          .map((p) => figura(avatar(p as PoseDoAvatar, c.e)))
          .join(""),
      ),
    ).join(""),
  );
}

// ---------------------------------------------------------------------------
// 3. Itens de cada parte
// ---------------------------------------------------------------------------
const PREFIXO: Record<Parte, string> = {
  cabeca: "CA",
  rosto: "RO",
  blusa: "BL",
  pernas: "PE",
  pes: "PS",
  costas: "CO",
  mao: "MA",
};

function secaoItens() {
  const partes: Parte[] = ["cabeca", "rosto", "blusa", "pernas", "pes", "costas", "mao"];
  const modelos: EscolhasDoAvatar[] = [
    BASE,
    { ...BASE, pele: "p5", cabelo: "cacheado", corDoCabelo: "preto", olhos: "preto" },
    { ...BASE, pele: "p1", cabelo: "longo", corDoCabelo: "loiro", olhos: "azul" },
  ];
  return partes
    .map((parte) => {
      const itens = ITENS.filter((i) => i.parte === parte);
      const html = itens
        .map((it, k) => {
          // Item da mão aparece também na pose em que é usado (escrevendo/lendo).
          const poses: PoseDoAvatar[] =
            parte === "mao" ? ["parado", it.id === "livro" ? "lendo" : "sentado"] : ["parado"];
          const arte = modelos
            .slice(0, parte === "mao" ? 2 : 3)
            .flatMap((m) =>
              poses.map((p) => figura(avatar(p, { ...m, equipados: { [parte]: it.id } }))),
            )
            .join("");
          return item(`${PREFIXO[parte]}${k + 1}`, it.nome, "", arte);
        })
        .join("");
      return secao(`parte-${parte}`, ROTULO_DA_PARTE[parte], textoDaParte(parte), html);
    })
    .join("");
}

function textoDaParte(parte: Parte): string {
  return {
    cabeca: "Chapéus e enfeites. Ficam por cima do cabelo.",
    rosto: "Óculos e detalhes no rosto. Os óculos escuros cobrem os olhos de propósito.",
    blusa: "Muda a cor e o desenho do tronco e dos braços (a camiseta mostra o antebraço).",
    pernas: "Calças, bermuda e saia (bermuda e saia mostram a perna).",
    pes: "Sapatos; as botas sobem pela canela.",
    costas: "Mochila, capa e asas, atrás do corpo.",
    mao: "Algo para segurar: aparece na mão em qualquer pose (até escrevendo e lendo).",
  }[parte];
}

// ---------------------------------------------------------------------------
// 4. Poses, pele, olhos, cabelos
// ---------------------------------------------------------------------------
function secaoPoses() {
  return secao(
    "poses",
    "Poses",
    "Os mesmos desenhos servem para qualquer roupa e item.",
    POSES.map((p) =>
      item(
        p.codigo,
        p.nome,
        `${p.descricao} (${p.quadros.length} quadros · ${(p.cicloMs / 1000).toFixed(1)} s)`,
        CONJUNTOS.slice(0, 3)
          .map((c) => figura(avatar(p.id, c.e)))
          .join(""),
      ),
    ).join(""),
  );
}

function secaoAparencia() {
  const peles = PELES.map((p, i) =>
    item(`T${i + 1}`, p.nome, "", figura(avatar("parado", { ...BASE, pele: p.id }))),
  ).join("");
  const olhos = OLHOS_CORES.map((o, i) =>
    item(
      `O${i + 1}`,
      `Olhos ${o.nome.toLowerCase()}`,
      "",
      figura(avatar("parado", { ...BASE, olhos: o.id }, 5)),
    ),
  ).join("");
  const cabelos = CABELOS.map((c, i) =>
    item(
      `H${i + 1}`,
      c.nome,
      "",
      [
        ["castanho", "p2"],
        ["preto", "p5"],
        ["loiro", "p1"],
      ]
        .map(([cor, pele]) =>
          figura(avatar("parado", { ...BASE, cabelo: c.id, corDoCabelo: cor!, pele: pele! })),
        )
        .join(""),
    ),
  ).join("");
  const cores = CORES_DE_CABELO.map((c, i) =>
    item(
      `K${i + 1}`,
      c.nome,
      "",
      figura(avatar("parado", { ...BASE, cabelo: "longo", corDoCabelo: c.id, pele: "p3" })),
    ),
  ).join("");
  return (
    secao("peles", "Tons de pele", "Seis tons, cada um com luz, base, sombra e bochecha.", peles) +
    secao("olhos", "Cor dos olhos", "A íris muda de cor; o brilho fica sempre.", olhos) +
    secao(
      "cabelos",
      "Cabelos",
      "Com luz e sombra; comprido e rabo de cavalo passam por trás do corpo.",
      cabelos,
    ) +
    secao("cores-cabelo", "Cores de cabelo", "Naturais e divertidas.", cores)
  );
}

// ---------------------------------------------------------------------------
// 5. Na Sala: sentado na mesa, com o pet ao lado
// ---------------------------------------------------------------------------
const ESCALA_DA_CENA = 3;

function salaEmSvg(extras: string): string {
  const rects = desenharSala()
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.cor}"${r.opacidade !== undefined ? ` fill-opacity="${r.opacidade}"` : ""}/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA_DA_SALA} ${ALTURA_DA_SALA}" shape-rendering="crispEdges">${rects}${extras}</svg>`;
}

function cenaDaMesa(e: EscolhasDoAvatar, pose: "sentado" | "lendo") {
  const MESA = { x: 54, tampo: 62 };
  const quadro = POSES.find((p) => p.id === pose)!.quadros[0]!;
  const mao = naGrade(quadro.maoEm);
  const coxa = naGrade(PERNAS_EM);
  // Escrevendo: a mão apoia no tampo, na beirada da mesa. Lendo: o avatar fica perto da mesa.
  const ax = pose === "sentado" ? MESA.x + 3 - mao.x : MESA.x - 4 - mao.x;
  const ay = pose === "sentado" ? MESA.tampo - 1 - mao.y : MESA.tampo + 1 - coxa.y;
  const assento = ay + coxa.y + 2;
  const cadeiraX = ax + coxa.x;
  const cadeira = [
    `<rect x="${cadeiraX}" y="${assento}" width="12" height="2" fill="#6b4a2f"/>`,
    `<rect x="${cadeiraX - 1}" y="${assento - 14}" width="2" height="16" fill="#5a3d26"/>`,
    `<rect x="${cadeiraX}" y="${assento + 2}" width="2" height="${CHAO_Y - assento - 2}" fill="#5a3d26"/>`,
    `<rect x="${cadeiraX + 10}" y="${assento + 2}" width="2" height="${CHAO_Y - assento - 2}" fill="#5a3d26"/>`,
  ].join("");
  const { altura: altPet } = tamanhoDoPet("gato");
  const u = (n: number) => `${n * ESCALA_DA_CENA}px`;
  const anim = POSES.find((p) => p.id === pose)!;
  const gato = CATALOGO.gato.variacoes[0]!;
  return `<div class="cena-sala" style="width:${u(LARGURA_DA_SALA)};height:${u(ALTURA_DA_SALA)}">
    <img alt="" src="data:image/svg+xml;utf8,${encodeURIComponent(salaEmSvg(cadeira))}" width="${LARGURA_DA_SALA * ESCALA_DA_CENA}" height="${ALTURA_DA_SALA * ESCALA_DA_CENA}">
    <span class="no-palco" style="left:${u(112)};top:${u(CHAO_Y - (altPet - 1))}">${sprite(quadrosDoPet("gato", "descansando"), paletaDoPet(gato), 1600, ESCALA_DA_CENA)}</span>
    <span class="no-palco" style="left:${u(ax)};top:${u(ay)}">${sprite(quadrosDoAvatar(pose, e), paletaDoAvatar(e), anim.cicloMs, ESCALA_DA_CENA)}</span>
  </div>`;
}

function secaoCena() {
  return secao(
    "cena",
    "Na Sala",
    "Sentado na mesa da biblioteca (cadeira alta: os pezinhos balançam) com o pet ao lado. Nas salas compartilhadas, mais tarde, cada pessoa aparece assim, com o que estiver vestindo.",
    item(
      "CENA1",
      "Escrevendo",
      "Com o lápis gigante na mão.",
      cenaDaMesa({ ...CONJUNTOS[2]!.e }, "sentado"),
      true,
    ) +
      item(
        "CENA2",
        "Lendo",
        "Com o livro na frente do peito.",
        cenaDaMesa(
          { ...CONJUNTOS[1]!.e, equipados: { ...CONJUNTOS[1]!.e.equipados, mao: "livro" } },
          "lendo",
        ),
        true,
      ),
  );
}

// ---------------------------------------------------------------------------
// 6. Ideia: ganhar itens estudando
// ---------------------------------------------------------------------------
function secaoIdeia() {
  const exemplos: [string, string][] = [
    ["louros", "Coroa de louros: bater a meta 7 dias seguidos"],
    ["mago", "Chapéu de mago: 10 horas de foco"],
    ["capa", "Capa de herói: 30 tarefas concluídas"],
    ["varinha", "Varinha: 100 flashcards revisados"],
  ];
  const arte = exemplos
    .map(([id, texto]) => {
      const it = ITENS.find((i) => i.id === id)!;
      return figura(avatar("parado", { ...BASE, equipados: { [it.parte]: id } }), texto);
    })
    .join("");
  return secao(
    "ideia",
    "Ideia: itens que você ganha estudando",
    "Sugestão para aprovar à parte: os itens básicos ficam liberados desde o começo, e alguns especiais são conquistas (o app já conta foco, tarefas e flashcards). Sem compra e sem moeda.",
    item("G1", "Itens especiais como conquista", "Os números são só exemplo.", arte, true),
  );
}

const CSS_DO_AVATAR = `
.cena-sala { position: relative; max-width: 100%; overflow: hidden; border-radius: 4px; }
.cena-sala img { display: block; image-rendering: pixelated; }
.no-palco { position: absolute; line-height: 0; }
@media (max-width: 520px) { .cena-sala { transform: scale(.7); transform-origin: top left; margin-bottom: -90px; } }
`;

test("gera o quadro do avatar", () => {
  const html = `<title>Avatar RPG do Athenas</title>
<meta name="claude:viewport-fit-sides" content="cover">
${FONTES}
<style>${CSS}${CSS_DO_AVATAR}</style>
<main class="pagina">
  <header class="topo">
    <span class="olho">Athenas · Sala pixel · avatar · rodada 2 (estilo RPG)</span>
    <h1>Avatar RPG do Athenas</h1>
    <p class="intro">Agora mais detalhado e com <b>equipamento por partes</b>, como nos avatares de RPG: cabeça, rosto, blusa, pernas, pés, costas e mão. Visto de lado como os pets (referência de estilo: MapleStory), para sentar na mesa da Sala. Marque <b>Aprovo</b> e copie o resumo para o chat; o que não marcar, eu ajusto.</p>
    <div class="como"><span><b>B</b> estilo</span><span><b>J</b> conjuntos</span><span><b>CA RO BL PE PS CO MA</b> itens por parte</span><span><b>P</b> poses</span><span><b>T O H K</b> pele, olhos, cabelo, cor</span><span><b>CENA</b> na sala</span><span><b>G</b> ideia</span></div>
    <nav class="atalhos" aria-label="Seções"><a href="#pecas">Peça por peça</a><a href="#cena">Na Sala</a><a href="#conjuntos">Conjuntos</a><a href="#parte-cabeca">Itens</a><a href="#poses">Poses</a><a href="#peles">Aparência</a><a href="#ideia">Ideia</a></nav>
  </header>
  ${secaoPecaPorPeca()}
  ${secaoCena()}
  ${secaoConjuntos()}
  ${secaoItens()}
  ${secaoPoses()}
  ${secaoAparencia()}
  ${secaoIdeia()}
</main>
${BARRA_DO_RESUMO}
<script>${jsDoQuadro("athenas-quadro-avatar-r2")}</script>`;
  writeFileSync(process.env.QUADRO_AVATAR_SAIDA ?? "docs/pesquisa/quadro-avatar.html", html);
});
