import { describe, expect, it } from "vitest";
import { quadrosDoAvatar, tamanhoDoAvatar } from "@/features/pixel/avatar/montar";
import {
  ACESSORIOS_DO_AVATAR,
  CABECA,
  CABECA_PISCANDO,
  CABELOS,
  CORES_DE_CABELO,
  PELES,
  POSES,
  ROUPAS,
  paletaDoAvatar,
} from "@/features/pixel/avatar/pecas";
import { validarGrade } from "@/features/pixel/motor";
import { PALETA_EXTRA } from "@/features/pixel/pets/pecas-extras";

/** Avatar (conceito): peças retangulares, letras com cor e todos os quadros do mesmo tamanho. */
const LETRAS = new Set([..."oszebmhjcdwtq", ...Object.keys(PALETA_EXTRA)]);

describe("peças do avatar", () => {
  it("toda peça é retangular e só usa letras conhecidas", () => {
    const pecas: [string, readonly string[]][] = [
      ["cabeca", CABECA],
      ["cabeca piscando", CABECA_PISCANDO],
      ...CABELOS.flatMap((c) => [
        [`${c.id}/frente`, c.frente] as [string, readonly string[]],
        ...(c.tras ? [[`${c.id}/tras`, c.tras] as [string, readonly string[]]] : []),
      ]),
      ...ACESSORIOS_DO_AVATAR.map((a) => [a.id, a.grade] as [string, readonly string[]]),
      ...ROUPAS.flatMap((r) =>
        r.detalhe ? [[r.id, r.detalhe] as [string, readonly string[]]] : [],
      ),
      ...POSES.flatMap((p) =>
        p.quadros.flatMap((q, i) => [
          [`${p.id}/${i}/torso`, q.torso] as [string, readonly string[]],
          [`${p.id}/${i}/pernas`, q.pernas] as [string, readonly string[]],
        ]),
      ),
    ];
    for (const [nome, g] of pecas) expect(validarGrade(g, LETRAS), nome).toEqual([]);
  });

  it("os cabelos deixam os olhos à mostra (o rosto nunca fica coberto)", () => {
    // Olhos: colunas 3 e 8 da cabeça, linhas 5 e 6 → no cabelo (x-1, y-1): colunas 4 e 9, linhas 6 e 7.
    for (const c of CABELOS) {
      for (const [lin, col] of [
        [6, 4],
        [6, 9],
        [7, 4],
        [7, 9],
      ] as const) {
        expect(c.frente[lin]?.[col] ?? ".", `${c.id} cobre o olho`).toBe(".");
      }
    }
  });

  it("todas as poses e combinações têm o mesmo tamanho", () => {
    const { largura, altura } = tamanhoDoAvatar();
    for (const pose of POSES) {
      for (const cabelo of CABELOS) {
        for (const acessorio of [null, ...ACESSORIOS_DO_AVATAR.map((a) => a.id)]) {
          for (const q of quadrosDoAvatar(pose.id, {
            cabelo: cabelo.id,
            roupa: "moletom",
            acessorio,
          })) {
            expect([q[0]!.length, q.length], `${pose.id}/${cabelo.id}/${acessorio}`).toEqual([
              largura,
              altura,
            ]);
          }
        }
      }
    }
  });

  it("toda combinação de pele, cabelo e roupa tem cor para cada letra desenhada", () => {
    for (const pele of PELES) {
      for (const cor of CORES_DE_CABELO) {
        for (const roupa of ROUPAS) {
          const paleta = { ...PALETA_EXTRA, ...paletaDoAvatar(pele, cor, roupa) };
          for (const pose of POSES) {
            for (const acessorio of [null, ...ACESSORIOS_DO_AVATAR.map((a) => a.id)]) {
              for (const q of quadrosDoAvatar(pose.id, {
                cabelo: "longo",
                roupa: roupa.id,
                acessorio,
              })) {
                for (const letra of new Set(q.join("").replaceAll(".", ""))) {
                  expect(paleta[letra], `${roupa.id} sem cor para "${letra}"`).toMatch(
                    /^#[0-9a-f]{6}$/i,
                  );
                }
              }
            }
          }
        }
      }
    }
  });
});
