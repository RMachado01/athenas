# Plano — Pets aprovados, fatia A

Spec: `docs/superpowers/specs/2026-10-21-pets-aprovados-design.md`. Um commit por passo.

1. **Arte oficial.** Mover `features/pixel/conceitos/*` para `features/pixel/pets/`
   (`animacoes.ts`, `pecas-extras.ts`). `quadrosDoConceito` → `quadrosDaAnimacao`.
   `EstadoDoPet` (10 estados), `ANIMACAO_DO_ESTADO`, `quadrosDoPet(especie, estado, opcoes)`
   com cache e `tamanhoDoPet(especie)` passam a viver em `animacoes.ts`; sai o sistema antigo de
   poses de `especies.ts`. Ajustar laboratório, gerador do quadro e testes.
2. **Pelagens.** `Variacao.padrao?`; as 6 cores novas entram no `CATALOGO`;
   `paletaDoPet(variacao)` junta a paleta extra (acessórios/padrões). Botão de cor em duas cores
   para o gato-banana. Testes do catálogo.
3. **Cérebro.** Estados novos em `proximaDecisao`; `carinho()` = pulinho → feliz. Testes.
4. **Sala.** `PetNaSala` usa ciclo de cada animação, balão E1 no carinho, frases novas para o
   leitor de tela.
5. **Acessório.** Migração `pet_accessory`, tipos, Supabase falso, `usePerfilPixel`/`useSalvarPet`,
   escolha + prévia na folha. Testes de banco, e2e e a11y.
6. Rodar tudo (unidade, banco, e2e, a11y, build), PR para a **main**, pedir aprovação da migração.
