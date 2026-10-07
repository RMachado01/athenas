/**
 * Gera `styles/tokens.css` a partir de `docs/design-system/tokens.json`.
 *
 * Por que gerar? Antes havia 3 cópias dos mesmos valores (JSON, theme.css dos mockups e o CSS do app)
 * e elas iam divergir. Agora o JSON é a ÚNICA fonte; o CSS é consequência.
 *
 * Uso:
 *   pnpm tokens:build   -> escreve styles/tokens.css
 *   pnpm tokens:check   -> falha (exit 1) se o arquivo gerado estiver desatualizado (roda no CI)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TEMAS,
  carregarTokens,
  valorDoToken,
  type Tema,
  type TokenSimples,
  type Tokens,
} from "./tokens.mts";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const SAIDA = resolve(RAIZ, "styles/tokens.css");

/**
 * Nome da variável CSS que o `next/font` cria para cada família (ver app/layout.tsx).
 * O token diz "Cormorant Garamond, Georgia, serif"; no app, a primeira família vira a variável
 * do next/font (que já traz a fonte hospedada por nós) e o resto fica como reserva.
 */
const VARIAVEL_FONTE = {
  display: "--font-inter",
  sans: "--font-inter",
  brand: "--font-cormorant",
} as const;

/** Cores "palette-*" são constantes de marca: iguais em todos os temas. */
const ehConstanteDeMarca = (nome: string) => nome.startsWith("palette-");

function valorParaTema(token: TokenSimples, tema: Tema): string {
  return typeof token.value === "string" ? token.value : token.value[tema];
}

/** Variáveis que mudam de tema para tema (cores + sombras), uma por linha. */
function variaveisDoTema(tokens: Tokens, tema: Tema): string[] {
  const linhas: string[] = [];
  for (const t of tokens.color.tokens) {
    if (ehConstanteDeMarca(t.name)) continue;
    if (t.name === "focus-ring") {
      linhas.push("--focus-ring: var(--accent);");
      continue;
    }
    linhas.push(`--${t.name}: ${valorDoToken(tokens, t.name, tema)};`);
  }
  for (const t of tokens.shadow.tokens) linhas.push(`--${t.name}: ${valorParaTema(t, tema)};`);
  return linhas;
}

function bloco(seletor: string, linhas: string[], recuo = ""): string {
  const corpo = linhas.map((l) => `${recuo}  ${l}`).join("\n");
  return `${recuo}${seletor} {\n${corpo}\n${recuo}}`;
}

/** Troca o primeiro nome de uma pilha de fontes por var(--fonte) e mantém as reservas. */
function pilhaDeFonte(pilha: string, variavel: string): string {
  const resto = pilha.split(",").slice(1).join(",").trim();
  return `var(${variavel}), ${resto}`;
}

export function gerarCss(tokens: Tokens = carregarTokens()): string {
  const [padrao, ...outros] = tokens.color.themes;
  if (!padrao || padrao.id !== "ponderosa")
    throw new Error("O primeiro tema deve ser o ponderosa.");
  const camel = tokens.color.themes.find((t) => t.id === "camel");
  if (!camel) throw new Error("Tema camel ausente.");

  const partes: string[] = [];
  partes.push(
    "/* ============================================================================\n" +
      " * GERADO AUTOMATICAMENTE — NÃO EDITE À MÃO.\n" +
      " * Fonte: docs/design-system/tokens.json   |   Gerador: scripts/build-tokens.mts\n" +
      " * Para mudar uma cor/medida: edite o JSON e rode `pnpm tokens:build`.\n" +
      " * ========================================================================== */",
  );

  // 1) Os 3 temas. O ponderosa também é o :root (tema padrão se nada for definido).
  partes.push(
    bloco(':root,\n[data-theme="ponderosa"]', [
      `color-scheme: ${padrao.scheme};`,
      ...variaveisDoTema(tokens, "ponderosa"),
    ]),
  );
  for (const tema of outros) {
    partes.push(
      bloco(`[data-theme="${tema.id}"]`, [
        `color-scheme: ${tema.scheme};`,
        ...variaveisDoTema(tokens, tema.id),
      ]),
    );
  }

  // 2) Modo "automático": sem JavaScript, o próprio navegador escolhe pelo claro/escuro do aparelho.
  //    Claro = camel; escuro = ponderosa. Resolve o "flash do tema errado" (ADR-003).
  partes.push(
    bloco('html[data-theme="auto"]', [
      `color-scheme: ${camel.scheme};`,
      ...variaveisDoTema(tokens, "camel"),
    ]),
  );
  partes.push(
    "@media (prefers-color-scheme: dark) {\n" +
      bloco(
        'html[data-theme="auto"]',
        [`color-scheme: ${padrao.scheme};`, ...variaveisDoTema(tokens, "ponderosa")],
        "  ",
      ) +
      "\n}",
  );

  // 3) Valores que NÃO mudam com o tema (constantes de marca, espaços, durações).
  //    Raios e curvas ficam no @theme mais abaixo (viram utilitários do Tailwind).
  const fixos: string[] = [];
  for (const t of tokens.color.tokens) {
    if (ehConstanteDeMarca(t.name) && typeof t.value === "string") {
      fixos.push(`--${t.name}: ${t.value};`);
    }
  }
  for (const grupo of [tokens.spacing, tokens.duration]) {
    for (const t of grupo.tokens) fixos.push(`--${t.name}: ${valorParaTema(t, "ponderosa")};`);
  }
  partes.push(bloco(":root", fixos));

  // 4) Ponte para o Tailwind v4. "inline" = a classe usa var(--surface) direto, então trocar
  //    data-theme muda as cores sem recompilar nada.
  const tailwindCores = tokens.color.tokens
    .filter((t) => !ehConstanteDeMarca(t.name))
    .map((t) => `--color-${t.name}: var(--${t.name});`);
  const tailwindSombras = tokens.shadow.tokens.map((t) => `--${t.name}: var(--${t.name});`);
  partes.push(
    "/* Remove a paleta padrão do Tailwind: só existem as cores semânticas do design system. */\n" +
      "@theme {\n  --color-*: initial;\n}",
  );
  partes.push(
    bloco("@theme inline", [
      "--color-transparent: transparent;",
      "--color-current: currentColor;",
      ...tailwindCores,
      ...tailwindSombras,
    ]),
  );

  // 5) Tipografia, raios e curvas viram utilitários (text-display-xl, rounded-lg, ease-out…).
  const tema: string[] = [];
  for (const [chave, variavel] of Object.entries(VARIAVEL_FONTE)) {
    const pilha = tokens.type.families[chave as keyof typeof VARIAVEL_FONTE];
    tema.push(`--font-${chave}: ${pilhaDeFonte(pilha, variavel)};`);
  }
  for (const grupo of tokens.type.groups) {
    for (const e of grupo.styles) {
      tema.push(`--text-${e.name}: ${e.fontSize};`);
      tema.push(`--text-${e.name}--line-height: ${e.lineHeight};`);
      tema.push(`--text-${e.name}--font-weight: ${e.fontWeight};`);
      if (e.letterSpacing) tema.push(`--text-${e.name}--letter-spacing: ${e.letterSpacing};`);
    }
  }
  for (const t of tokens.radius.tokens) tema.push(`--${t.name}: ${valorParaTema(t, "ponderosa")};`);
  for (const t of tokens.easing.tokens) tema.push(`--${t.name}: ${valorParaTema(t, "ponderosa")};`);
  partes.push(bloco("@theme static", tema));

  return partes.join("\n\n") + "\n";
}

function principal(): void {
  const gerado = gerarCss();

  if (process.argv.includes("--check")) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, "utf-8") : "";
    if (atual !== gerado) {
      console.error("✗ styles/tokens.css está desatualizado. Rode: pnpm tokens:build");
      process.exit(1);
    }
    console.log("✓ styles/tokens.css está em dia com tokens.json");
    return;
  }

  writeFileSync(SAIDA, gerado, "utf-8");
  console.log(`✓ Gerado ${SAIDA} (${TEMAS.length} temas + automático)`);
}

// Só executa quando chamado direto (não quando importado pelos testes).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
