# supabase/

Tudo do banco, **versionado**.

- `migrations/` — SQL em ordem, sempre aditivo. **Nunca edite uma migration já aplicada**; corrija com uma nova.
- `tests/` — testes pgTAP (isolamento entre usuários, RLS, views).
- `functions/` — Edge Functions (Google Agenda, jobs).
- `seed.sql` — dados **só para desenvolvimento local** (as trilhas-template de cada usuário vêm de trigger, não daqui). Ver ADR-002.
