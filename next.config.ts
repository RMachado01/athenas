import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
