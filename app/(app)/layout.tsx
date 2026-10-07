import type { ReactNode } from "react";
import { Navegacao } from "./navegacao";
import { Providers } from "./providers";

/**
 * Casca do app (MOBILE PRIMEIRO): uma coluna de até 480px centralizada, como a tela de um celular,
 * com a barra de navegação flutuando embaixo. Em telas grandes o app continua sendo essa coluna
 * (o fundo ambiente preenche os lados); layouts de tablet/desktop virão depois.
 *
 * É um Server Component estático (nada aqui lê cookies): o casco chega na hora e cada página
 * carrega os seus dados em seguida.
 */
export default function LayoutDoApp({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className="relative mx-auto min-h-dvh w-full max-w-[480px]">
        {/* Espaço no fim: a barra flutuante não pode cobrir o último item da lista. */}
        <div className="pb-[calc(7.5rem+env(safe-area-inset-bottom))]">{children}</div>
        <Navegacao />
      </div>
    </Providers>
  );
}
