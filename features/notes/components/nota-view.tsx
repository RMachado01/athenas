"use client";

import { ArrowLeft, Archive, FileText, Link as IconeLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Esqueleto } from "@/components/ui/esqueleto";
import { extrairLinks, renomearLinks, trecho, type NoDoDocumento } from "../documento";
import {
  useArquivarNota,
  useBacklinks,
  useCriarNota,
  useNota,
  useNotas,
  useSalvarNota,
  type Nota,
} from "../queries";
import { EditorDeNota } from "./editor-de-nota";
import type { FonteDeNotas } from "./extensoes";

/** Espera depois de parar de digitar até salvar (ms). */
const ESPERA_PARA_SALVAR = 800;

/** Tela de uma nota: título grande, editor em blocos, backlinks embaixo. Salva sozinho. */
export function NotaView({ id, caminhoBase = "/notas" }: { id: string; caminhoBase?: string }) {
  const { data: nota, isPending, isError, refetch } = useNota(id);
  // A lista de notas precisa estar pronta antes do editor abrir: ela dá o nome ATUAL dos
  // links (nota renomeada) e as sugestões do "[[".
  const { isPending: carregandoLista } = useNotas();

  if (isPending || carregandoLista) {
    return (
      <main aria-busy="true" className="flex flex-col gap-4 px-5 pt-6">
        <span className="sr-only">Carregando nota</span>
        <Esqueleto className="h-11 w-11 rounded-full" />
        <Esqueleto className="h-10 w-2/3" />
        <Esqueleto className="h-48" />
      </main>
    );
  }
  if (isError) {
    return (
      <main className="px-5 pt-8">
        <p role="alert" className="border-danger text-danger rounded-lg border p-4">
          Não deu pra carregar a nota.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      </main>
    );
  }
  if (!nota) {
    return (
      <main className="flex flex-col gap-4 px-5 pt-8">
        <h1 className="text-heading-1">Nota não encontrada</h1>
        <p className="text-ink-muted">Ela pode ter sido arquivada.</p>
        <Link href={caminhoBase} className="text-accent font-semibold">
          Voltar às notas
        </Link>
      </main>
    );
  }
  // key: trocar de nota (clicando num link) recria o editor com o conteúdo certo.
  return <EdicaoDaNota key={nota.id} nota={nota} caminhoBase={caminhoBase} />;
}

function EdicaoDaNota({ nota, caminhoBase }: { nota: Nota; caminhoBase: string }) {
  const router = useRouter();
  const { data: notas = [] } = useNotas();
  const { data: backlinks = [] } = useBacklinks(nota.id);
  // `mutate` do TanStack é estável: a função de salvar abaixo não muda a cada render.
  const { mutate: salvarNota } = useSalvarNota();
  const criar = useCriarNota();
  const arquivar = useArquivarNota();

  const [titulo, setTitulo] = useState(nota.titulo);
  const [estado, setEstado] = useState<"salvo" | "salvando" | "pendente">("salvo");

  // Links com o nome ATUAL das notas citadas (se alguma foi renomeada, o rótulo acompanha).
  const conteudoInicial = useMemo(
    () => renomearLinks(nota.conteudo, new Map(notas.map((n) => [n.id, n.titulo]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na abertura da nota
    [nota.id],
  );

  // Fonte de notas para o "[[": lê sempre o cache atual (por ref) e cria notas novas.
  const notasRef = useRef(notas);
  useEffect(() => {
    notasRef.current = notas;
  }, [notas]);
  const fonte = useMemo<FonteDeNotas>(
    () => ({
      notas: () => notasRef.current,
      notaAtual: () => nota.id,
      criar: async (t) => {
        const novoId = crypto.randomUUID();
        try {
          await criar.mutateAsync({ id: novoId, titulo: t });
          return novoId;
        } catch {
          return null;
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- criar.mutateAsync é estável o bastante
    [nota.id],
  );

  // ---- salvamento com espera (e ao sair) -------------------------------------------
  const ultimo = useRef<{ titulo: string; doc: NoDoDocumento; texto: string } | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const timer = useRef<number | null>(null);

  const salvarAgora = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    const dados = ultimo.current;
    if (!dados) return;
    const t = dados.titulo.trim();
    if (!t) {
      setEstado("pendente");
      return; // título vazio não salva (o banco exige); avisamos no campo
    }
    ultimo.current = null;
    setEstado("salvando");
    salvarNota(
      {
        id: nota.id,
        titulo: t,
        conteudo: dados.doc,
        texto: dados.texto,
        links: extrairLinks(dados.doc),
      },
      { onSettled: () => setEstado(ultimo.current ? "pendente" : "salvo") },
    );
  }, [nota.id, salvarNota]);

  const agendar = useCallback(
    (mudanca: Partial<{ titulo: string }>) => {
      const ed = editorRef.current;
      ultimo.current = {
        titulo: mudanca.titulo ?? ultimo.current?.titulo ?? titulo,
        doc: (ed?.getJSON() as NoDoDocumento | undefined) ?? ultimo.current?.doc ?? nota.conteudo,
        texto: ed?.getText({ blockSeparator: "\n" }) ?? ultimo.current?.texto ?? nota.texto,
      };
      setEstado("pendente");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(salvarAgora, ESPERA_PARA_SALVAR);
    },
    [nota.conteudo, nota.texto, salvarAgora, titulo],
  );

  // Ao sair da nota, salva o que ficou pendente (salvarAgora é estável: só roda ao desmontar).
  useEffect(() => () => salvarAgora(), [salvarAgora]);

  return (
    <main className="flex flex-col gap-5 px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-2">
        <Link
          href={caminhoBase}
          aria-label="Voltar às notas"
          className="botao-vidro grid size-11 shrink-0 place-items-center"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <span className="text-ink-muted text-body-sm" aria-live="polite">
          {estado === "salvando" ? "Salvando…" : estado === "pendente" ? "Editando…" : "Salvo"}
        </span>
        <button
          type="button"
          onClick={() =>
            arquivar({ id: nota.id, titulo: titulo.trim() || nota.titulo }, () =>
              router.push(caminhoBase),
            )
          }
          aria-label="Arquivar nota"
          className="botao-vidro grid size-11 shrink-0 cursor-pointer place-items-center"
        >
          <Archive className="size-[18px]" aria-hidden />
        </button>
      </header>

      <div className="flex flex-col gap-1">
        <label htmlFor="titulo-da-nota" className="sr-only">
          Título da nota
        </label>
        <textarea
          id="titulo-da-nota"
          value={titulo}
          rows={1}
          maxLength={200}
          onChange={(e) => {
            const t = e.target.value.replace(/\n/g, " ");
            setTitulo(t);
            agendar({ titulo: t });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editorRef.current?.commands.focus("start");
            }
          }}
          placeholder="Sem título"
          aria-invalid={titulo.trim() === "" ? true : undefined}
          className="font-display text-display-lg field-sizing-content w-full resize-none bg-transparent leading-tight outline-none placeholder:text-[var(--ink-muted)]"
        />
        {titulo.trim() === "" && (
          <p role="alert" className="text-danger text-body-sm">
            Dê um título para a nota (ele é usado nos [[links]]).
          </p>
        )}
      </div>

      <EditorDeNota
        conteudoInicial={conteudoInicial}
        caminhoBase={caminhoBase}
        fonte={fonte}
        aoMudar={(ed) => {
          editorRef.current = ed;
          agendar({});
        }}
      />

      <section
        aria-labelledby="titulo-backlinks"
        className="flex flex-col gap-3 border-t border-[var(--glass-border)] pt-5"
      >
        <h2
          id="titulo-backlinks"
          className="text-ink-muted text-label flex items-center gap-2 uppercase"
        >
          <IconeLink className="size-3.5" aria-hidden />
          {backlinks.length === 0
            ? "Nenhuma nota cita esta"
            : `Citada em ${backlinks.length} ${backlinks.length === 1 ? "nota" : "notas"}`}
        </h2>
        {backlinks.length > 0 && (
          <ul role="list" className="flex flex-col gap-2">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link
                  href={`${caminhoBase}/${b.id}`}
                  className="cartao flex flex-col gap-1 rounded-lg p-3"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <FileText className="text-ink-muted size-4 shrink-0" aria-hidden />
                    <span className="truncate">{b.titulo}</span>
                  </span>
                  {b.trecho && (
                    <span className="text-ink-muted text-body-sm line-clamp-2">
                      {trecho(b.trecho, titulo, 140)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
