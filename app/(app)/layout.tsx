import type { ReactNode } from "react";
import { Navegacao } from "./navegacao";
import { Providers } from "./providers";

/**
 * Casca do app logado: navegação + área de conteúdo.
 * É um Server Component estático (nada aqui lê cookies), então o casco chega na hora
 * e cada página carrega os seus dados em seguida.
 */
export default function LayoutDoApp({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen lg:flex">
        <Navegacao />
        {/* pb-28: espaço para a barra inferior do celular não cobrir o fim da página. */}
        <div className="min-w-0 flex-1 pb-28 lg:pb-0">{children}</div>
      </div>
    </Providers>
  );
}
