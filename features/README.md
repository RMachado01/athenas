# features/

Um módulo por funcionalidade. Cada pasta tem seus próprios componentes, ações, consultas e schemas Zod.

**Regras**

- Uma feature **não importa de outra feature**. Se duas precisam do mesmo código, ele sobe para `lib/` ou `components/ui/`.
- `app/` (rotas) só _monta_ telas usando o que está aqui; regra de negócio não mora em `app/`.

Módulos planejados: `tasks`, `tracks`, `focus`, `goals`, `calendar`, `gamification`, `settings`, `groups`, `profile`.
