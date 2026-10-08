/**
 * Sistema de temas do Athenas (ADR-003).
 *
 * Como funciona, em linguagem simples:
 *  1. A escolha do usuário fica num cookie (`athenas-theme`).
 *  2. Antes da primeira pintura da página, um mini-script no <head> lê esse cookie e coloca
 *     `data-theme="..."` no <html>. Como o script roda ANTES de qualquer pixel aparecer,
 *     não existe "flash do tema errado".
 *  3. Se não há cookie (ou o valor é "auto"), o CSS decide sozinho pelo claro/escuro do aparelho.
 *
 * Por que não ler o cookie no servidor? Com Cache Components (padrão do Next 16), ler cookies no
 * layout raiz impede o pré-render da página, e o shell offline do PWA ficaria preso a um tema.
 * O script resolve nos dois casos (página nova ou HTML vindo do cache do service worker).
 */

export const COOKIE_TEMA = "athenas-theme";

/** Temas que o usuário pode escolher. "auto" segue o claro/escuro do aparelho. */
export const OPCOES_DE_TEMA = [
  "ponderosa",
  "burgundy",
  "camel",
  "amethyst",
  "volt",
  "mono",
  "amber",
  "auto",
] as const;
export type OpcaoDeTema = (typeof OPCOES_DE_TEMA)[number];

/** Nome e descrição de cada tema para as telas de escolha. */
export const ROTULOS_DE_TEMA: Record<OpcaoDeTema, { nome: string; descricao: string }> = {
  ponderosa: { nome: "Ponderosa Pine", descricao: "Verde floresta" },
  burgundy: { nome: "Crimson Noir", descricao: "Carmim profundo" },
  camel: { nome: "Old Money Camel", descricao: "Cashmere, claro" },
  amethyst: { nome: "Amethyst", descricao: "Violeta" },
  volt: { nome: "Volt", descricao: "Lima sobre preto" },
  mono: { nome: "Preto e Branco", descricao: "Monocromático" },
  amber: { nome: "Amber", descricao: "Amarelo sobre preto" },
  auto: { nome: "Automático", descricao: "Segue claro/escuro do aparelho" },
};

const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

export function ehOpcaoDeTema(valor: unknown): valor is OpcaoDeTema {
  return typeof valor === "string" && (OPCOES_DE_TEMA as readonly string[]).includes(valor);
}

/**
 * Código JavaScript (em texto) que roda bloqueando o <head>, antes da primeira pintura.
 * Fica o mais curto possível de propósito: tudo aqui atrasa a página.
 * Só aceita valores da lista; qualquer outra coisa no cookie é ignorada.
 */
export function scriptTemaInicial(): string {
  const validos = JSON.stringify(OPCOES_DE_TEMA);
  return (
    "(function(){try{" +
    `var m=document.cookie.match(/(?:^|; )${COOKIE_TEMA}=([^;]+)/);` +
    `if(m&&${validos}.indexOf(m[1])>-1){document.documentElement.setAttribute("data-theme",m[1]);}` +
    "}catch(e){}})();"
  );
}

/** Tema guardado no cookie deste aparelho (null se a pessoa nunca escolheu aqui). */
export function temaDoCookie(): OpcaoDeTema | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_TEMA}=([^;]+)`));
  return m && ehOpcaoDeTema(m[1]) ? m[1] : null;
}

/** Troca o tema agora: grava o cookie, atualiza o <html> e a cor da barra do navegador. */
export function aplicarTema(opcao: OpcaoDeTema): void {
  const html = document.documentElement;

  const trocar = () => {
    document.cookie = `${COOKIE_TEMA}=${opcao}; path=/; max-age=${UM_ANO_EM_SEGUNDOS}; samesite=lax`;
    html.setAttribute("data-theme", opcao);
    atualizarCorDaBarra();
  };

  // View Transitions faz um cross-fade suave entre os temas. Respeita "reduzir movimento".
  const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition === "function" && !reduzirMovimento) {
    document.startViewTransition(trocar);
  } else {
    trocar();
  }
}

/** Mantém <meta name="theme-color"> igual ao fundo do tema ativo (barra do navegador/PWA). */
function atualizarCorDaBarra(): void {
  const fundo = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (!fundo) return;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", fundo);
    meta.removeAttribute("media"); // vale sempre, não só para claro/escuro do sistema
  });
}
