import type { ReactNode } from "react";

/**
 * Chip do design system (trilha, tema, papel…): rótulo curto em CAIXA ALTA com tracking largo.
 * - marca: fundo `brand` com texto `ink` (contraste validado nos 3 temas).
 * - contorno: só borda, para ações secundárias ("+ 3 trilhas").
 * Nunca use `ink-muted` sobre `brand` (no tema camel o contraste cai abaixo de 3:1).
 */
export function Chip({
  children,
  variante = "marca",
  className = "",
}: {
  children: ReactNode;
  variante?: "marca" | "contorno";
  className?: string;
}) {
  const estilo =
    variante === "marca" ? "bg-brand text-ink" : "border border-border-strong text-ink-muted";
  return (
    <span
      className={`text-label inline-flex items-center rounded-sm px-2 py-0.5 whitespace-nowrap uppercase ${estilo} ${className}`}
    >
      {children}
    </span>
  );
}
