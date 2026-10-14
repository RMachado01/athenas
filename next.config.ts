import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança enviados em TODA resposta (defesa extra, além da RLS do banco):
 *  - frame-ancestors 'none' / X-Frame-Options: ninguém embute o Athenas num <iframe> (anti
 *    "clickjacking": um site falso por cima, enganando o toque);
 *  - nosniff: o navegador não "adivinha" o tipo de um arquivo (evita rodar texto como script);
 *  - Referrer-Policy: ao sair do app, outros sites só veem o domínio, nunca o caminho;
 *  - Permissions-Policy: câmera, microfone e localização desligados (o app não usa);
 *  - HSTS: depois da primeira visita, o navegador só fala HTTPS com o domínio.
 * A CSP é "parcial" de propósito: o Next injeta scripts inline (dados das telas) e o tema inicial
 * também é inline, então restringir scripts exigiria nonce por requisição, o que desligaria o
 * cache das páginas. Travamos o que não custa nada: frames, <base>, plugins e envio de formulário.
 */
const CABECALHOS_DE_SEGURANCA = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }];
  },
  /* config options here */
  cacheComponents: true,
  // Sem o selo flutuante do modo dev: no celular ele cobria a barra de ferramentas do mural
  // (e aparecia nas capturas de tela). Erros continuam no terminal e no console.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    // Só para desenvolvimento local com worktree do git: o node_modules é um link para a pasta
    // principal e o Turbopack precisa enxergar a pasta "mãe" das duas. Sem a variável, nada muda.
    ...(process.env.TURBOPACK_ROOT ? { root: process.env.TURBOPACK_ROOT } : {}),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
