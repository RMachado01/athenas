/**
 * Gera o QUADRO DE CONCEITOS dos pets pixel (página HTML para o Renan aprovar): movimentos,
 * cores, acessórios, reações e cenas de ação, desenhados pelo motor real do app (o que for
 * aprovado já está pronto para entrar). Rodar:
 *   ./node_modules/.bin/vitest run --config scripts/vitest.gerador.config.ts
 * Saída: o caminho em QUADRO_PIXEL_SAIDA (ou docs/pesquisa/quadro-pixel.html).
 */
import { writeFileSync } from "node:fs";
import { test } from "vitest";
import { ANIMACOES, quadrosDaAnimacao } from "@/features/pixel/pets/animacoes";
import { ACESSORIOS, EMOTES, OBJETOS } from "@/features/pixel/pets/pecas-extras";
import { CORACAO, PALETA_DO_CORACAO, PALETA_DO_ZZ, ZZ } from "@/features/pixel/extras";
import { CSS, comContorno, esc, jsDoQuadro, sprite } from "./quadro-comum";
import { CATALOGO } from "@/features/pixel/pets/catalogo";
import { ESPECIES, type Especie } from "@/features/pixel/pets/especies";

const paletaPadrao = (e: Especie) => CATALOGO[e].variacoes[0]!.paleta;
const nomeDe = (e: Especie) => CATALOGO[e].nome;

/**
 * Rodada 2: o que o Renan JÁ aprovou na 1ª rodada ganha um selo (sem caixinha); só o que ficou
 * de fora (M1, M2, M3, M5 — as patas "descolavam") volta para aprovação.
 */
const JA_APROVADOS = new Set([
  "M4",
  "M6",
  "M7",
  "M8",
  "M9",
  "M10",
  "C-gato-tigrado",
  "C-gato-frajola",
  "C-gato-siames",
  "C-capivara-ruiva",
  "C-macaco-mico",
  "C-gato_banana-madura",
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "E7",
  "E8",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
]);

function caixinha(codigo: string, rotulo: string) {
  if (JA_APROVADOS.has(codigo)) return `<span class="aprovado">Aprovado</span>`;
  return `<label class="aprovar"><input type="checkbox" id="ok-${codigo}" data-codigo="${codigo}" data-rotulo="${esc(rotulo)}"><span>Aprovo</span></label>`;
}

// ---------------------------------------------------------------------------
function secaoMovimentos() {
  // Os que voltam para aprovação vêm primeiro.
  const ordem = [...ANIMACOES].sort(
    (a, b) => Number(JA_APROVADOS.has(a.codigo)) - Number(JA_APROVADOS.has(b.codigo)),
  );
  const linhas = ordem
    .map((a) => {
      const pets = ESPECIES.map(
        (e) =>
          `<figure class="pet">${sprite(quadrosDaAnimacao(e, a.id), paletaPadrao(e), a.cicloMs)}<figcaption>${nomeDe(e)}</figcaption></figure>`,
      ).join("");
      return `<article class="item">
      <header class="item-cab"><span class="codigo">${a.codigo}</span><h3>${esc(a.nome)}</h3>${caixinha(a.codigo, a.nome)}</header>
      <p class="nota">${esc(a.descricao)} <span class="dado">${a.quadros.length} quadros · ${(a.cicloMs / 1000).toFixed(1)} s</span></p>
      <div class="palco-mini">${pets}</div>
    </article>`;
    })
    .join("");
  return `<section id="movimentos" aria-labelledby="t-mov"><h2 id="t-mov">Movimentos</h2>
    <p class="intro"><b>O que mudou:</b> as patas agora são mais grossas e curtas e nascem <i>por dentro</i> da barriga, sempre embaixo dela (antes a pata da frente e a de trás ficavam para fora, e no gato-banana as duas). No andar e no correr o corpo não dá mais o "quique" que abria uma faixa escura entre corpo e patas: o passo é o cruzar das patas e um aceno da cabeça. As patas novas valem para todos os movimentos, então os já aprovados também aparecem aqui para você comparar.</p>
    <div class="grade-itens">${linhas}</div></section>`;
}

function secaoCores() {
  const blocos = ESPECIES.map((e) => {
    // As 4 primeiras cores de cada espécie são as lisas de antes; as seguintes, as pelagens novas.
    const atuais = CATALOGO[e].variacoes
      .slice(0, 4)
      .map(
        (v) =>
          `<figure class="pet">${sprite(quadrosDaAnimacao(e, "piscar"), v.paleta, 2400)}<figcaption>${esc(v.nome)}<span class="selo">atual</span></figcaption></figure>`,
      )
      .join("");
    const novas = CATALOGO[e].variacoes
      .slice(4)
      .map((c) => {
        const codigo = `C-${e}-${c.id}`;
        return `<figure class="pet nova">${sprite(quadrosDaAnimacao(e, "piscar", { padrao: c.padrao }), c.paleta, 2400)}<figcaption>${esc(c.nome)}<span class="selo selo-nova">nova</span></figcaption>${caixinha(codigo, `${nomeDe(e)} ${c.nome}`)}</figure>`;
      })
      .join("");
    return `<article class="item item-largo"><header class="item-cab"><h3>${nomeDe(e)}</h3></header><div class="palco-mini">${atuais}${novas}</div></article>`;
  }).join("");
  return `<section id="cores" aria-labelledby="t-cor"><h2 id="t-cor">Cores e pelagens</h2>
    <p class="intro">As cores atuais já estão no app. As marcadas como <b>nova</b> são propostas, algumas com padrão de pelagem (listras, manchas, pontas escuras). Pets e acessórios continuam coloridos no tema preto e branco.</p>
    <div class="grade-itens">${blocos}</div></section>`;
}

function secaoAcessorios() {
  const itens = ACESSORIOS.map((a, i) => {
    const codigo = `A${i + 1}`;
    const pets = ESPECIES.map(
      (e) =>
        `<figure class="pet">${sprite(quadrosDaAnimacao(e, "piscar", { acessorio: a.id }), paletaPadrao(e), 2400)}<figcaption>${nomeDe(e)}</figcaption></figure>`,
    ).join("");
    return `<article class="item"><header class="item-cab"><span class="codigo">${codigo}</span><h3>${esc(a.nome)}</h3>${caixinha(codigo, a.nome)}</header><div class="palco-mini">${pets}</div></article>`;
  }).join("");
  return `<section id="acessorios" aria-labelledby="t-ace"><h2 id="t-ace">Acessórios</h2>
    <p class="intro">Um item por vez, encaixado na cabeça de cada pet. Poderiam ser ganhos com o estudo (ex.: o chapéu de formatura ao bater uma meta).</p>
    <div class="grade-itens">${itens}</div></section>`;
}

function secaoReacoes() {
  const itens = EMOTES.map((em, i) => {
    const codigo = `E${i + 1}`;
    return `<article class="item item-emote"><div class="emote-arte">${sprite([comContorno(em.grade)], {}, 1000, 4, " flutua")}</div>
      <div class="emote-texto"><header class="item-cab"><span class="codigo">${codigo}</span><h3>${esc(em.nome)}</h3></header><p class="nota">${esc(em.quando)}</p>${caixinha(codigo, em.nome)}</div></article>`;
  }).join("");
  return `<section id="reacoes" aria-labelledby="t-rea"><h2 id="t-rea">Reações (balõezinhos)</h2>
    <p class="intro">Aparecem sobre o pet por alguns segundos. O texto diz quando cada um apareceria; isso também está para aprovar.</p>
    <div class="grade-itens grade-emotes">${itens}</div></section>`;
}

function cena(conteudo: string) {
  return `<div class="cena"><div class="chao"></div>${conteudo}</div>`;
}

function secaoAcoes() {
  const gato = paletaPadrao("gato");
  const capi = paletaPadrao("capivara");
  const macaco = paletaPadrao("macaco");
  const banana = paletaPadrao("gato_banana");
  const emote = (id: string) =>
    sprite([comContorno(EMOTES.find((x) => x.id === id)!.grade)], {}, 1000, 3, " flutua");
  const acoes: { codigo: string; nome: string; texto: string; arte: string }[] = [
    {
      codigo: "S1",
      nome: "Carinho",
      texto: "Tocar no pet: pulinho e coração. (Já existe hoje; aqui com o pulo novo.)",
      arte: cena(
        `<span class="ator" style="left:38%">${sprite(quadrosDaAnimacao("gato", "pulo"), gato, 700)}</span><span class="balao" style="left:52%">${sprite([CORACAO], PALETA_DO_CORACAO, 1000, 3, " flutua")}</span>`,
      ),
    },
    {
      codigo: "S2",
      nome: "Petisco",
      texto:
        'Botão "Dar petisco": aparece a tigela e o pet come. Pode ser 1 por dia, liberado ao estudar.',
      arte: cena(
        `<span class="ator" style="left:30%">${sprite(quadrosDaAnimacao("capivara", "comer"), capi, 600)}</span><span class="objeto" style="left:66%">${sprite([comContorno(OBJETOS.tigela)], {}, 1000)}</span>`,
      ),
    },
    {
      codigo: "S3",
      nome: "Brincar de bolinha",
      texto: 'Botão "Jogar bolinha": a bolinha quica pela sala e o pet corre atrás.',
      arte: cena(
        `<span class="ator corre" style="left:18%">${sprite(quadrosDaAnimacao("macaco", "correr"), macaco, 360)}</span><span class="objeto quica" style="left:70%">${sprite([comContorno(OBJETOS.bolinha)], {}, 1000)}</span>`,
      ),
    },
    {
      codigo: "S4",
      nome: "Estudar junto",
      texto: "Durante um Pomodoro o pet põe os óculos, deita perto do livro e cantarola.",
      arte: cena(
        `<span class="ator" style="left:24%">${sprite(quadrosDaAnimacao("gato", "descansar", { acessorio: "oculos" }), gato, 1600)}</span><span class="objeto" style="left:66%">${sprite([comContorno(OBJETOS.livro)], {}, 1000)}</span><span class="balao" style="left:46%">${emote("musica")}</span>`,
      ),
    },
    {
      codigo: "S5",
      nome: "Comemorar",
      texto:
        "Ao concluir um Pomodoro ou bater a meta: pulinhos e estrelas (com chapéu de formatura na meta).",
      arte: cena(
        `<span class="ator" style="left:36%">${sprite(quadrosDaAnimacao("gato_banana", "pulo", { acessorio: "chapeu" }), banana, 700)}</span><span class="balao" style="left:56%">${emote("estrela")}</span>`,
      ),
    },
    {
      codigo: "S6",
      nome: "Cochilo quando você para",
      texto:
        "Sem estudar há um tempo, o pet boceja e dorme. Volta a acordar quando você abre o Foco.",
      arte: cena(
        `<span class="ator" style="left:34%">${sprite(quadrosDaAnimacao("gato", "dormir"), gato, 2600)}</span><span class="balao" style="left:52%">${sprite([ZZ], PALETA_DO_ZZ, 1000, 3, " flutua")}</span>`,
      ),
    },
  ];
  const itens = acoes
    .map(
      (a) =>
        `<article class="item"><header class="item-cab"><span class="codigo">${a.codigo}</span><h3>${esc(a.nome)}</h3>${caixinha(a.codigo, a.nome)}</header><p class="nota">${esc(a.texto)}</p>${a.arte}</article>`,
    )
    .join("");
  return `<section id="acoes" aria-labelledby="t-aco"><h2 id="t-aco">Ações e ligação com o estudo</h2>
    <p class="intro">O que a pessoa faz com o pet e como o pet reage ao estudo dela.</p>
    <div class="grade-itens">${itens}</div></section>`;
}

const REFERENCIAS: { titulo: string; url: string; nota: string }[] = [
  {
    titulo: "Neko (software), Wikipédia",
    url: "https://en.wikipedia.org/wiki/Neko_(software)",
    nota: "O gato que acorda, corre, para, coça e dorme: poucos estados, muita personalidade.",
  },
  {
    titulo: "Neko em CircuitPython (Adafruit)",
    url: "https://learn.adafruit.com/circuitpython-neko-kitty-with-displayio/code-walk-through",
    nota: "Estados de arranhar, dormir e tempos mínimos em cada um.",
  },
  {
    titulo: "Pixel Avatar (Tesserae)",
    url: "https://docs.curiosity.ai/tesserae/components/pixel-avatar",
    nota: "Lista de animações: parado, mover, sentar, espreguiçar, susto, dormir, pular.",
  },
  {
    titulo: "Playful Pet (Framer)",
    url: "https://www.framer.com/community/marketplace/components/playful-pet/",
    nota: "Ociosidade com dormir, se limpar e coçar; humor do pet.",
  },
  {
    titulo: "Desktop pet com máquina de estados (GitHub)",
    url: "https://github.com/Shirros/desktop-pet",
    nota: "Cada estado com chances de passar para o próximo (ex.: cansado → dormindo).",
  },
  {
    titulo: "Pet do chat do VS Code",
    url: "https://code.visualstudio.com/docs/agents/reference/chat-pet",
    nota: "O pet reage ao que você faz (bate palmas, dorme após 20 s parado).",
  },
  {
    titulo: "Pixel Pets para Obsidian",
    url: "https://forum.obsidian.md/t/virtual-pets-for-obsidian-like-vscode-pets/104567",
    nota: "Jogar bolinha para o pet buscar dentro de um app de notas.",
  },
  {
    titulo: "Emotes Pack da Kenney (CC0)",
    url: "https://opengameart.org/content/emotes-pack",
    nota: "Referência de balõezinhos de reação em pixel.",
  },
  {
    titulo: "Animated Emote Bubbles (CC0)",
    url: "https://opengameart.org/content/animated-emote-bubbles",
    nota: "Balões 16x16 no estilo RPG: amor, surpresa, pergunta.",
  },
  {
    titulo: "Paletas quentes do Lospec",
    url: "https://lospec.com/palette-list/tag/warm",
    nota: "Paletas aconchegantes para afinar madeira, luz e pelagens.",
  },
  {
    titulo: "Pixanimals 32x32 (itch.io)",
    url: "https://zeeshan1.itch.io/pixanimals-32x32-pet-animals-2d",
    nota: "Pets 32x32 com várias ações, para comparar escala e quantidade de quadros.",
  },
  {
    titulo: "Tamagotchi Pix (guia)",
    url: "https://sftp.thewrap.com/post/tamagotchi-pix-party-a-complete",
    nota: "Laço de cuidado: comer, brincar, limpar, carinho deixa mais feliz.",
  },
];

function secaoReferencias() {
  const itens = REFERENCIAS.map(
    (r) =>
      `<li><a href="${r.url}" target="_blank" rel="noopener">${esc(r.titulo)}</a><span>${esc(r.nota)}</span></li>`,
  ).join("");
  return `<section id="referencias" aria-labelledby="t-ref"><h2 id="t-ref">Referências usadas</h2>
    <p class="intro">Só inspiração de comportamento e estilo: toda a arte do Athenas é desenhada por nós. Também usei as imagens que você mandou (gato bocejando, gato de fone, macaco, capivara, gato-banana e as bibliotecas).</p>
    <ul class="refs">${itens}</ul></section>`;
}

// ---------------------------------------------------------------------------

test("gera o quadro de conceitos", () => {
  const html = `<title>Pets Pixel do Athenas</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400&family=Silkscreen&display=swap">
<style>${CSS}</style>
<main class="pagina">
  <header class="topo">
    <span class="olho">Athenas · Sala pixel · rodada 2 · patas corrigidas</span>
    <h1>Pets Pixel do Athenas</h1>
    <p class="intro">Tudo aqui foi desenhado pelo motor de arte do próprio app: o que você aprovar já sai pronto para entrar na Sala. Nesta rodada só voltam <b>M1, M2, M3 e M5</b>, com as patas corrigidas; o resto já está aprovado e marcado com o selo. Marque <b>Aprovo</b> e copie o resumo para o chat.</p>
    <div class="como"><span><b>M</b> movimentos</span><span><b>C</b> cores</span><span><b>A</b> acessórios</span><span><b>E</b> reações</span><span><b>S</b> ações</span></div>
    <nav class="atalhos" aria-label="Seções"><a href="#movimentos">Movimentos</a><a href="#cores">Cores</a><a href="#acessorios">Acessórios</a><a href="#reacoes">Reações</a><a href="#acoes">Ações</a><a href="#referencias">Referências</a></nav>
  </header>
  ${secaoMovimentos()}
  ${secaoCores()}
  ${secaoAcessorios()}
  ${secaoReacoes()}
  ${secaoAcoes()}
  ${secaoReferencias()}
</main>
<div class="resumo" role="region" aria-label="Resumo da aprovação">
  <div class="resumo-dentro">
    <p><b id="contador">0 itens aprovados</b> · copie o resumo e cole no chat.</p>
    <button type="button" id="pausar" aria-pressed="false">Pausar animações</button>
    <button type="button" id="copiar" class="principal">Copiar resumo</button>
    <textarea id="texto-resumo" aria-label="Resumo do que você aprovou" readonly hidden></textarea>
  </div>
</div>
<script>${jsDoQuadro("athenas-quadro-pixel-r2")}</script>`;
  const saida = process.env.QUADRO_PIXEL_SAIDA ?? "docs/pesquisa/quadro-pixel.html";
  writeFileSync(saida, html);
});
