# Pets: reações e ações ligadas ao estudo (fatia B) — design

**Data:** 2026-10-22 · **Aprovado no quadro:** E1–E8 (reações) e S1–S6 (ações). E1 e S1 já
entraram na fatia A (balão de coração no carinho, pulinho).

## Ideia
O pet "percebe" o que está acontecendo nos seus estudos e reage com um balãozinho; embaixo da
sala aparece um **recado** em texto (com link quando faz sentido). Você também pode **brincar**
com ele (petisco, bolinha). Tudo é calculado no aparelho a partir do que o app já sabe; **sem
migração** e sem mandar nada novo para o banco.

## Sinais (de onde vem cada coisa)
| sinal | fonte |
|---|---|
| tarefas de hoje / atrasadas (abertas, só raízes) | `useTarefas` (grupo calculado pelo banco no fuso) |
| Pomodoro rodando | estado do cronômetro no `localStorage` (`athenas-foco`, o mesmo do Foco) |
| minutos de foco hoje, meta do dia | `useDiasDeFoco` + `perfil.daily_goal_min` |
| dias sem estudar | último dia com foco em `useDiasDeFoco` |
| notas novas desde a última visita à Sala | `useNotas` (`updated_at`) + última visita no `localStorage` |
| dias sem vir à Sala | última visita no `localStorage` (`athenas-sala-visita`) |
| é noite | hora no fuso do perfil (22h às 5h) |

## Reações (função pura `reacoesDoPet(sinais)`, em ordem de prioridade)
| código | balão | quando | recado |
|---|---|---|---|
| E4 | nota musical | Pomodoro de foco rodando | "estudando junto com você" |
| E2 | exclamação | tarefas atrasadas ou para hoje | "N tarefas para hoje" → link Tarefas |
| E3 | interrogação | 3+ dias sem vir à Sala | "que saudade! faz N dias" |
| E6 | gota de suor | foco hoje ≥ 1,5× a meta (mín. 150 min) | "você estudou muito hoje: que tal uma pausa?" |
| E5 | estrelas | meta do dia batida | "meta de hoje batida!" |
| E7 | lâmpada | notas novas/editadas desde a última visita | "N notas novas" → link Notas |
| E8 | sono | 2+ dias sem estudar, ou de noite | "bora estudar um pouquinho?" / "já é tarde…" → link Foco |

O balão sobre o pet mostra **uma** reação por vez e troca a cada 6 s (com "reduzir movimento",
fica na primeira). A lista de recados é texto comum (leitor de tela lê tudo, sem animação).

## Ações
- **S2 Petisco** (botão "Dar petisco"): aparece a tigela num canto, o pet anda até ela, come
  (M8) e fica feliz.
- **S3 Bolinha** (botão "Jogar bolinha"): a bolinha rola para um ponto da sala, o pet **corre**
  (M3, o dobro da velocidade) até ela e dá um pulinho.
- **S4 Estudar junto**: com Pomodoro rodando, o pet fica deitadinho (M6) ao lado de um livro e
  não passeia. Na tela de **Foco** aparece um pet pequeno fazendo o mesmo.
- **S5 Comemorar**: ao concluir um foco, o pet da tela de Foco pula com o balão de estrelas; na
  Sala, quando a meta do dia está batida, ele comemora ao abrir.
- **S6 Cochilo quando você para**: sem toque/tecla na Sala por 45 s, o pet dorme; ao voltar,
  ele se espreguiça. De noite e após 2+ dias sem estudar, ele já começa dormindo.

Os roteiros das ações (para onde ir, quanto tempo) são funções puras testadas; com "reduzir
movimento" o pet não se desloca (tigela e bolinha aparecem ao lado dele).

## Fora (fica para depois)
Notificações fora do app, reação a flashcards (precisaria de outra consulta), recompensas.

## Testes
Unidade: reações (cada gatilho e a prioridade), roteiros das ações, cochilo. E2E: recados com
dados do Supabase falso, petisco e bolinha, estudar junto (cronômetro no localStorage), pet na
tela de Foco, cochilo por inatividade (relógio do Playwright). A11y nos 8 temas.
