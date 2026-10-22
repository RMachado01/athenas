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
import { ACESSORIOS, EMOTES, OBJETOS, PALETA_EXTRA } from "@/features/pixel/pets/pecas-extras";
import { CORACAO, PALETA_DO_CORACAO, PALETA_DO_ZZ, ZZ } from "@/features/pixel/extras";
import { componer, contornar, faixaSvg, type Grade, type Paleta } from "@/features/pixel/motor";
import { CATALOGO } from "@/features/pixel/pets/catalogo";
import { ESPECIES, type Especie } from "@/features/pixel/pets/especies";

const ESCALA = 3;

/** Um sprite animado (faixa SVG + CSS steps). */
function sprite(
  quadros: readonly Grade[],
  paleta: Paleta,
  cicloMs: number,
  escala = ESCALA,
  extra = "",
) {
  const f = faixaSvg(quadros, { ...PALETA_EXTRA, ...paleta });
  const w = f.largura * escala;
  const h = f.altura * escala;
  const parado = f.quadros < 2 ? " data-parado" : "";
  return `<span class="sprite${extra}"${parado} aria-hidden="true" style="width:${w}px;height:${h}px;background-image:url('${f.url}');background-size:${w * f.quadros}px ${h}px;--larg:${w}px;--n:${f.quadros};--dur:${cicloMs}ms"></span>`;
}

function comContorno(g: Grade): string[] {
  const largura = (g[0]?.length ?? 0) + 2;
  return contornar(componer([{ grade: g, x: 1, y: 1 }], largura, g.length + 2));
}

const paletaPadrao = (e: Especie) => CATALOGO[e].variacoes[0]!.paleta;
const nomeDe = (e: Especie) => CATALOGO[e].nome;
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

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
const CSS = `
/* Folha de contato de sprites: grade quadriculada como a de um editor de pixel art. */
:root {
  --bg: #eeecf3; --surface: #fbfaff; --ink: #221d2b; --ink-soft: #5d5568; --line: #d9d4e3;
  --accent: #b9781c; --accent-ink: #ffffff; --nova: #2f7d58; --quadric: rgba(34, 29, 43, .045);
  --f-display: "Silkscreen", "Courier New", monospace;
  --f-body: "Atkinson Hyperlegible", system-ui, sans-serif;
  --f-mono: "JetBrains Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #16141b; --surface: #211e28; --ink: #efeaf6; --ink-soft: #aaa2b6; --line: #34303d;
  --accent: #e3a548; --accent-ink: #1b1508; --nova: #6fcf9c; --quadric: rgba(255,255,255,.035); color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #16141b; --surface: #211e28; --ink: #efeaf6; --ink-soft: #aaa2b6; --line: #34303d;
  --accent: #e3a548; --accent-ink: #1b1508; --nova: #6fcf9c; --quadric: rgba(255,255,255,.035); color-scheme: dark; }
body { background: var(--bg); color: var(--ink); font-family: var(--f-body); font-size: 16px; line-height: 1.5;
  background-image: linear-gradient(var(--quadric) 1px, transparent 1px), linear-gradient(90deg, var(--quadric) 1px, transparent 1px);
  background-size: 12px 12px; }
.pagina { max-width: 1120px; margin: 0 auto; padding-block: 28px 140px;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: flex; flex-direction: column; gap: 44px; }
.topo { display: flex; flex-direction: column; gap: 10px; max-width: 70ch; }
.topo .olho { font-family: var(--f-mono); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
h1 { font-family: var(--f-display); font-weight: 400; font-size: clamp(30px, 5vw, 48px); line-height: 1.05; margin: 0; text-wrap: balance; }
h2 { font-family: var(--f-display); font-weight: 400; font-size: 24px; margin: 0 0 6px; }
h3 { font-size: 17px; margin: 0; }
.intro { margin: 0 0 16px; color: var(--ink-soft); max-width: 70ch; }
.como { display: flex; flex-wrap: wrap; gap: 8px 18px; color: var(--ink-soft); font-size: 14px; }
.como b { color: var(--ink); }
nav.atalhos { display: flex; flex-wrap: wrap; gap: 8px; }
nav.atalhos a { font-family: var(--f-mono); font-size: 13px; color: var(--ink); text-decoration: none; border: 1px solid var(--line); background: var(--surface); padding: 6px 12px; border-radius: 4px; }
nav.atalhos a:hover, nav.atalhos a:focus-visible { border-color: var(--accent); }
.grade-itens { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 14px; }
.item { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.item-largo { grid-column: 1 / -1; }
.item-cab { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.codigo { font-family: var(--f-mono); font-size: 12px; background: var(--ink); color: var(--bg); padding: 2px 6px; border-radius: 3px; }
.nota { margin: 0; color: var(--ink-soft); font-size: 14px; }
.dado { font-family: var(--f-mono); font-size: 12px; white-space: nowrap; }
.palco-mini { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 18px; padding: 10px 8px 4px; border-top: 1px dashed var(--line); }
.pet { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pet figcaption { font-size: 13px; color: var(--ink-soft); display: flex; align-items: center; gap: 6px; }
.selo { font-family: var(--f-mono); font-size: 10px; letter-spacing: .06em; text-transform: uppercase; border: 1px solid var(--line); border-radius: 3px; padding: 0 4px; }
.selo-nova { border-color: var(--nova); color: var(--nova); }
.aprovar { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; cursor: pointer; min-height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid var(--line); }
.pet .aprovar { margin-left: 0; }
.aprovado { margin-left: auto; display: inline-flex; align-items: center; min-height: 32px; padding: 0 10px; border-radius: 4px; font-size: 13px; font-weight: 700; color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); }
.pet .aprovado, .emote-texto .aprovado { margin-left: 0; align-self: flex-start; }
.aprovar input { width: 18px; height: 18px; accent-color: var(--accent); }
.aprovar:has(input:checked) { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }
.grade-emotes { grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); }
.item-emote { flex-direction: row; align-items: center; gap: 14px; }
.emote-arte { width: 64px; display: grid; place-items: center; flex-shrink: 0; }
.emote-texto { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1; }
.emote-texto .aprovar { margin-left: 0; align-self: flex-start; }
.cena { position: relative; height: 130px; border-radius: 4px; overflow: hidden; background: linear-gradient(#3b2519 0 70%, #5a3a22 70%); }
.chao { position: absolute; left: 0; right: 0; bottom: 0; height: 30%; background: repeating-linear-gradient(90deg, transparent 0 40px, rgba(0,0,0,.18) 40px 41px); }
.ator, .objeto, .balao { position: absolute; bottom: 12%; }
.balao { bottom: 58%; }
.objeto { bottom: 12%; }
.corre { animation: correr 3s linear infinite alternate; }
.quica { animation: quicar 0.9s ease-in infinite alternate; }
@keyframes correr { from { left: 8%; } to { left: 52%; } }
@keyframes quicar { from { transform: translateY(0); } to { transform: translateY(-46px); } }
.refs { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
.refs li { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.refs a { color: var(--accent); font-weight: 700; }
.refs span { color: var(--ink-soft); font-size: 14px; }
.resumo { position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; background: var(--surface); border-top: 1px solid var(--line);
  padding-block: 10px calc(10px + env(safe-area-inset-bottom, 0px)); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.resumo-dentro { max-width: 1120px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.resumo-dentro p { margin: 0; flex: 1; min-width: 200px; font-size: 14px; color: var(--ink-soft); }
.resumo-dentro b { color: var(--ink); }
button { font: inherit; font-weight: 700; cursor: pointer; border-radius: 4px; min-height: 40px; padding: 0 14px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
button.principal { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
#texto-resumo { width: 100%; min-height: 70px; font-family: var(--f-mono); font-size: 13px; background: var(--bg); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; padding: 8px; }
/* Sprites: faixa de quadros + steps(), pixel nítido. */
.sprite { display: inline-block; image-rendering: pixelated; background-repeat: no-repeat; background-position-x: 0;
  animation: passos var(--dur) steps(var(--n)) infinite; }
.sprite[data-parado] { animation: none; }
@keyframes passos { to { background-position-x: calc(var(--larg) * var(--n) * -1); } }
.flutua { animation: boia 1.6s ease-in-out infinite; }
@keyframes boia { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
body.pausado .sprite, body.pausado .flutua, body.pausado .corre, body.pausado .quica { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .sprite, .flutua, .corre, .quica { animation-play-state: paused; } }
`;

const JS = `
const caixas = [...document.querySelectorAll('input[type=checkbox][data-codigo]')];
const contador = document.getElementById('contador');
const area = document.getElementById('texto-resumo');
const CHAVE = 'athenas-quadro-pixel-r2';
function texto() {
  const sim = caixas.filter(c => c.checked).map(c => c.dataset.codigo + ' (' + c.dataset.rotulo + ')');
  return sim.length ? 'Aprovo: ' + sim.join(', ') : 'Ainda não marquei nada.';
}
function atualizar() {
  const n = caixas.filter(c => c.checked).length;
  contador.textContent = n + (n === 1 ? ' item aprovado' : ' itens aprovados');
  area.value = texto();
  try { localStorage.setItem(CHAVE, JSON.stringify(caixas.filter(c => c.checked).map(c => c.dataset.codigo))); } catch (e) {}
}
try { const salvos = JSON.parse(localStorage.getItem(CHAVE) || '[]'); caixas.forEach(c => { c.checked = salvos.includes(c.dataset.codigo); }); } catch (e) {}
caixas.forEach(c => c.addEventListener('change', atualizar));
document.getElementById('copiar').addEventListener('click', async (ev) => {
  const b = ev.currentTarget;
  try { await navigator.clipboard.writeText(area.value); b.textContent = 'Copiado'; }
  catch (e) { area.hidden = false; area.focus(); area.select(); b.textContent = 'Selecionei o texto: copie com Ctrl+C'; }
  setTimeout(() => { b.textContent = 'Copiar resumo'; }, 2500);
});
document.getElementById('pausar').addEventListener('click', (ev) => {
  const pausado = document.body.classList.toggle('pausado');
  ev.currentTarget.textContent = pausado ? 'Animar' : 'Pausar animações';
  ev.currentTarget.setAttribute('aria-pressed', String(pausado));
});
atualizar();
`;

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
<script>${JS}</script>`;
  const saida = process.env.QUADRO_PIXEL_SAIDA ?? "docs/pesquisa/quadro-pixel.html";
  writeFileSync(saida, html);
});
