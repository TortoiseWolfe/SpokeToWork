# CLAUDE.md

SpokeToWork — job-hunting-by-bicycle PWA (Next.js 15 static export / React 19 / Tailwind 4 + DaisyUI / Supabase / PWA), deployed to GitHub Pages.

Workspace conventions (Docker-first mandate, 5-file component pattern, SpecKit `/speckit.*` workflow, testing stack, deploy & code-quality) live in `/home/TurtleWolfe/repos/CLAUDE.md`.

## Docker service

- Service name is `spoketowork`. Run everything through it: `docker compose exec spoketowork pnpm ...` (`dev`, `test`, `test:suite`, `storybook`, `type-check`, `lint`, `generate:component`, `docker:clean`).
- **Except the production build — that gets its own container (#93):**
  ```bash
  docker compose run --rm builder pnpm build     # correct
  docker compose exec spoketowork pnpm build     # WRONG — corrupts the build
  ```
  `next dev` and `next build` both own `/app/.next`. Building inside the dev container had the two overwriting each other, and the static-export workers died on `Cannot find module './NNNN.js'` _after_ reporting "Compiled successfully". The `builder` service is the same image with its own `.next` volume; `out/` still lands on the bind mount. `scripts/validate-ci.sh` refuses to build in the dev container rather than letting this recur.
- Never `sudo`. The container runs as your host UID/GID, so `docker compose down && docker compose up` fixes permission issues.

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
- E2E runs in CI via `.github/workflows/e2e.yml` — 12 jobs per browser (`gen-` 1-4, `msg-` 1-4, `heavy-` 1-4) × chromium/firefox/webkit = 36, on push to `main`/`develop`. Shards are staggered to limit concurrent Supabase load. `cancel-in-progress` is deliberately **false** (a ~45 min sequential run would otherwise be killed mid-flight by any push, cascading auth-setup cancellation to every browser batch) — so a push during a run does not cancel it, it queues another full run alongside.
- The browser jobs are chained (`needs: e2e-chromium` → `needs: e2e-firefox`) and MUST stay that way. The per-browser shard offset IS implemented, in the workflow rather than in `shard-users.ts`: the "Extract shard index" step adds +0 for chromium, +4 for firefox, +8 for webkit, giving `e2e-s1..s12-*`.
- But `E2E_SHARD_INDEX` is only set when `matrix.group == 'msg-'`. `gen-` and `heavy-` receive `''`, so `getShardUsers()` takes its local-dev branch and every one of those 8 shards shares `TEST_USER_PRIMARY_*`. Fine for the 15 `heavy-` tests that mint their own `e2e-flow1-*` / `e2e-new-user-*` users; `welcome-message` and `resume-upload` do share the one identity, so suspect contention before suspecting a product bug when those flake.
- `global-setup.ts` only prunes `e2e-shared-%`. Users minted by `heavy-` specs (`e2e-flow1-*`, `e2e-new-user-*`) are cleaned up by the specs themselves, so a crashed run leaks them.
- Touch targets: `min-h-11 min-w-11` (44px), mobile-first.
