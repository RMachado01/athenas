# components/ui/

Componentes de base do design system (Button, Input, Card, Tabs…), baseados em Radix e restilizados com os tokens.

**Regras**

- Usam **apenas classes semânticas** (`bg-surface`, `text-ink`, `border-hairline`). **Nunca hex.**
- Não conhecem regras de negócio nem falam com o banco.
- Cada componente novo tem uma história no Storybook (quando o Storybook entrar) e passa no axe.
