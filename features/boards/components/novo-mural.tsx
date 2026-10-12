"use client";

import { Check } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTrilhas } from "@/features/tracks/queries";
import {
  CORES_DO_MURAL,
  ICONES_DO_MURAL,
  varDaCor,
  type CorDoMural,
  type IconeDoMural,
} from "../cores";
import { useCriarMural } from "../queries";
import { COMPONENTE_DO_ICONE } from "./icone-do-mural";

/** Formulário de novo mural (dentro de uma folha inferior): nome, cor, ícone e trilha. */
export function NovoMural({ aoCriar }: { aoCriar: (id: string) => void }) {
  const criar = useCriarMural();
  const { data: trilhas = [] } = useTrilhas();
  const [titulo, setTitulo] = useState("");
  const [cor, setCor] = useState<CorDoMural>("amarelo");
  const [icone, setIcone] = useState<IconeDoMural>("layout-dashboard");
  const [trilhaId, setTrilhaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ids = { titulo: useId(), erro: useId(), trilha: useId() };

  function enviar(e: FormEvent) {
    e.preventDefault();
    const nome = titulo.trim().slice(0, 80);
    if (!nome) {
      setErro("Dê um nome para o mural.");
      document.getElementById(ids.titulo)?.focus();
      return;
    }
    const id = crypto.randomUUID();
    criar.mutate({ id, titulo: nome, cor, icone, trilhaId });
    aoCriar(id);
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={ids.titulo} className="text-ink-muted text-body-sm font-medium">
          Nome
        </label>
        <input
          id={ids.titulo}
          value={titulo}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => {
            setTitulo(e.target.value);
            if (erro) setErro(null);
          }}
          placeholder="Ex.: Plano do ENEM"
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

      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink-muted text-body-sm mb-2 font-medium">Cor</legend>
        <div role="radiogroup" aria-label="Cor do mural" className="flex flex-wrap gap-2.5">
          {CORES_DO_MURAL.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={cor === c.id}
              aria-label={c.nome}
              onClick={() => setCor(c.id)}
              className={`grid size-11 cursor-pointer place-items-center rounded-full ${
                cor === c.id ? "ring-accent ring-2 ring-offset-2 ring-offset-[var(--bg)]" : ""
              }`}
              style={{ background: varDaCor(c.id) }}
            >
              {cor === c.id && <Check className="size-5 text-black/70" aria-hidden />}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-ink-muted text-body-sm mb-2 font-medium">Ícone</legend>
        <div role="radiogroup" aria-label="Ícone do mural" className="grid grid-cols-5 gap-2">
          {ICONES_DO_MURAL.map((i) => {
            const Icone = COMPONENTE_DO_ICONE[i];
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={icone === i}
                aria-label={i}
                onClick={() => setIcone(i)}
                className={`botao-vidro grid min-h-11 cursor-pointer place-items-center ${
                  icone === i ? "ring-accent ring-2" : ""
                }`}
              >
                <Icone className="size-5" aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>

      {trilhas.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.trilha} className="text-ink-muted text-body-sm font-medium">
            Trilha (opcional)
          </label>
          <select
            id={ids.trilha}
            value={trilhaId ?? ""}
            onChange={(e) => setTrilhaId(e.target.value || null)}
            className="campo rounded-pill min-h-12 w-full cursor-pointer bg-transparent px-5 text-[16px]"
          >
            <option value="">Nenhuma</option>
            {trilhas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="botao-primario min-h-14 cursor-pointer font-semibold">
        Criar mural
      </button>
    </form>
  );
}
