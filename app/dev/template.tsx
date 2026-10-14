import type { ReactNode } from "react";
import { TrocaDeTela } from "@/components/ui/troca-de-tela";

/** Laboratório: só o foco no título (sem animação, ver TrocaDeTela). O Next remonta o template a cada navegação: é onde a tela nova "entra" e recebe o foco. */
export default function Template({ children }: { children: ReactNode }) {
  return <TrocaDeTela animar={false}>{children}</TrocaDeTela>;
}
