import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA: é o que permite "Adicionar à tela inicial" e abrir o Athenas como app
 * (sem a barra do navegador). O Next serve em /manifest.webmanifest e põe o <link> no <head>.
 * Ícones em public/icons (gerados do athenas.svg). "maskable" = o Android pode recortar em
 * círculo/gota sem cortar o desenho (ele fica todo na zona segura central).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Athenas",
    short_name: "Athenas",
    description: "Herança, foco e disciplina para os seus estudos.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1f19",
    theme_color: "#0b1f19",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icone-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
