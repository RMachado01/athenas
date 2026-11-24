"use client";

import { Check, Lock } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useId, useMemo, useState } from "react";
import { Segmentado } from "@/components/ui/segmentado";
import { Seletor } from "@/components/ui/seletor";
import { OLHOS_CORES, PELES } from "../avatar/corpo";
import { CABELOS, CORES_DE_CABELO, ITENS, ROTULO_DA_PARTE, type Parte } from "../avatar/itens";
import {
  CONJUNTOS,
  aplicarConjunto,
  itemLiberado,
  paraEscolhas,
  progressoDaConquista,
  type AvatarSalvo,
  type EstatisticasDeEstudo,
} from "../avatar/modelo";
import { PADRAO, paletaDoAvatar, quadrosDoAvatar } from "../avatar/montar";
import { Sprite } from "./sprite";

type Aba = "aparencia" | "itens" | "conjuntos";

const ABAS = [
  { id: "aparencia", rotulo: "Aparência" },
  { id: "itens", rotulo: "Itens" },
  { id: "conjuntos", rotulo: "Conjuntos" },
] as const;

const PARTES: readonly Parte[] = ["cabeca", "rosto", "blusa", "pernas", "pes", "costas", "mao"];
/** Partes que podem ficar vazias (blusa, pernas e pés sempre têm algo: o padrão). */
const OPCIONAIS = new Set<Parte>(["cabeca", "rosto", "costas", "mao"]);
const NENHUM = "nenhum";

/** Bolinhas de cor (pele, olhos, cabelo): um toque escolhe; a cor tem nome para o leitor. */
function Cores({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: readonly { id: string; nome: string; cor: string }[];
  valor: string;
  aoMudar: (id: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-ink-muted text-body-sm font-medium">
        {rotulo}
      </span>
      <RadioGroup.Root
        aria-labelledby={id}
        value={valor}
        onValueChange={aoMudar}
        className="flex flex-wrap gap-1"
      >
        {opcoes.map((o) => (
          <RadioGroup.Item
            key={o.id}
            value={o.id}
            aria-label={o.nome}
            title={o.nome}
            className="grid size-11 cursor-pointer place-items-center rounded-pill"
          >
            <span
              className="grid size-8 place-items-center rounded-pill border-2 border-transparent data-[marcada=true]:border-[var(--ink)]"
              data-marcada={o.id === valor}
              style={{ background: o.cor }}
            >
              <RadioGroup.Indicator asChild>
                <Check className="size-4 text-[var(--ink)]" strokeWidth={3} aria-hidden />
              </RadioGroup.Indicator>
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}

/**
 * Editor do avatar (conteúdo da folha "Seu avatar"): prévia ao vivo e três abas —
 * Aparência (pele, olhos, cabelo), Itens (um por parte; os de conquista mostram o cadeado e
 * quanto falta) e Conjuntos prontos. Só grava ao tocar em "Salvar".
 */
export function EditorDeAvatar({
  inicial,
  estatisticas,
  aoSalvar,
}: {
  inicial: AvatarSalvo;
  estatisticas: EstatisticasDeEstudo;
  aoSalvar: (avatar: AvatarSalvo) => void;
}) {
  const [rascunho, setRascunho] = useState(inicial);
  const [aba, setAba] = useState<Aba>("aparencia");
  const escolhas = useMemo(() => paraEscolhas(rascunho), [rascunho]);
  const prevista = useMemo(() => quadrosDoAvatar("parado", escolhas), [escolhas]);
  const paleta = useMemo(() => paletaDoAvatar(escolhas), [escolhas]);

  const mudar = (parcial: Partial<AvatarSalvo>) => setRascunho((a) => ({ ...a, ...parcial }));
  const equipar = (parte: Parte, id: string) =>
    setRascunho((a) => {
      const equipados = { ...a.equipados };
      if (id === NENHUM) delete equipados[parte];
      else equipados[parte] = id;
      return { ...a, equipados };
    });

  const descricaoDaPrevia = [
    ...PARTES.map(
      (p) =>
        ITENS.find((i) => i.id === (rascunho.equipados[p] ?? PADRAO[p as keyof typeof PADRAO]))
          ?.nome,
    ),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-5">
      <div className="cartao grid min-h-[176px] place-items-center rounded-xl p-3">
        <Sprite
          quadros={prevista}
          paleta={paleta}
          escala={4}
          duracaoMs={2400}
          rotulo={`Prévia do seu avatar: ${descricaoDaPrevia}`}
        />
      </div>

      <Segmentado rotulo="Partes do editor" opcoes={ABAS} valor={aba} aoMudar={setAba}>
        {aba === "aparencia" && (
          <div className="flex flex-col gap-5">
            <Cores
              rotulo="Pele"
              opcoes={PELES.map((p) => ({ id: p.id, nome: p.nome, cor: p.s }))}
              valor={rascunho.pele}
              aoMudar={(pele) => mudar({ pele })}
            />
            <Cores
              rotulo="Olhos"
              opcoes={OLHOS_CORES.map((o) => ({ id: o.id, nome: o.nome, cor: o.x }))}
              valor={rascunho.olhos}
              aoMudar={(olhos) => mudar({ olhos })}
            />
            <Seletor
              rotulo="Cabelo"
              opcoes={CABELOS.map((c) => ({ valor: c.id, rotulo: c.nome }))}
              valor={rascunho.cabelo}
              aoMudar={(cabelo) => mudar({ cabelo })}
            />
            <Cores
              rotulo="Cor do cabelo"
              opcoes={CORES_DE_CABELO.map((c) => ({ id: c.id, nome: c.nome, cor: c.h }))}
              valor={rascunho.corDoCabelo}
              aoMudar={(corDoCabelo) => mudar({ corDoCabelo })}
            />
          </div>
        )}

        {aba === "itens" && (
          <div className="flex flex-col gap-5">
            {PARTES.map((parte) => (
              <ItensDaParte
                key={parte}
                parte={parte}
                avatar={rascunho}
                estatisticas={estatisticas}
                aoEscolher={(id) => equipar(parte, id)}
              />
            ))}
          </div>
        )}

        {aba === "conjuntos" && (
          <ul className="flex flex-col gap-2">
            {CONJUNTOS.map((c) => {
              const trancados = Object.values(c.itens).filter((id) => !itemLiberado(rascunho, id));
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setRascunho((a) => aplicarConjunto(a, c))}
                    className="cartao tocavel flex min-h-14 w-full cursor-pointer flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left"
                  >
                    <span className="font-semibold">{c.nome}</span>
                    <span className="text-ink-muted text-body-sm">
                      {Object.values(c.itens)
                        .map((id) => ITENS.find((i) => i.id === id)?.nome)
                        .join(" · ")}
                      {trancados.length > 0 &&
                        ` (sem ${trancados.map((id) => ITENS.find((i) => i.id === id)?.nome.toLowerCase()).join(", ")}: ainda trancado)`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Segmentado>

      <button
        type="button"
        onClick={() => aoSalvar(rascunho)}
        className="botao-primario min-h-14 cursor-pointer font-semibold"
      >
        Salvar
      </button>
    </div>
  );
}

/** As opções de uma parte. Item de conquista trancado: desabilitado, com cadeado e o que falta. */
function ItensDaParte({
  parte,
  avatar,
  estatisticas,
  aoEscolher,
}: {
  parte: Parte;
  avatar: AvatarSalvo;
  estatisticas: EstatisticasDeEstudo;
  aoEscolher: (id: string) => void;
}) {
  const id = useId();
  const itens = ITENS.filter((i) => i.parte === parte);
  const valor =
    avatar.equipados[parte] ??
    (OPCIONAIS.has(parte) ? NENHUM : PADRAO[parte as keyof typeof PADRAO]);
  const opcoes = [...(OPCIONAIS.has(parte) ? [{ id: NENHUM, nome: "Nenhum" }] : []), ...itens];
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-ink-muted text-body-sm font-medium">
        {ROTULO_DA_PARTE[parte]}
      </span>
      <RadioGroup.Root
        aria-labelledby={id}
        value={valor}
        onValueChange={aoEscolher}
        className="flex flex-wrap gap-2"
      >
        {opcoes.map((o) => {
          const liberado = itemLiberado(avatar, o.id);
          const progresso = liberado ? null : progressoDaConquista(o.id, estatisticas);
          return (
            <RadioGroup.Item
              key={o.id}
              value={o.id}
              disabled={!liberado}
              aria-description={
                progresso ? `Trancado: ${progresso.regra} (${progresso.texto})` : undefined
              }
              className="botao-vidro text-body-sm data-[state=checked]:bg-accent data-[state=checked]:text-on-accent flex min-h-11 cursor-pointer items-center gap-1.5 px-4 font-semibold data-[state=checked]:border-transparent disabled:cursor-not-allowed"
            >
              {liberado ? (
                <RadioGroup.Indicator asChild>
                  <Check className="size-4" aria-hidden />
                </RadioGroup.Indicator>
              ) : (
                <Lock className="size-4" aria-hidden />
              )}
              <span className="flex flex-col items-start leading-tight">
                {o.nome}
                {progresso && (
                  <span className="text-ink-muted text-[12px] font-normal">
                    {progresso.regra} · {progresso.texto}
                  </span>
                )}
              </span>
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
    </div>
  );
}
