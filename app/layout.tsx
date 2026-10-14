import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { scriptTemaInicial } from "@/lib/tema";
import "./globals.css";

// Fontes do design system, com os ARQUIVOS no próprio repositório (app/fontes, licença OFL).
// Antes usávamos next/font/google, que baixa as fontes do Google ao compilar: quando o Google
// falhava (aconteceu no CI), o servidor de desenvolvimento nem subia. Com os arquivos locais não há
// dependência de rede, e o app continua sem pedir nada ao Google quando a pessoa o abre.
// Cada fonte vira uma variável CSS usada pelo tokens.css.
//  - Inter (variável 100–900, subconjunto latino: cobre o português): toda a interface e os títulos.
//  - Cormorant Garamond (variável, usamos 500–600): SÓ a marca "Athenas".
const inter = localFont({
  src: "./fontes/inter-latin-variavel.woff2",
  variable: "--font-inter",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const cormorant = localFont({
  src: "./fontes/cormorant-garamond-latin-variavel.woff2",
  variable: "--font-cormorant",
  weight: "500 600",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Athenas", template: "%s · Athenas" },
  description: "Herança, foco e disciplina para os seus estudos.",
  // Ícone da tela inicial no iPhone/iPad (o Safari não usa os ícones do manifesto).
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Aberto pela tela inicial do iPhone: vira app de tela cheia, com a barra de status escura.
  appleWebApp: { capable: true, title: "Athenas", statusBarStyle: "black-translucent" },
};

// Cor da barra do navegador no primeiro carregamento (claro/escuro do aparelho).
// Quando o usuário troca de tema, aplicarTema() atualiza para a cor do tema escolhido.
export const viewport: Viewport = {
  // Usa a tela toda (atrás do entalhe e da barra de gestos); as margens seguras vêm do CSS com
  // env(safe-area-inset-*). Sem isto, no iPhone em modo app, essas margens valem zero.
  viewportFit: "cover",
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
