# Athenaeum

**Herança, foco e disciplina para os seus estudos.**

Athenaeum é um sistema pessoal de gestão de estudos — tarefas, calendário, metas, sessões de foco e progresso — com a estética *old money*: tons profundos, dourado discreto, serifa clássica e muito respiro. A ideia é que estudar pareça entrar numa biblioteca antiga, não abrir mais um app de produtividade barulhento.

> Princípio-mestre: **discrição é qualidade.** Nada pisca, nada grita. O dourado aparece pouco — e por isso tem peso.

---

## 1. Fundamentos de conteúdo (voz)

- **Português informal e direto**, como um mentor que te conhece: "Bora fechar a trilha de SQL?" em vez de "Inicie sua jornada de aprendizado".
- **Verbos no imperativo** em botões: *Começar foco*, *Nova tarefa*, *Conectar Google Agenda*.
- **Números antes de adjetivos:** "3h20 hoje · 82% da meta" e não "Você está indo muito bem!".
- Celebração é **curta e elegante**: "Meta batida. Sete dias seguidos." — sem emoji de foguete.
- Erros dizem **o que aconteceu e o que fazer**: "Não deu pra sincronizar com o Google. Tentar de novo?"

## 2. Fundamentos visuais

### Três temas, uma família
| Tema | Cor de identidade | Clima | Quando usar |
|---|---|---|---|
| **Ponderosa Pine** (padrão) | `palette-pine-900` #0F2C24 | Escuro, verde floresta, Porsche racing green | Estudo à noite, foco longo |
| **Old Money Burgundy** | `palette-burgundy-700` #6F1D2B | Escuro, vinho, couro Chesterfield | Clima de biblioteca, revisão |
| **Old Money Camel** | `palette-camel-400` #C4A47A | Claro, cashmere, café | Uso diurno, ambientes iluminados |

Os três compartilham o **dourado** (`accent`) como cor de ação. Toda a UI usa tokens semânticos (`bg`, `surface`, `ink`, `brand`, `accent`…) — trocar de tema é trocar o atributo `data-theme` no `<html>`; nenhum componente conhece hex.

### Regras de cor
- `brand` é a **cor-assinatura** do tema: barras de progresso, chips de trilha, cabeçalhos. Nunca texto pequeno.
- `accent` (dourado) é **ação e destaque**: botão primário, item ativo, foco, número herói. Máximo 1 botão primário por área.
- Estados (`success`, `warning`, `danger`, `info`) aparecem em texto, ícone e bordas — nunca em blocos grandes.
- Contraste garantido: `ink` e `ink-muted` passam 4.5:1 sobre `surface` nos três temas; `accent` passa 4.5:1 sobre `surface`.

### Tipografia
- **Display — Cormorant Garamond** (Google Fonts): títulos, saudação, nomes de trilhas. Só a partir de 28px (abaixo disso a serifa fica frágil).
- **Texto — Instrument Sans**: toda a interface funcional.
- **Numerais — JetBrains Mono**: timer, horários, KPIs. Números tabulares não "pulam" quando o timer corre.
- Overlines em `label` sempre em CAIXA ALTA com tracking largo — é o "monograma" do sistema.

### Espaço, forma e profundidade
- Grade de **4px**; cards com `space-6`, seções com `space-8`.
- Cantos médios (`radius-lg` em cards, `radius-md` em controles) — elegante, não fofo.
- **Filetes, não sombras:** separação com `hairline` de 1px. Sombra (`shadow-float`, `shadow-modal`) só no que flutua.
- **Filete duplo dourado** (2 linhas de 1px com 4px de intervalo) é o ornamento da marca — como a lombada de um livro. Use em headers de página e no card de meta batida. Nunca mais que um por tela.

### Movimento
Animações fluidas, mas **com propósito**: guiar o olho, confirmar uma ação, celebrar progresso.

| Situação | Animação | Tokens |
|---|---|---|
| Hover / press | Escala 0.98 no press, cor no hover | `duration-instant`, `ease-out` |
| Concluir tarefa | Check desenha o traço (stroke-dashoffset), linha risca, item desliza para "Concluídas" | `duration-base`, `ease-in` |
| Entrar na página | Cards em *stagger* (40ms entre eles), fade + 8px de subida | `duration-base`, `ease-out` |
| Progresso | Ring/barra anima do valor anterior até o novo | `duration-slow`, `ease-out` |
| Trocar tema | Cross-fade das cores via View Transitions API | `duration-slow`, `ease-in-out` |
| Meta batida / streak | Filete dourado se desenha + contador sobe (mola 260/20) | `duration-slow` |
| Modo Foco | Fundo escurece (`scrim`), card do timer cresce a partir do botão (shared layout) | `duration-base` |

`prefers-reduced-motion`: só fades de opacidade, sem deslocamento nem molas.

## 3. Iconografia
- **Lucide** (traço 1.5px, cantos arredondados) — linha fina combina com a serifa.
- Ícones em `ink-muted` por padrão; `accent` quando ativos.
- Tamanhos: 16px em texto, 20px na navegação, 24px em ações de destaque.
- Ícones de trilha são monogramas (iniciais em Cormorant dentro de um círculo `brand`) — não use logotipos de tecnologias de terceiros.

## 4. Componentes
| Componente | Para quê |
|---|---|
| Button | Ações: primário dourado, secundário com filete, ghost |
| Input | Campos de texto, com label e helper |
| TaskItem | Linha de tarefa com check animado, trilha, prazo, prioridade |
| GoalCard | Meta com progress ring, prazo e status |
| StreakBadge | Sequência de dias estudados |
| FocusTimer | Timer Pomodoro do modo Foco |
| CalendarBlock | Bloco de estudo / evento do Google na agenda |
| ThemeSwitcher | Troca entre os 3 temas na Personalização |

## 5. Como usar no código
- Carregue `tokens.css` e aplique `data-theme="ponderosa" | "burgundy" | "camel"` no `<html>`.
- Fontes via Google Fonts: Cormorant Garamond (500, 600), Instrument Sans (400, 600), JetBrains Mono (500).
- No Tailwind, mapeie as cores para as variáveis CSS (`colors: { surface: 'var(--surface)', … }`) — nunca hex direto.
