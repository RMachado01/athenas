/**
 * Peças comuns aos QUADROS DE CONCEITOS (páginas HTML para o Renan aprovar arte): visual de
 * folha de contato de pixel art, caixinhas "Aprovo", resumo para copiar e sprites animados.
 * Usado por quadro-pixel.gerar.ts (pets) e quadro-avatar.gerar.ts (avatar).
 */
import { componer, contornar, faixaSvg, type Grade, type Paleta } from "@/features/pixel/motor";
import { PALETA_EXTRA } from "@/features/pixel/pets/pecas-extras";

export const ESCALA = 3;

export /** Um sprite animado (faixa SVG + CSS steps). */
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

export function comContorno(g: Grade): string[] {
  const largura = (g[0]?.length ?? 0) + 2;
  return contornar(componer([{ grade: g, x: 1, y: 1 }], largura, g.length + 2));
}

export const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** A caixinha "Aprovo" de um item (o código vai para o resumo). */
export function caixinhaAprovar(codigo: string, rotulo: string) {
  return `<label class="aprovar"><input type="checkbox" id="ok-${codigo}" data-codigo="${codigo}" data-rotulo="${esc(rotulo)}"><span>Aprovo</span></label>`;
}

export const CSS = `
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

/** O script do quadro: caixinhas, contador, copiar o resumo, pausar. `chave` guarda o que foi marcado. */
export const jsDoQuadro = (chave: string) => `
const caixas = [...document.querySelectorAll('input[type=checkbox][data-codigo]')];
const contador = document.getElementById('contador');
const area = document.getElementById('texto-resumo');
const CHAVE = ${JSON.stringify(chave)};
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

/** A barra fixa de baixo (contador, pausar, copiar) — os ids que o script usa. */
export const BARRA_DO_RESUMO = `<div class="resumo" role="region" aria-label="Resumo da aprovação">
  <div class="resumo-dentro">
    <p><b id="contador">0 itens aprovados</b> · copie o resumo e cole no chat.</p>
    <button type="button" id="pausar" aria-pressed="false">Pausar animações</button>
    <button type="button" id="copiar" class="principal">Copiar resumo</button>
    <textarea id="texto-resumo" aria-label="Resumo do que você aprovou" readonly hidden></textarea>
  </div>
</div>`;

export const FONTES = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400&family=Silkscreen&display=swap">`;
