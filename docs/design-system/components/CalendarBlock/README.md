# CalendarBlock

Bloco posicionado na grade do calendário: sessão de estudo planejada, evento importado do Google Agenda ou bloco já concluído.

| Variante | Visual | Origem |
|---|---|---|
| `study` | fundo `brand`, ponto `accent` antes do título | criado no Athenaeum (sincroniza pro Google) |
| `gcal` | contorno tracejado `info`, sem preenchimento | evento externo, somente leitura |
| `done` | `surface-raised`, título riscado | sessão de foco registrada |

**Interação:** arrastar move (snap de 15 min), puxar a borda inferior redimensiona, clique abre detalhes; "Começar foco" direto do bloco. Hover levanta 1px com `shadow-float`.

**Acessibilidade:** cada bloco é um botão com `aria-label` "Foco em Window functions, 09:00 às 10:45"; mover por teclado com Alt+↑/↓.
