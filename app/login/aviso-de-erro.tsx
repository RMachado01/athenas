"use client";

import { useSearchParams } from "next/navigation";

/** Mostra o motivo quando o login volta com erro (?erro=auth). Mensagem diz o que fazer (voz do design system). */
export function AvisoDeErro() {
  const erro = useSearchParams().get("erro");
  if (!erro) return null;

  return (
    <p
      role="alert"
      className="border-danger text-danger rounded-md border px-4 py-3 text-[13px] leading-[18px]"
    >
      Não deu pra entrar com o Google. Tente de novo; se continuar, avise quem te convidou.
    </p>
  );
}
