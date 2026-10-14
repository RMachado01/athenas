"use client";

import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { buscarNotas, chaveDoTitulo, trecho } from "../documento";
import { useCriarNota, useNotas } from "../queries";

const QUANDO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

/**
 * Lista de notas (MOBILE PRIMEIRO, estilo Notion/Obsidian): busca por título e texto,
 * notas mais recentes primeiro, "+" para criar.
 */
export function NotasView({ caminhoBase = "/notas" }: { caminhoBase?: string }) {
  const { data: notas, isPending, isError, refetch } = useNotas();
  const [busca, setBusca] = useState("");
  const [novaAberta, setNovaAberta] = useState(false);
  const lista = useMemo(() => buscarNotas(notas ?? [], busca), [notas, busca]);

  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-ink-muted text-body-sm font-medium">
            {notas
              ? `${notas.length} ${notas.length === 1 ? "nota" : "notas"}`
              : "Sua base de conhecimento"}
          </span>
          <h1 className="font-display text-display-lg">Notas</h1>
        </div>
        <button
          type="button"
          onClick={() => setNovaAberta(true)}
          aria-label="Nova nota"
          className="botao-primario grid size-12 shrink-0 cursor-pointer place-items-center"
        >
          <Plus className="size-6" strokeWidth={2.5} aria-hidden />
        </button>
      </header>

      <div className="campo rounded-pill flex min-h-12 items-center gap-2 px-4">
        <Search className="text-ink-muted size-[18px] shrink-0" aria-hidden />
        <label htmlFor="buscar-notas" className="sr-only">
          Buscar notas
        </label>
        <input
          id="buscar-notas"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título ou texto"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
      </div>

      {isError ? (
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar as notas.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      ) : isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only">Carregando notas</span>
          <Esqueleto className="h-20" />
          <Esqueleto className="h-20" />
        </div>
      ) : (notas ?? []).length === 0 ? (
        <div className="cartao flex flex-col items-start gap-3 rounded-xl p-5">
          <p className="font-semibold">Nenhuma nota ainda</p>
          <p className="text-ink-muted text-body-sm">
            Escreva resumos e ideias. Ligue uma nota à outra com [[ ]] e veja quem cita quem.
          </p>
          <button
            type="button"
            onClick={() => setNovaAberta(true)}
            className="botao-primario min-h-11 cursor-pointer px-5 font-semibold"
          >
            Criar minha primeira nota
          </button>
        </div>
      ) : lista.length === 0 ? (
        <p className="text-ink-muted p-2">Nenhuma nota encontrada para “{busca}”.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-2">
          {lista.map((n) => (
            <li key={n.id}>
              <Link
                href={`${caminhoBase}/${n.id}`}
                className="cartao tocavel flex gap-3 rounded-lg p-4"
              >
                <FileText className="text-ink-muted mt-0.5 size-[18px] shrink-0" aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-semibold">{n.titulo}</span>
                    <span className="text-ink-muted text-body-sm shrink-0">
                      {QUANDO.format(new Date(n.atualizadaEm))}
                    </span>
                  </span>
                  {n.texto && (
                    <span className="text-ink-muted text-body-sm line-clamp-2">
                      {trecho(n.texto, busca, 140)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <FolhaInferior aberta={novaAberta} aoMudar={setNovaAberta} titulo="Nova nota">
        <NovaNota
          titulosExistentes={new Set((notas ?? []).map((n) => chaveDoTitulo(n.titulo)))}
          caminhoBase={caminhoBase}
          aoCriar={() => setNovaAberta(false)}
        />
      </FolhaInferior>
    </main>
  );
}

function NovaNota({
  titulosExistentes,
  caminhoBase,
  aoCriar,
}: {
  titulosExistentes: ReadonlySet<string>;
  caminhoBase: string;
  aoCriar: () => void;
}) {
  const criar = useCriarNota();
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const ids = { campo: useId(), erro: useId() };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) return setErro("Dê um título para a nota.");
    if (titulosExistentes.has(chaveDoTitulo(t)))
      return setErro("Já existe uma nota com esse título.");
    const id = crypto.randomUUID();
    aoCriar();
    try {
      await criar.mutateAsync({ id, titulo: t });
      router.push(`${caminhoBase}/${id}`);
    } catch {
      /* o aviso já foi mostrado pela mutação */
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
      <label htmlFor={ids.campo} className="text-ink-muted text-body-sm font-medium">
        Título
      </label>
      <input
        id={ids.campo}
        value={titulo}
        maxLength={200}
        autoFocus
        autoComplete="off"
        onChange={(e) => {
          setTitulo(e.target.value);
          if (erro) setErro(null);
        }}
        placeholder="Ex.: Window functions"
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? ids.erro : undefined}
        className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px] outline-none"
      />
      {erro && (
        <p id={ids.erro} role="alert" className="text-danger text-body-sm">
          {erro}
        </p>
      )}
      <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
        Criar nota
      </button>
    </form>
  );
}
