"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useBaralhos, useSalvarCartao, type Cartao } from "../queries";

/** Folha de novo/editar cartão feito à mão. "Salvar e criar outro" mantém o baralho. */
export function FormularioDeCartao({
  cartao,
  baralhoInicial,
  aoTerminar,
}: {
  cartao?: Cartao;
  baralhoInicial: string;
  aoTerminar: () => void;
}) {
  const { data: baralhos = [] } = useBaralhos();
  const salvar = useSalvarCartao();
  const [frente, setFrente] = useState(cartao?.frente ?? "");
  const [verso, setVerso] = useState(cartao?.verso ?? "");
  const [baralhoId, setBaralhoId] = useState(cartao?.baralhoId ?? baralhoInicial);
  const [erro, setErro] = useState<{ campo: "frente" | "verso"; texto: string } | null>(null);
  const frenteRef = useRef<HTMLTextAreaElement>(null);
  const ids = { frente: useId(), verso: useId(), baralho: useId(), erro: useId() };

  function enviar(e: FormEvent, outro: boolean) {
    e.preventDefault();
    if (!frente.trim()) return setErro({ campo: "frente", texto: "Escreva a pergunta (frente)." });
    if (!verso.trim()) return setErro({ campo: "verso", texto: "Escreva a resposta (verso)." });
    salvar.mutate({
      id: cartao?.id ?? crypto.randomUUID(),
      novo: !cartao,
      frente,
      verso,
      baralhoId,
    });
    if (outro) {
      setFrente("");
      setVerso("");
      frenteRef.current?.focus();
    } else {
      aoTerminar();
    }
  }

  const campo =
    "campo w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-[16px] outline-none field-sizing-content min-h-24";
  return (
    <form onSubmit={(e) => enviar(e, false)} noValidate className="flex flex-col gap-3">
      <label htmlFor={ids.frente} className="text-ink-muted text-body-sm font-medium">
        Frente (pergunta)
      </label>
      <textarea
        ref={frenteRef}
        id={ids.frente}
        value={frente}
        maxLength={2000}
        autoFocus
        onChange={(e) => {
          setFrente(e.target.value);
          setErro(null);
        }}
        aria-invalid={erro?.campo === "frente" ? true : undefined}
        aria-describedby={erro?.campo === "frente" ? ids.erro : undefined}
        className={campo}
      />
      <label htmlFor={ids.verso} className="text-ink-muted text-body-sm font-medium">
        Verso (resposta)
      </label>
      <textarea
        id={ids.verso}
        value={verso}
        maxLength={2000}
        onChange={(e) => {
          setVerso(e.target.value);
          setErro(null);
        }}
        aria-invalid={erro?.campo === "verso" ? true : undefined}
        aria-describedby={erro?.campo === "verso" ? ids.erro : undefined}
        className={campo}
      />
      {erro && (
        <p id={ids.erro} role="alert" className="text-danger text-body-sm">
          {erro.texto}
        </p>
      )}
      <label htmlFor={ids.baralho} className="text-ink-muted text-body-sm font-medium">
        Baralho
      </label>
      <select
        id={ids.baralho}
        value={baralhoId}
        onChange={(e) => setBaralhoId(e.target.value)}
        className="campo rounded-pill min-h-12 w-full bg-transparent px-5 text-[16px]"
      >
        {baralhos.map((b) => (
          <option key={b.id} value={b.id}>
            {b.nome}
          </option>
        ))}
      </select>
      <div className="flex flex-col gap-2 pt-1">
        <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
          {cartao ? "Salvar" : "Criar cartão"}
        </button>
        {!cartao && (
          <button
            type="button"
            onClick={(e) => enviar(e, true)}
            className="botao-vidro min-h-12 cursor-pointer font-semibold"
          >
            Salvar e criar outro
          </button>
        )}
      </div>
    </form>
  );
}
