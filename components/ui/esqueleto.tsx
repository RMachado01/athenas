/**
 * Esqueleto de carregamento: forma final do conteúdo em `hairline`, pulso suave de opacidade
 * (sem spinner e sem "brilho varrendo": discrição é qualidade). Quem usa marca a região com
 * aria-busy e inclui um texto "Carregando…" só para leitor de tela.
 */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-hairline animate-pulse rounded-md ${className}`} />;
}
