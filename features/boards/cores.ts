/**
 * Paleta do mural (8 cores, as mesmas aceitas pelo banco). Cada cor vira um TOM do tema atual:
 * o fundo do post-it mistura a cor com o "card" do tema, então ele sempre combina e o texto
 * (cor --ink) mantém contraste. No tema Preto e Branco, as cores viram cinzas (ver globals.css).
 */
export const CORES_DO_MURAL = [
  { id: "amarelo", nome: "Amarelo", base: "#f5c84c" },
  { id: "rosa", nome: "Rosa", base: "#f08bb4" },
  { id: "verde", nome: "Verde", base: "#7cc98a" },
  { id: "azul", nome: "Azul", base: "#6aa8f0" },
  { id: "roxo", nome: "Roxo", base: "#a98bf0" },
  { id: "laranja", nome: "Laranja", base: "#f2a35e" },
  { id: "cinza", nome: "Cinza", base: "#a3a3a3" },
  { id: "menta", nome: "Menta", base: "#6fd6c7" },
] as const;

export type CorDoMural = (typeof CORES_DO_MURAL)[number]["id"];

export function ehCorDoMural(v: unknown): v is CorDoMural {
  return CORES_DO_MURAL.some((c) => c.id === v);
}

/** Variável CSS da cor (definida em globals.css para cada tema). */
export function varDaCor(cor: CorDoMural): string {
  return `var(--mural-${cor})`;
}

/** Ícones que a pessoa pode escolher para um mural (nomes do lucide). */
export const ICONES_DO_MURAL = [
  "layout-dashboard",
  "brain",
  "book-open",
  "lightbulb",
  "target",
  "calendar",
  "flask-conical",
  "code",
  "languages",
  "graduation-cap",
] as const;

export type IconeDoMural = (typeof ICONES_DO_MURAL)[number];

export function ehIconeDoMural(v: unknown): v is IconeDoMural {
  return (ICONES_DO_MURAL as readonly string[]).includes(String(v));
}
