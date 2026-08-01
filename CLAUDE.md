# CLAUDE.md

SpokeToWork — job-hunting-by-bicycle PWA (Next.js 15 static export / React 19 / Tailwind 4 + DaisyUI / Supabase / PWA), deployed to GitHub Pages.

Workspace conventions (Docker-first mandate, 5-file component pattern, SpecKit `/speckit.*` workflow, testing stack, deploy & code-quality) live in `/home/TurtleWolfe/repos/CLAUDE.md`.

## Docker service

- Service name is `spoketowork`. Run everything through it: `docker compose exec spoketowork pnpm ...` (`dev`, `test`, `test:suite`, `storybook`, `type-check`, `lint`, `generate:component`, `docker:clean`).
- Never `sudo`. The container runs as your host UID/GID, so `docker compose down && docker compose up` fixes `.next`/permission issues.

## Secrets (safety)

- No secret/token/key/credential may be a literal in any committed file (docker-compose.yml, kong.yml, scripts, source, docs). All secrets live in `.env` (gitignored); committed files use `${VAR:-placeholder}` with an inert placeholder, or `${VAR:?message}` in scripts to fail loudly.
- JWTs count as secrets — even "demo" ones are valid credentials for local Supabase.
- NEVER allowlist a secret in `.gitleaks.toml` (not `regexes`, not `commits`, nowhere). If gitleaks flags a real secret, remove it from committed files. If it reached git history, scrub with `git-filter-repo --replace-text` and force push — never allowlist the commit.

## Static hosting constraint (GitHub Pages)

- No server-side API routes — `src/app/api/` will NOT run in production. No non-`NEXT_PUBLIC_` env vars in the browser.
- All server-side logic must live in Supabase (database, Edge Functions, triggers; Vault for secrets).

## Supabase — operational

- Cloud free tier auto-pauses after ~7 days idle; wake it with `docker compose exec spoketowork pnpm run prime`.
- Local (offline) Supabase: start ONLY via `./scripts/supabase-up.sh` (two-phase: starts services, discovers OS-assigned ports, restarts GoTrue with correct browser-facing URLs). Auth will NOT work if you instead run `docker compose --profile supabase up` directly.
- DO NOT edit `API_EXTERNAL_URL` or `GOTRUE_SITE_URL` in docker-compose.yml — the startup script sets them dynamically (a hookify rule warns you).
- Ports are dynamic; find them with `docker compose port supabase-kong 8000` / `supabase-studio 3000` / `supabase-db 5432`. A/B eval: prefix `COMPOSE_PROJECT_NAME=model-a ./scripts/supabase-up.sh`.
- Reset local DB: `docker compose --profile supabase down -v` DESTROYS data; `up` re-runs migrations.

## Supabase — schema migrations

- Single monolithic file: `supabase/migrations/20251006_complete_monolithic_setup.sql`. NEVER create separate/numbered migration files and NEVER use the Supabase CLI. Edit this file, keep every statement idempotent (`IF NOT EXISTS`), inside the existing `BEGIN;`…`COMMIT;`.
- Apply it yourself via the Supabase Management API (`SUPABASE_ACCESS_TOKEN` + project ref from `.env`). Never tell the user to paste SQL in the dashboard, never install local db clients (pg/psql), never open direct DB connections from Docker (DNS fails).
- Reading `.env` values for these calls: use the Read tool and inline the literals — `$(...)` command substitution is unreliable in the bash tool.

## Test users

- ALWAYS read credentials from `.env` (`TEST_USER_PRIMARY_*`, `SECONDARY_*`, `TERTIARY_*` for messaging E2E, `ADMIN_*`). NEVER use a generic password like `TestPassword123!`.
- Creating auth users via SQL: GoTrue requires `confirmation_token`, `email_change`, `email_change_token_new`, `recovery_token` to be empty strings, NOT NULL, plus a matching `auth.identities` row for login to work (https://github.com/supabase/auth/issues/1940).

## Gotchas

- Leaflet CSS: import it only inside map components, never in `globals.css` (breaks Tailwind).
- E2E runs in CI via `.github/workflows/e2e.yml` — 9 jobs per browser (`gen-` 1-4, `msg-` 1-4, `heavy-` 1/4) × chromium/firefox/webkit = 27, on push to `main`/`develop`. Shards are staggered to limit concurrent Supabase load; `cancel-in-progress: true`, so never push while a run is active.
- The browser jobs are chained (`needs: e2e-chromium` → `needs: e2e-firefox`) and MUST stay that way. `E2E_SHARD_INDEX` is `cut -d/ -f1` of `matrix.shard`, so all three browsers resolve to the same `e2e-s1..s4-*` users; running them concurrently would collide. `shard-users.ts` documents an intended per-browser offset (chromium 1-4, firefox 5-8, webkit 9-12) that was never implemented — implement it before parallelising.
- Touch targets: `min-h-11 min-w-11` (44px), mobile-first.
