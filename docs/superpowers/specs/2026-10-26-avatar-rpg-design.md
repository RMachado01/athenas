# Avatar RPG na Sala — design

**Data:** 2026-10-26 · **Aprovado no quadro (rodada 2):** estilo B2, conjuntos J1–J6, itens
CA1–CA4, RO1–RO2, BL1–BL5, PE1–PE4, PS1–PS3, CO1–CO3, MA1–MA4, poses P1–P5, peles T1–T4,
olhos O1–O5, cabelos H1–H6, cores K1–K8, cenas CENA1–CENA2 e a ideia G1 (itens como
conquista). Fora: RO3 (curativo, removido). Peles 5 e 6: refeitas na rodada 3, aguardando
escolha (as 6 candidatas ficam no catálogo até a escolha; depois sobram só as aprovadas).

## O que entra
1. **Avatar na Sala**: sentado na cadeira à esquerda da mesa da biblioteca.
   - escrevendo (P3) quando há Pomodoro de foco rodando; lendo (P4) no resto do tempo;
   - ao abrir a Sala, acena (P5) uma vez antes de sentar;
   - tocar no avatar abre o **editor**. Leitor de tela: "Editar seu avatar".
2. **Editor do avatar** (folha inferior "Seu avatar"), mobile primeiro:
   - prévia grande, animada (parado), que acompanha cada escolha;
   - abas **Aparência** (pele, olhos, cabelo, cor do cabelo) e **Itens** (uma linha por parte:
     cabeça, rosto, blusa, pernas, pés, costas, mão; "Nenhum" onde faz sentido);
   - **Conjuntos** prontos (J1–J6): aplicam de uma vez só os itens já liberados;
   - "Salvar" grava; fechar sem salvar descarta.
3. **Conquistas (G1)**: 4 itens especiais começam trancados e são liberados estudando:
   | item | como liberar |
   |---|---|
   | Chapéu de mago | 10 horas de foco (soma dos dias de foco carregados) |
   | Coroa de louros | sequência de 7 dias (melhor sequência) |
   | Capa de herói | 30 tarefas concluídas |
   | Varinha mágica | 100 flashcards revisados |
   - item trancado aparece com cadeado e o texto do que falta ("faltam 3 h de foco");
   - ao liberar: aviso ("Novo item para o avatar: Chapéu de mago!") e o item fica liberado para
     sempre (guardado na lista `desbloqueados`).
   - Sem compra e sem moeda. É só para a própria pessoa (camada solo).

## Dados (sem migração)
`pixel_profiles.avatar` (jsonb, já existe) guarda:
`{ v: 1, pele, olhos, cabelo, corDoCabelo, equipados: { parte: id }, desbloqueados: [id] }`.
O app lê com `lerAvatar()`, que ignora o que não reconhece (id antigo/estranho vira o padrão) e
nunca deixa equipado um item trancado. Gravar o avatar não mexe no pet (upsert só com
`avatar`); sem pet, a linha existe só com o avatar (a regra do banco permite).

## Arte
Os arquivos de conceito viram oficiais (`features/pixel/avatar/`). Uma cadeira de madeira entra
no desenho da sala, à esquerda da mesa. Tema mono: a sala fica cinza, o avatar continua
colorido (camada de cima, como o pet). "Reduzir movimento": o avatar fica parado no 1º quadro.

## Testes
Unidade: `lerAvatar` (dados estranhos, item trancado), conquistas (cada regra, texto do que
falta), conjuntos (só itens liberados). E2E: avatar na Sala, editor (aparência, itens, salvar,
descartar), item trancado, liberar conquista com aviso, Pomodoro → escrevendo. A11y nos 8 temas.
