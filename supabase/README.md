# supabase/

Tudo do banco, **versionado**.

- `migrations/` — SQL em ordem (prefixo de data), sempre aditivo. **Nunca edite uma migration já aplicada**; corrija com uma nova.
- `config.toml` — configuração do Supabase CLI (projeto `athenas`, Postgres 17).
- `seed.sql` — dados **só para desenvolvimento local**.
- `functions/` — Edge Functions (Google Agenda, jobs) — Fase 2.
- `tests/` — reservado para testes pgTAP contra um Supabase real (CI, quando o Docker entrar).

## Como testamos o banco hoje

Os testes de RLS ficam em [`tests/db/`](../tests/db) e rodam com **PGlite** (Postgres de verdade em WebAssembly), sem Docker:
cada teste cria um banco novo, aplica o stub do Supabase e **todas as migrations reais** desta pasta, e então verifica que
uma pessoa nunca vê nem altera dados de outra. Rode com `pnpm test`.

## Comandos úteis (CLI como dependência do projeto)

```bash
pnpm exec supabase --version
pnpm exec supabase login          # uma vez, abre o navegador
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push        # envia as migrations ao projeto remoto
```

> `supabase start` (banco local completo) exige Docker Desktop + WSL2, que ainda não estão instalados.
