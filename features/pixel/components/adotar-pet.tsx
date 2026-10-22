"use client";

import { Check } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId, useState, type FormEvent } from "react";
import { CATALOGO, paletaDoPet } from "../pets/catalogo";
import { ACESSORIOS } from "../pets/pecas-extras";
import { Seletor } from "@/components/ui/seletor";
import { quadrosDoPet } from "../pets/animacoes";
import { ESPECIES, type Especie } from "../pets/especies";
import { erroDoNomeDoPet, MAX_NOME_DO_PET, type PetEscolhido } from "../queries";
import { Sprite } from "./sprite";

/** Sugestão de nome (aparece no campo vazio) para cada espécie. */
const SUGESTAO_DE_NOME: Record<Especie, string> = {
  gato: "Mingau",
  capivara: "Capi",
  macaco: "Chico",
  gato_banana: "Banana",
};

/**
 * Fundo do botãozinho redondo de cor. No gato-banana são DUAS cores (metade banana, metade
 * gatinho): duas variações podem ter a mesma banana ou o mesmo gatinho.
 */
function fundoDoBotao(paleta: Record<string, string>): string {
  if (paleta.x && paleta.b) return `linear-gradient(135deg, ${paleta.x} 50%, ${paleta.b} 50%)`;
  return paleta.b ?? paleta.x ?? "#999999";
}

/** Opções do seletor de acessório; "" = nenhum (no banco vira null). */
const OPCOES_DE_ACESSORIO = [
  { valor: "", rotulo: "Nenhum" },
  ...ACESSORIOS.map((a) => ({ valor: a.id, rotulo: a.nome })),
];

/**
 * Conteúdo da folha "Adotar um pet" (e de "Editar pet"): escolher a espécie (cada uma animada),
 * a cor, o acessório (com prévia) e o NOME. `inicial` preenche os campos quando a pessoa já
 * tem um pet.
 */
export function AdotarPet({
  inicial,
  aoSalvar,
}: {
  inicial?: PetEscolhido | null;
  aoSalvar: (pet: PetEscolhido) => void;
}) {
  const [especie, setEspecie] = useState<Especie>(inicial?.especie ?? "gato");
  const [variacao, setVariacao] = useState(
    inicial?.variacao ?? CATALOGO[inicial?.especie ?? "gato"].variacoes[0]!.id,
  );
  const [acessorio, setAcessorio] = useState(inicial?.acessorio ?? "");
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const ids = { nome: useId(), erro: useId() };

  const info = CATALOGO[especie];
  const variacaoAtual = info.variacoes.find((v) => v.id === variacao) ?? info.variacoes[0]!;
  const acessorioAtual = ACESSORIOS.find((a) => a.id === acessorio);

  function escolherEspecie(nova: Especie) {
    setEspecie(nova);
    // Mantém a cor se a espécie nova tiver uma de mesmo id (ex.: "preto"); senão, a primeira.
    const novas = CATALOGO[nova].variacoes;
    setVariacao((atual) => novas.find((v) => v.id === atual)?.id ?? novas[0]!.id);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const mensagem = erroDoNomeDoPet(nome);
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    aoSalvar({
      especie,
      variacao: variacaoAtual.id,
      nome: nome.trim(),
      acessorio: acessorio || null,
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <RadioGroup.Root
        aria-label="Espécie do pet"
        value={especie}
        onValueChange={(v) => escolherEspecie(v as Especie)}
        className="grid grid-cols-2 gap-3"
      >
        {ESPECIES.map((id) => {
          const marcada = id === especie;
          const v =
            CATALOGO[id].variacoes.find((x) => x.id === variacao) ?? CATALOGO[id].variacoes[0]!;
          return (
            <RadioGroup.Item
              key={id}
              value={id}
              className={`cartao tocavel flex min-h-[132px] cursor-pointer flex-col items-center justify-between gap-2 rounded-xl p-3 text-center ${
                marcada ? "ring-accent ring-2" : ""
              }`}
            >
              <span className="grid min-h-[60px] place-items-end">
                <Sprite
                  quadros={quadrosDoPet(id, "parado", { variacao: v.id })}
                  paleta={paletaDoPet(v)}
                  escala={3}
                />
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                {marcada && <Check className="text-accent size-4" aria-hidden />}
                {CATALOGO[id].nome}
              </span>
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
      <p className="text-ink-muted text-body-sm -mt-2">{info.descricao}</p>

      <div className="flex flex-col gap-2">
        <span id={`${ids.nome}-cores`} className="text-ink-muted text-body-sm font-medium">
          Cor
        </span>
        <RadioGroup.Root
          aria-labelledby={`${ids.nome}-cores`}
          value={variacaoAtual.id}
          onValueChange={setVariacao}
          className="flex flex-wrap gap-1"
        >
          {info.variacoes.map((v) => (
            <RadioGroup.Item
              key={v.id}
              value={v.id}
              aria-label={v.nome}
              title={v.nome}
              className="grid size-11 cursor-pointer place-items-center rounded-pill"
            >
              <span
                className="grid size-8 place-items-center rounded-pill border-2 border-transparent transition-transform duration-(--duration-instant) data-[marcada=true]:scale-110 data-[marcada=true]:border-[var(--ink)]"
                data-marcada={v.id === variacaoAtual.id}
                style={{ background: fundoDoBotao(v.paleta) }}
              >
                <RadioGroup.Indicator asChild>
                  <Check className="size-4 text-[var(--ink)]" strokeWidth={3} aria-hidden />
                </RadioGroup.Indicator>
              </span>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
        <span className="text-ink-muted text-body-sm">{variacaoAtual.nome}</span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Prévia: o pet como vai ficar, com a cor e o acessório escolhidos. */}
        <span className="cartao grid min-h-[104px] place-items-center rounded-xl p-3">
          <Sprite
            quadros={quadrosDoPet(especie, "parado", {
              variacao: variacaoAtual.id,
              acessorio: acessorio || null,
            })}
            paleta={paletaDoPet(variacaoAtual)}
            escala={3}
            duracaoMs={2400}
            rotulo={`Prévia: ${info.nome} ${variacaoAtual.nome}${acessorioAtual ? ` com ${acessorioAtual.nome.toLocaleLowerCase("pt-BR")}` : ""}`}
          />
        </span>
        <Seletor
          rotulo="Acessório"
          opcoes={OPCOES_DE_ACESSORIO}
          valor={acessorio}
          aoMudar={setAcessorio}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.nome} className="text-ink-muted text-body-sm font-medium">
          Nome do seu pet
        </label>
        <input
          id={ids.nome}
          value={nome}
          maxLength={MAX_NOME_DO_PET}
          autoComplete="off"
          placeholder={SUGESTAO_DE_NOME[especie]}
          onChange={(e) => {
            setNome(e.target.value);
            setErro(null);
          }}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? ids.erro : undefined}
          className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px] outline-none"
        />
        {erro && (
          <p id={ids.erro} role="alert" className="text-danger text-body-sm">
            {erro}
          </p>
        )}
      </div>

      <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
        {inicial ? "Salvar" : "Adotar"}
      </button>
    </form>
  );
}
