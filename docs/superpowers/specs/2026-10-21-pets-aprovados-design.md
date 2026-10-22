# Pets aprovados na Sala — design

**Data:** 2026-10-21 · **Origem:** quadro de conceitos (rodadas 1 e 2), tudo aprovado pelo Renan.

## O que entra

Tudo que foi aprovado no quadro: movimentos M1–M10, 6 pelagens novas, acessórios A1–A6,
reações E1–E8 e ações S1–S6. É grande demais para um PR só, então são **duas fatias**:

### Fatia A (este PR): a arte e o "cérebro" novo
1. **Movimentos oficiais.** Os 4 desenhos antigos (parado, andando, dormindo, feliz) dão lugar
   às 10 animações aprovadas. Cada estado do pet aponta para uma animação:

   | estado        | animação | quando                                        |
   |---------------|----------|-----------------------------------------------|
   | parado        | M1       | padrão                                        |
   | andando       | M2       | passeio                                       |
   | correndo      | M3       | só pelas ações da fatia B (bolinha, comemorar)|
   | pulando       | M4       | carinho (S1), antes do "feliz"                |
   | espreguicando | M5       | ao acordar                                    |
   | descansando   | M6       | deitadinho acordado                           |
   | bocejando     | M7       | de vez em quando, parado                      |
   | comendo       | M8       | só pela ação Petisco (fatia B)                |
   | dormindo      | M9       | cochilo                                       |
   | feliz         | M10      | depois do pulinho do carinho                  |

2. **Cérebro** (`proximaDecisao`, função pura testada):
   - parado/feliz → anda, fica parado, boceja, descansa ou dorme;
   - bocejando (1 ciclo) → parado, descansando ou dormindo;
   - descansando → parado ou dormindo;
   - dormindo → continua dormindo ou **espreguiça** (1 ciclo) → parado;
   - carinho = **pulinho** (1 ciclo) → feliz → normal. Mostra o balão **E1** (coração).
   - correndo/comendo (fatia B) → parado.
3. **Pelagens novas** no catálogo: tigrado, frajola, siamês (gato), mico-leão-dourado (macaco),
   ruiva (capivara), banana madura (gato-banana). Uma variação pode ter um **padrão** (listras,
   máscara) além da paleta. O id vai no `pet_variant` que já existe (sem migração).
4. **Acessórios** (nenhum + 6) escolhidos na folha "Adotar/Editar pet", com prévia.
   Guardado numa coluna nova `pet_accessory` (texto com a mesma regra de espécie/cor; vazio =
   sem acessório). **Precisa de migração → aprovação do Renan antes de aplicar.** O app ignora
   um id desconhecido (mostra sem acessório).
5. Botão de cor do gato-banana mostra **duas cores** (banana + gatinho): antes duas variações
   com o mesmo gatinho ficavam iguais.

### Fatia B (próximo PR): reações e ações ligadas ao estudo
E2–E8 com seus gatilhos (prazo hoje, sumiu, Pomodoro, meta, estudo longo, nota/flashcard nova,
noite) e ações S2–S6 (petisco + tigela, bolinha, estudar junto, comemorar, cochilo quando você
para). Depende de sinais de outras áreas (Pomodoro, tarefas, notas) e terá spec própria.

## Regras que continuam
- Todas as animações de uma espécie usam a **mesma caixa** (cobre todas as animações e
  acessórios), então o pet não "pula" de lugar ao trocar de estado ou de acessório.
- Patas sempre coladas no corpo (teste `patas-coladas`).
- "Reduzir movimento": o pet fica quieto; o carinho só mostra o coração.
- Tema mono: cenário cinza, pet e acessório coloridos.

## Testes
Unidade (desenhos, catálogo, cérebro), banco (PGlite: coluna nova e sua regra), e2e/a11y da Sala
(escolher acessório e pelagem nova, carinho com pulinho) nos 8 temas.
