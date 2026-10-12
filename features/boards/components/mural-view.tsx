"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Esqueleto } from "@/components/ui/esqueleto";
import { useMural } from "../queries";

// O React Flow mexe direto no navegador (tamanho da tela, ponteiro): carregamos só no cliente,
// e só nesta rota (o resto do app não paga o peso da biblioteca).
const Quadro = dynamic(() => import("./quadro").then((m) => m.Quadro), {
  ssr: false,
  loading: () => <CarregandoQuadro />,
});

function CarregandoQuadro() {
  return (
    <div aria-busy="true" className="fundo-pontilhado fixed inset-0 z-40 flex flex-col gap-3 p-4">
      <span className="sr-only">Carregando mural</span>
      <Esqueleto className="h-11 w-48" />
      <div className="flex-1" />
      <Esqueleto className="mx-auto h-14 w-72 rounded-full" />
    </div>
  );
}

/** Tela de um mural: carrega os dados e abre o quadro (ou explica se o mural não existe). */
export function MuralView({ id, voltarPara = "/murais" }: { id: string; voltarPara?: string }) {
  const { data, isPending, isError, refetch } = useMural(id);

  if (isPending) return <CarregandoQuadro />;
  if (isError) {
    return (
      <main className="flex flex-col gap-4 px-5 pt-8">
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar o mural.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="flex flex-col gap-4 px-5 pt-8">
        <h1 className="text-heading-1">Mural não encontrado</h1>
        <p className="text-ink-muted">Ele pode ter sido arquivado.</p>
        <Link href={voltarPara} className="text-accent font-semibold">
          Voltar aos murais
        </Link>
      </main>
    );
  }
  return <Quadro dados={data} voltarPara={voltarPara} />;
}
