# features/

Um módulo por funcionalidade. Cada pasta tem seus próprios componentes, ações, consultas e schemas Zod.

**Regras**

- Dependência entre features só em **uma direção e sem ciclos**: por exemplo `tasks` usa `tracks`, mas `tracks` nunca importa de `tasks`. Se duas precisam do mesmo código nos dois sentidos, ele sobe para `lib/` ou `components/ui/`.
- Perfil da pessoa (id, fuso, "hoje") é compartilhado: fica em `lib/perfil.ts`.
- `app/` (rotas) só _monta_ telas usando o que está aqui; regra de negócio não mora em `app/`.

Módulos planejados: `tasks`, `tracks`, `focus`, `goals`, `calendar`, `gamification`, `settings`, `groups`, `profile`.
