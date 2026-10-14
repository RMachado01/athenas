"use client";

import { Check } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ConexaoGoogle } from "@/features/calendar/components/conexao-google";
import { useAtualizarPerfil, usePerfil } from "@/lib/perfil";
import { useMontado } from "@/lib/usar-montado";
import {
  CAMPOS_DE_ESTUDO,
  MODOS_DE_MOVIMENTO,
  validarCampoDeEstudo,
  type CampoDeEstudo,
} from "@/lib/preferencias";
import {
  aplicarTema,
  ehOpcaoDeTema,
  OPCOES_DE_TEMA,
  ROTULOS_DE_TEMA,
  type OpcaoDeTema,
} from "@/lib/tema";

/** Observa o <html data-theme>: qualquer troca (clique, outra aba, script) re-renderiza. */
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
 * Personalização (MOBILE PRIMEIRO): aparência (7 temas + automático, com prévia real de cada um),
 * movimento e preferências de estudo (meta diária, sequência, Pomodoro). Tudo salvo no perfil,
 * então vale em qualquer aparelho. O tema também vai para o cookie, para abrir sem "flash".
 */
export function PersonalizacaoView() {
  const { data: perfilDoCache } = usePerfil();
  // Até montar, finge que o perfil ainda não chegou: o servidor desenhou "Carregando…", e o
  // perfil pode já estar no cache quando o React hidrata esta parte (o provedor já o busca).
  // Usar o cache direto faria a 1ª renderização do cliente divergir do HTML do servidor.
  const montado = useMontado();
  const perfil = montado ? perfilDoCache : undefined;
  const salvar = useAtualizarPerfil();
  const temaAtual = useSyncExternalStore(assinar, temaAtualDoHtml, () => "auto" as const);

  function escolherTema(id: OpcaoDeTema) {
    trocarComCirculo(() => aplicarTema(id));
    salvar.mutate({ theme: id });
  }

  return (
    <main className="flex flex-col gap-8 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-1">
        <span className="text-ink-muted text-body-sm font-medium">Do seu jeito</span>
        <h1 className="font-display text-display-lg">Personalização</h1>
        <AvisoDeSalvo
          salvando={salvar.isPending}
          salvou={salvar.isSuccess}
          vez={salvar.submittedAt}
        />
      </header>

      {/* Aparência */}
      <section aria-labelledby="titulo-aparencia" className="flex flex-col gap-3">
        <h2 id="titulo-aparencia" className="text-heading-2">
          Aparência
        </h2>
        {/* RadioGroup do Radix: setas do teclado andam entre os temas (antes só o Tab). */}
        <RadioGroup.Root
          aria-label="Tema"
          value={temaAtual}
          onValueChange={(v) => ehOpcaoDeTema(v) && escolherTema(v)}
          className="grid grid-cols-2 gap-3"
        >
          {OPCOES_DE_TEMA.map((id) => (
            <CartaoDeTema key={id} id={id} marcado={temaAtual === id} />
          ))}
        </RadioGroup.Root>
      </section>

      {/* Movimento */}
      <section aria-labelledby="titulo-movimento" className="flex flex-col gap-3">
        <h2 id="titulo-movimento" className="text-heading-2">
          Movimento
        </h2>
        <RadioGroup.Root
          aria-label="Animações"
          value={perfil?.motion ?? "system"}
          onValueChange={(v) => {
            const modo = MODOS_DE_MOVIMENTO.find((m) => m.id === v);
            if (modo) salvar.mutate({ motion: modo.id });
          }}
          className="flex flex-col gap-2"
        >
          {MODOS_DE_MOVIMENTO.map((modo) => {
            const marcado = (perfil?.motion ?? "system") === modo.id;
            return (
              <RadioGroup.Item
                key={modo.id}
                value={modo.id}
                className={`cartao flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl px-4 text-left ${
                  marcado ? "ring-accent ring-2" : ""
                }`}
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{modo.nome}</span>
                  <span className="text-ink-muted text-body-sm">{modo.descricao}</span>
                </span>
                {marcado && <Check className="text-accent size-5 shrink-0" aria-hidden />}
              </RadioGroup.Item>
            );
          })}
        </RadioGroup.Root>
      </section>

      <ConexaoGoogle />

      {/* Estudo */}
      <section aria-labelledby="titulo-estudo" className="flex flex-col gap-3">
        <h2 id="titulo-estudo" className="text-heading-2">
          Estudo
        </h2>
        <div className="cartao flex flex-col divide-y divide-[var(--glass-border)] rounded-xl">
          {perfil ? (
            CAMPOS_DE_ESTUDO.map((def) => (
              <CampoNumerico
                key={def.campo}
                campo={def.campo}
                rotulo={def.rotulo}
                ajuda={def.ajuda}
                unidade={def.unidade}
                valor={perfil[def.campo]}
                aoSalvar={(valor) => salvar.mutate({ [def.campo]: valor })}
              />
            ))
          ) : (
            <p className="text-ink-muted p-4" aria-busy="true">
              Carregando…
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

/** Cartão de um tema com mini-prévia nas cores REAIS dele (wrapper com data-theme próprio). */
function CartaoDeTema({ id, marcado }: { id: OpcaoDeTema; marcado: boolean }) {
  const { nome, descricao } = ROTULOS_DE_TEMA[id];
  return (
    <RadioGroup.Item
      value={id}
      aria-label={`${nome}. ${descricao}`}
      data-testid={`tema-${id}`}
      onPointerDown={guardarPontoDoToque}
      className={`cartao flex cursor-pointer flex-col gap-3 rounded-xl p-2.5 text-left ${
        marcado ? "ring-accent ring-2" : ""
      }`}
    >
      {id === "auto" ? (
        <span className="grid h-20 grid-cols-2 overflow-hidden rounded-lg" aria-hidden="true">
          <Previa tema="camel" />
          <Previa tema="ponderosa" />
        </span>
      ) : (
        <span className="block h-20 overflow-hidden rounded-lg" aria-hidden="true">
          <Previa tema={id} />
        </span>
      )}
      <span className="flex items-start justify-between gap-2 px-1 pb-0.5">
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{nome}</span>
          <span className="text-ink-muted text-body-sm truncate">{descricao}</span>
        </span>
        {marcado && <Check className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />}
      </span>
    </RadioGroup.Item>
  );
}

// ---------------------------------------------------------------------------
// Troca de tema em círculo: o tema novo "nasce" do ponto tocado e se espalha pela tela
// (View Transitions do navegador). Sem suporte, ou com "menos movimento", troca na hora.
// ---------------------------------------------------------------------------
let pontoDoToque = { x: 0, y: 0 };
function guardarPontoDoToque(e: { clientX: number; clientY: number }) {
  pontoDoToque = { x: e.clientX, y: e.clientY };
}
function trocarComCirculo(trocar: () => void) {
  const html = document.documentElement;
  const menosMovimento =
    html.dataset.motion === "reduced" ||
    (html.dataset.motion !== "full" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (menosMovimento || typeof document.startViewTransition !== "function") return trocar();
  const { x, y } = pontoDoToque;
  // Raio até o canto mais distante: o círculo cobre a tela inteira no fim.
  const raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transicao = document.startViewTransition(trocar);
  // Trocar de tema de novo antes do fim "pula" a transição anterior: isso rejeita as promessas
  // dela, o que é esperado (o tema novo é aplicado do mesmo jeito).
  transicao.finished.catch(() => {});
  transicao.updateCallbackDone.catch(() => {});
  transicao.ready
    .then(() =>
      html.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        {
          duration: 420,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      ),
    )
    .catch(() => {});
}

/**
 * "Salvando…" / "Salvo" ao lado do título: tudo aqui salva sozinho, então a pessoa precisa
 * de um sinal de que deu certo. Região "status": o leitor de tela anuncia sem roubar o foco.
 * O "Salvo" some depois de 2 s (`vez` muda a cada envio e reinicia a contagem).
 */
function AvisoDeSalvo({
  salvando,
  salvou,
  vez,
}: {
  salvando: boolean;
  salvou: boolean;
  vez: number;
}) {
  // Guardamos QUAL envio já "venceu" os 2 s; o aviso aparece enquanto o envio atual não venceu.
  const [vencido, setVencido] = useState(0);
  useEffect(() => {
    if (!salvou) return;
    const t = setTimeout(() => setVencido(vez), 2000);
    return () => clearTimeout(t);
  }, [salvou, vez]);
  const visivel = vencido !== vez;

  return (
    <p role="status" className="text-ink-muted text-body-sm flex min-h-5 items-center gap-1.5">
      {salvando ? (
        "Salvando…"
      ) : salvou && visivel ? (
        <>
          <Check className="text-accent size-4" aria-hidden />
          Salvo
        </>
      ) : null}
    </p>
  );
}

function Previa({ tema }: { tema: string }) {
  return (
    <span
      data-theme={tema}
      className="relative flex size-full flex-col justify-end gap-1.5 p-2"
      style={{ background: "var(--bg)" }}
    >
      <span
        className="absolute -top-4 -left-4 size-14 rounded-full blur-xl"
        style={{ background: "var(--ambient-1)" }}
      />
      <span
        className="relative h-2 w-3/4 rounded-full"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      />
      <span className="relative h-2 w-1/2 rounded-full" style={{ background: "var(--accent)" }} />
    </span>
  );
}

/** Campo numérico que valida ao sair (ou apertar Enter) e só então salva. */
function CampoNumerico({
  campo,
  rotulo,
  ajuda,
  unidade,
  valor,
  aoSalvar,
}: {
  campo: CampoDeEstudo;
  rotulo: string;
  ajuda: string;
  unidade: string;
  valor: number;
  aoSalvar: (valor: number) => void;
}) {
  const id = useId();
  const idDoErro = useId();
  // `rascunho` só existe enquanto a pessoa edita; fora disso mostramos o valor salvo.
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Esc cancela: sem isto, o blur que vem logo depois confirmaria o texto antigo do rascunho.
  const cancelado = useRef(false);

  function confirmar() {
    if (cancelado.current) {
      cancelado.current = false;
      return;
    }
    if (rascunho === null) return;
    const r = validarCampoDeEstudo(campo, rascunho);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setErro(null);
    setRascunho(null);
    if (r.valor !== valor) aoSalvar(r.valor);
  }

  return (
    <div className="flex flex-col gap-1 p-4">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="flex min-w-0 flex-col">
          <span className="font-semibold">{rotulo}</span>
          <span className="text-ink-muted text-body-sm">{ajuda}</span>
        </label>
        <span className="flex shrink-0 items-center gap-2">
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            value={rascunho ?? String(valor)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setRascunho(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelado.current = true;
                setRascunho(null);
                setErro(null);
                e.currentTarget.blur();
              }
            }}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idDoErro : undefined}
            className="campo rounded-pill min-h-11 w-20 bg-transparent px-3 text-center text-[16px] tabular-nums outline-none"
          />
          <span className="text-ink-muted text-body-sm w-9">{unidade}</span>
        </span>
      </div>
      {erro && (
        <p id={idDoErro} role="alert" className="text-danger text-body-sm">
          {erro}
        </p>
      )}
    </div>
  );
}
