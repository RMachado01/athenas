"use client";

import { Layers } from "lucide-react";
import { useState } from "react";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { useBaralhos } from "@/features/flashcards/queries";
import { varDaCor } from "@/features/boards/cores";
import { useDefinirBaralhoDaNota } from "../queries";

/**
 * Pílula "3 cartões · Baralho SQL" no topo da nota. Tocar abre a lista de baralhos para
 * escolher onde os cartões desta nota ficam ("Geral" quando nenhum foi escolhido).
 */
export function BaralhoDaNota({
  notaId,
  baralhoId,
  quantidade,
}: {
  notaId: string;
  baralhoId: string | null;
  quantidade: number;
}) {
  const [aberta, setAberta] = useState(false);
  const { data: baralhos = [] } = useBaralhos();
  const definir = useDefinirBaralhoDaNota(notaId);
  const atual = baralhos.find((b) => b.id === baralhoId);
  const nome = atual?.nome ?? "Geral";

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="botao-vidro tocavel text-body-sm flex min-h-11 items-center gap-2 self-start px-4"
      >
        <Layers className="size-4" aria-hidden />
        {quantidade} {quantidade === 1 ? "cartão" : "cartões"} · Baralho {nome}
      </button>
      <FolhaInferior aberta={aberta} aoMudar={setAberta} titulo="Baralho dos cartões desta nota">
        <ul role="list" className="flex flex-col gap-2">
          {[
            { id: null, nome: "Geral (padrão)", cor: "cinza" as const },
            ...baralhos.filter((b) => !b.padrao),
          ].map((b) => (
            <li key={b.id ?? "padrao"}>
              <button
                type="button"
                aria-pressed={(b.id ?? null) === (atual && !atual.padrao ? atual.id : null)}
                onClick={() => {
                  definir.mutate(b.id);
                  setAberta(false);
                }}
                className="cartao tocavel flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-left"
              >
                <span
                  className="size-3 rounded-full"
                  style={{ background: varDaCor(b.cor) }}
                  aria-hidden
                />
                {b.nome}
              </button>
            </li>
          ))}
        </ul>
      </FolhaInferior>
    </>
  );
}
