"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId, useMemo, useState } from "react";
import { FolhaInferior } from "./folha-inferior";

/**
 * Escolha de UMA opção, no visual do app (substitui o <select> nativo, que no computador abre
 * uma lista branca do sistema, fora do tema, e no celular varia de aparelho para aparelho).
 *
 * Se adapta ao tamanho da lista:
 *  - até 8 opções: pílulas na própria tela (um toque escolhe; dá para ver tudo de uma vez);
 *  - mais que isso: um botão com a escolha atual abre uma folha com busca e a lista.
 * Por baixo é um radiogroup do Radix: setas do teclado, leitor de tela e foco já funcionam.
 * O valor "" representa "nenhuma" (ex.: sem trilha).
 */
export interface OpcaoDoSeletor {
  valor: string;
  rotulo: string;
}

const LIMITE_DE_PILULAS = 8;

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

export function Seletor({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  rotuloVisivel = true,
}: {
  rotulo: string;
  opcoes: readonly OpcaoDoSeletor[];
  valor: string;
  aoMudar: (valor: string) => void;
  /** false = o rótulo existe só para leitor de tela (quando a tela já mostra um título). */
  rotuloVisivel?: boolean;
}) {
  const idDoRotulo = useId();
  const classeDoRotulo = rotuloVisivel ? "text-ink-muted text-body-sm font-medium" : "sr-only";

  if (opcoes.length <= LIMITE_DE_PILULAS) {
    return (
      <div className="flex flex-col gap-2">
        <span id={idDoRotulo} className={classeDoRotulo}>
          {rotulo}
        </span>
        <RadioGroup.Root
          aria-labelledby={idDoRotulo}
          value={valor}
          onValueChange={aoMudar}
          className="flex flex-wrap gap-2"
        >
          {opcoes.map((o) => (
            <RadioGroup.Item
              key={o.valor}
              value={o.valor}
              className="botao-vidro text-body-sm data-[state=checked]:bg-accent data-[state=checked]:text-on-accent flex min-h-11 cursor-pointer items-center gap-1.5 px-4 font-semibold data-[state=checked]:border-transparent"
            >
              <RadioGroup.Indicator asChild>
                <Check className="size-4" aria-hidden />
              </RadioGroup.Indicator>
              {o.rotulo}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
    );
  }
  return (
    <SeletorEmFolha
      rotulo={rotulo}
      classeDoRotulo={classeDoRotulo}
      opcoes={opcoes}
      valor={valor}
      aoMudar={aoMudar}
    />
  );
}

function SeletorEmFolha({
  rotulo,
  classeDoRotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  classeDoRotulo: string;
  opcoes: readonly OpcaoDoSeletor[];
  valor: string;
  aoMudar: (valor: string) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const atual = opcoes.find((o) => o.valor === valor)?.rotulo ?? "";
  const visiveis = useMemo(() => {
    const t = semAcento(busca.trim());
    return t ? opcoes.filter((o) => semAcento(o.rotulo).includes(t)) : opcoes;
  }, [opcoes, busca]);

  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden className={classeDoRotulo}>
        {rotulo}
      </span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${rotulo}: ${atual}`}
        onClick={() => setAberta(true)}
        className="campo rounded-pill flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-5 text-left text-[16px]"
      >
        <span className="truncate">{atual}</span>
        <ChevronDown className="text-ink-muted size-5 shrink-0" aria-hidden />
      </button>
      <FolhaInferior
        aberta={aberta}
        aoMudar={(v) => {
          setAberta(v);
          if (!v) setBusca("");
        }}
        titulo={rotulo}
      >
        <div className="flex flex-col gap-3">
          <div className="campo rounded-pill flex min-h-12 items-center gap-2 px-4">
            <Search className="text-ink-muted size-[18px] shrink-0" aria-hidden />
            <input
              type="search"
              aria-label="Buscar"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            />
          </div>
          {visiveis.length === 0 ? (
            <p className="text-ink-muted p-2">Nada encontrado para “{busca}”.</p>
          ) : (
            <RadioGroup.Root
              aria-label={rotulo}
              value={valor}
              onValueChange={(v) => {
                aoMudar(v);
                setAberta(false);
                setBusca("");
              }}
              className="flex flex-col gap-1"
            >
              {visiveis.map((o) => (
                <RadioGroup.Item
                  key={o.valor}
                  value={o.valor}
                  className="tocavel data-[state=checked]:text-accent flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-4 text-left hover:bg-[var(--card)] data-[state=checked]:font-semibold"
                >
                  <span className="truncate">{o.rotulo}</span>
                  <RadioGroup.Indicator asChild>
                    <Check className="size-5 shrink-0" aria-hidden />
                  </RadioGroup.Indicator>
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          )}
        </div>
      </FolhaInferior>
    </div>
  );
}
