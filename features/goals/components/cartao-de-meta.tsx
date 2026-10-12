"use client";

import { Archive, CheckCheck, ListChecks, Timer } from "lucide-react";
import { AnelDeProgresso } from "@/components/ui/anel-de-progresso";
import { descreverPeriodo, descreverProgresso, type Meta } from "../regras";

/**
 * Cartão de uma meta: anel de progresso com o percentual, título, "2h30 de 5h nesta semana"
 * e (opcional) o botão de arquivar. Meta batida ganha selo "Batida!".
 */
export function CartaoDeMeta({
  meta,
  nomeDaTrilha,
  aoArquivar,
}: {
  meta: Meta;
  nomeDaTrilha: string | null;
  aoArquivar?: () => void;
}) {
  const batida = meta.percentual >= 100;
  const Icone = meta.tipo === "minutos" ? Timer : ListChecks;

  return (
    <article
      aria-label={`${meta.titulo}: ${descreverProgresso(meta)} ${descreverPeriodo(meta.periodo)}`}
      className="cartao flex items-center gap-4 rounded-xl p-4"
    >
      <AnelDeProgresso
        valor={meta.percentual}
        rotulo={`Progresso da meta ${meta.titulo}`}
        tamanho={64}
        espessura={7}
      >
        {batida ? (
          <CheckCheck className="text-accent size-5" aria-hidden />
        ) : (
          <span className="text-body-sm font-semibold tabular-nums">{meta.percentual}%</span>
        )}
      </AnelDeProgresso>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <Icone className="text-ink-muted size-3.5 shrink-0" aria-hidden />
          <span className="truncate font-semibold">{meta.titulo}</span>
        </span>
        <span className="text-ink-muted text-body-sm tabular-nums">
          {descreverProgresso(meta)} {descreverPeriodo(meta.periodo)}
        </span>
        {(nomeDaTrilha || batida) && (
          <span className="flex flex-wrap gap-1.5 pt-1">
            {batida && (
              <span className="bg-accent text-on-accent rounded-pill text-body-sm px-2.5 py-0.5 font-semibold">
                Batida!
              </span>
            )}
            {nomeDaTrilha && (
              <span className="bg-ink/10 rounded-pill text-body-sm px-2.5 py-0.5 font-semibold">
                {nomeDaTrilha}
              </span>
            )}
          </span>
        )}
      </div>

      {aoArquivar && (
        <button
          type="button"
          onClick={aoArquivar}
          aria-label={`Arquivar meta ${meta.titulo}`}
          className="botao-vidro grid size-11 shrink-0 cursor-pointer place-items-center"
        >
          <Archive className="size-[18px]" aria-hidden />
        </button>
      )}
    </article>
  );
}
