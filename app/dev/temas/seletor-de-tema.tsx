"use client";

import { useSyncExternalStore } from "react";
import { aplicarTema, ehOpcaoDeTema, type OpcaoDeTema } from "@/lib/tema";

const ROTULOS: { id: OpcaoDeTema; nome: string; descricao: string }[] = [
  { id: "ponderosa", nome: "Ponderosa Pine", descricao: "Verde floresta, escuro" },
  { id: "burgundy", nome: "Crimson Noir", descricao: "Carmim, escuro" },
  { id: "camel", nome: "Old Money Camel", descricao: "Cashmere, claro" },
  { id: "amethyst", nome: "Amethyst", descricao: "Violeta, escuro" },
  { id: "volt", nome: "Volt", descricao: "Lima sobre preto, escuro" },
  { id: "mono", nome: "Preto e Branco", descricao: "Monocromático, escuro" },
  { id: "amber", nome: "Amber", descricao: "Amarelo sobre preto, escuro" },
  { id: "auto", nome: "Automático", descricao: "Segue o claro/escuro do aparelho" },
];

/** Observa o atributo data-theme do <html>: qualquer troca (script, clique, outra aba) re-renderiza. */
function assinar(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observador.disconnect();
}

function temaAtualDoHtml(): OpcaoDeTema {
  const valor = document.documentElement.getAttribute("data-theme");
  return ehOpcaoDeTema(valor) ? valor : "auto";
}

/**
 * Seletor PROVISÓRIO de tema (só para desenvolvimento). O definitivo nasce na tela
 * de Personalização (ThemeSwitcher), mas já usa o mesmo contrato de acessibilidade:
 * radiogroup com role="radio" e aria-checked.
 *
 * A fonte da verdade é o próprio <html data-theme>, lido com useSyncExternalStore
 * (assim o componente nunca "discorda" do que está na tela).
 */
export function SeletorDeTema() {
  const atual = useSyncExternalStore(assinar, temaAtualDoHtml, () => "auto" as const);

  return (
    <div role="radiogroup" aria-label="Tema" className="grid gap-4 sm:grid-cols-2">
      {ROTULOS.map((opcao) => {
        const marcado = atual === opcao.id;
        return (
          <button
            key={opcao.id}
            type="button"
            role="radio"
            aria-checked={marcado}
            data-testid={`tema-${opcao.id}`}
            onClick={() => aplicarTema(opcao.id)}
            className={[
              "min-h-11 rounded-lg border bg-surface p-4 text-left transition-colors",
              marcado ? "border-accent" : "border-border-strong hover:border-accent",
            ].join(" ")}
          >
            <span className="block font-semibold">{opcao.nome}</span>
            <span className="text-ink-muted block text-[13px] leading-[18px]">
              {opcao.descricao}
            </span>
          </button>
        );
      })}
    </div>
  );
}
