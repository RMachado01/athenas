import { CATALOGO } from "../pets/catalogo";
import { ESPECIES, ESTADOS_DO_PET, quadrosDoPet } from "../pets/especies";
import { Sprite } from "./sprite";

/**
 * Folha de contato da arte: para cada espécie e cor, os 4 estados animados (e, embaixo, os
 * quadros parados ampliados). Serve para o dono e para os testes olharem o desenho.
 */
export function LaboratorioPixel() {
  return (
    <main className="flex flex-col gap-8 p-5">
      <h1 className="font-display text-display-lg">Arte pixel</h1>
      {ESPECIES.map((especie) => {
        const info = CATALOGO[especie];
        return (
          <section key={especie} aria-labelledby={`lab-${especie}`} className="flex flex-col gap-3">
            <h2 id={`lab-${especie}`} className="text-heading-2">
              {info.nome}
            </h2>
            {info.variacoes.map((v) => (
              <div key={v.id} className="cartao flex flex-wrap items-end gap-4 rounded-xl p-3">
                <span className="text-body-sm w-24 shrink-0 font-semibold">{v.nome}</span>
                {ESTADOS_DO_PET.map((estado) => (
                  <figure key={estado} className="flex flex-col items-center gap-1">
                    <Sprite
                      quadros={quadrosDoPet(especie, estado)}
                      paleta={v.paleta}
                      escala={4}
                      duracaoMs={estado === "andando" ? 450 : 900}
                      rotulo={`${info.nome} ${v.nome} ${estado}`}
                    />
                    <figcaption className="text-ink-muted text-[12px]">{estado}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </section>
        );
      })}
    </main>
  );
}
