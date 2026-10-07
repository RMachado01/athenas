"use client";

import { useSearchParams } from "next/navigation";
import { BotaoGoogle } from "./botao-google";

/** Descobre para onde voltar depois do login (?next=) e entrega ao botão. */
export function DestinoDoLogin() {
  const next = useSearchParams().get("next");
  return <BotaoGoogle destino={next} />;
}
