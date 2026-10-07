import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { scriptTemaInicial } from "@/lib/tema";
import "./globals.css";

// Fontes do design system, hospedadas por nós (next/font baixa na build: sem layout shift, sem pedir
// nada ao Google quando a pessoa abre o app). Cada uma vira uma variável CSS usada pelo tokens.css.
//  - Inter (variável, todos os pesos): toda a interface e os títulos. Números usam `tabular-nums`.
//  - Cormorant Garamond: SÓ a marca "Athenas" (assinatura de herança dentro de um visual moderno).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Athenas", template: "%s · Athenas" },
  description: "Herança, foco e disciplina para os seus estudos.",
};

// Cor da barra do navegador no primeiro carregamento (claro/escuro do aparelho).
// Quando o usuário troca de tema, aplicarTema() atualiza para a cor do tema escolhido.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3ebdd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1f19" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontes = `${inter.variable} ${cormorant.variable}`;

  return (
    // data-theme="auto": sem cookie, o CSS segue o claro/escuro do aparelho.
    // suppressHydrationWarning: o script abaixo pode trocar data-theme antes do React hidratar.
    <html lang="pt-BR" data-theme="auto" className={`${fontes} h-full`} suppressHydrationWarning>
      <head>
        {/* Roda antes da primeira pintura: aplica o tema salvo e evita o "flash" (ADR-003). */}
        <script dangerouslySetInnerHTML={{ __html: scriptTemaInicial() }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
