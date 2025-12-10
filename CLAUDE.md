# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Core Development Principles

1. **Proper Solutions Over Quick Fixes** - Implement correctly the first time
2. **Root Cause Analysis** - Fix underlying issues, not symptoms
3. **Stability Over Speed** - This is a production template
4. **Clean Architecture** - Follow established patterns consistently
5. **No Technical Debt** - Never commit TODOs or workarounds

## Docker-First Development (MANDATORY)

**CRITICAL**: This project REQUIRES Docker. Local pnpm/npm commands are NOT supported.

### NEVER Install Packages Locally

**ABSOLUTELY FORBIDDEN** - Never run these commands on the host machine:

```bash
# ❌ CRITICAL NO - NEVER do any of these locally
npm install
npm install --no-save <package>
pnpm install
pnpm add <package>
yarn install
npx <anything>

# ✅ CORRECT - Always use Docker
docker compose exec spoketowork pnpm install
docker compose exec spoketowork pnpm add <package>
```

**Why this is critical:**

- Creates local `node_modules` with wrong permissions (Docker-owned)
- Causes conflicts between host and container dependencies
- Breaks the Docker-first architecture
- Creates cleanup nightmares (Docker-owned files can't be deleted by host user)

**If you accidentally installed locally:**

```bash
docker compose down
docker compose run --rm spoketowork rm -rf node_modules
docker compose up
```

### NEVER Use sudo - Use Docker Instead

When encountering permission errors, **NEVER use `sudo`**. Use Docker:

```bash
# ❌ WRONG - Don't do this
sudo chown -R $USER:$USER .next
sudo rm -rf node_modules

# ✅ CORRECT - Use Docker
docker compose exec spoketowork rm -rf .next
docker compose exec spoketowork rm -rf node_modules
docker compose down && docker compose up
```

**Why**: The container runs as your user (UID/GID from .env). Docker commands execute with correct permissions automatically.

**Permission errors? Always try:**

1. `docker compose down && docker compose up` (restarts container, cleans .next)
2. `docker compose exec spoketowork pnpm run docker:clean`

### Essential Commands

```bash
# Start development
docker compose up

# Development server
docker compose exec spoketowork pnpm run dev

# Run tests
docker compose exec spoketowork pnpm test
docker compose exec spoketowork pnpm run test:suite    # Full suite

# Storybook
docker compose exec spoketowork pnpm run storybook

# E2E tests
docker compose exec spoketowork pnpm exec playwright test

# Type checking & linting
docker compose exec spoketowork pnpm run type-check
docker compose exec spoketowork pnpm run lint

# Clean start if issues
docker compose exec spoketowork pnpm run docker:clean
```

### Supabase Keep-Alive

Supabase Cloud free tier auto-pauses after 7 days. If paused:

```bash
docker compose exec spoketowork pnpm run prime
```

## Component Structure (MANDATORY)

Components must follow the 5-file pattern or CI/CD will fail:

```
ComponentName/
├── index.tsx                             # Barrel export
├── ComponentName.tsx                     # Main component
├── ComponentName.test.tsx                # Unit tests (REQUIRED)
├── ComponentName.stories.tsx             # Storybook (REQUIRED)
└── ComponentName.accessibility.test.tsx  # A11y tests (REQUIRED)
```

**Always use the generator:**

```bash
docker compose exec spoketowork pnpm run generate:component
```

See `docs/CREATING_COMPONENTS.md` for details.

## Architecture Overview

- **Next.js 15** with App Router, static export
- **React 19** with TypeScript strict mode
- **Tailwind CSS 4** + DaisyUI (32 themes)
- **Supabase** - Auth, Database, Storage, Realtime
- **PWA** with Service Worker (offline support)
- **Testing**: Vitest (unit), Playwright (E2E), Pa11y (a11y)

## Static Hosting Constraint

This app is deployed to GitHub Pages (static hosting). This means:

- NO server-side API routes (`src/app/api/` won't work in production)
- NO access to non-NEXT*PUBLIC* environment variables in browser
- All server-side logic must be in Supabase (database, Edge Functions, or triggers)

When implementing features that need secrets:

- Use Supabase Vault for secure storage
- Use Edge Functions for server-side logic
- Or design client-side solutions that don't require secrets

**Example**: The welcome message system uses ECDH shared secret symmetry to encrypt
messages "from" admin without needing admin's password at runtime. The admin's
public key is pre-stored in the database, and `ECDH(user_private, admin_public)`
produces the same shared secret as `ECDH(admin_private, user_public)`.

### Key Paths

```
src/
├── app/           # Next.js pages
├── components/    # Atomic design (subatomic/atomic/molecular/organisms/templates)
├── contexts/      # React contexts (AuthContext, etc.)
├── hooks/         # Custom hooks
├── lib/           # Core libraries
├── services/      # Business logic
└── types/         # TypeScript definitions

tests/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── contract/      # Contract tests
├── e2e/           # Playwright E2E tests
└── setup.ts       # Vitest setup

docker/            # Docker configuration
├── Dockerfile     # Main Dockerfile
└── docker-compose.e2e.yml  # E2E testing compose

docs/specs/        # Feature specifications (SpecKit artifacts)
tools/templates/   # Component generator templates
```

## PRP/SpecKit Workflow (v0.0.90)

For features taking >1 day:

1. Write PRP: `docs/prp-docs/<feature>-prp.md`
2. Run SpecKit workflow (branch created automatically by `/specify`):

```
/speckit.constitution (optional - establish project principles)
        ↓
/speckit.specify <feature-description> (creates branch + spec)
        ↓
/speckit.clarify (optional - up to 5 clarifying questions)
        ↓
/speckit.plan (technical implementation plan)
        ↓
/speckit.checklist (optional - validate requirements quality)
        ↓
/speckit.tasks (generate dependency-ordered tasks.md)
        ↓
/speckit.analyze (optional - cross-artifact consistency check)
        ↓
/speckit.taskstoissues (optional - create GitHub issues from tasks)
        ↓
/speckit.implement (execute the implementation)
```

### SpecKit Commands

| Command                  | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `/speckit.constitution`  | Establish project principles (optional, one-time setup)  |
| `/speckit.specify`       | Create feature branch + spec from description            |
| `/speckit.clarify`       | Ask up to 5 clarifying questions, encode into spec       |
| `/speckit.plan`          | Generate technical implementation plan                   |
| `/speckit.checklist`     | Validate requirements quality ("unit tests for English") |
| `/speckit.tasks`         | Generate dependency-ordered tasks.md                     |
| `/speckit.analyze`       | Cross-artifact consistency check (spec, plan, tasks)     |
| `/speckit.taskstoissues` | Convert tasks.md to GitHub Issues (requires GitHub MCP)  |
| `/speckit.implement`     | Execute the implementation plan                          |

**Note**: `/specify` auto-generates branch numbers by checking remote branches, local branches, and specs directories.

See `docs/prp-docs/SPECKIT-PRP-GUIDE.md` for details.

### Installing/Updating SpecKit

```bash
# Via Docker (no local Python needed)
docker run --rm -v "$(pwd):/app" -w /app python:3.12-slim bash -c \
  "apt-get update -qq && apt-get install -y -qq git > /dev/null && \
   pip install -q git+https://github.com/github/spec-kit.git && \
   echo 'y' | specify init . --ai claude --ignore-agent-tools"
```

## Common Issues & Solutions

### Permission Errors

**Always use Docker, never sudo:**

```bash
docker compose down && docker compose up
```

### Slow Supabase (10-30 seconds)

Instance paused after inactivity:

```bash
docker compose exec spoketowork pnpm run prime
```

### Tailwind CSS Not Loading

1. Don't import Leaflet CSS in `globals.css`
2. Import Leaflet CSS only in map components
3. Restart container after CSS changes

### Port 3000 In Use

```bash
docker compose down
lsof -i :3000
kill -9 <PID>
```

## Test Users

**CRITICAL: ALWAYS read credentials from `.env` file. NEVER use generic passwords like `TestPassword123!`**

**Primary** (required):

- Email: Read from `TEST_USER_EMAIL` in `.env`
- Password: Read from `TEST_USER_PASSWORD` in `.env`

**Secondary** (optional - for email verification tests):

- Email: Read from `TEST_USER_SECONDARY_EMAIL` in `.env`
- Password: Read from `TEST_USER_SECONDARY_PASSWORD` in `.env`

**When creating test users via SQL (Supabase Management API):**

CRITICAL: Supabase Auth (GoTrue) requires these columns to be empty strings, NOT NULL:

- `confirmation_token`, `email_change`, `email_change_token_new`, `recovery_token`

See: https://github.com/supabase/auth/issues/1940

```sql
-- Complete INSERT for auth.users (all required fields)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, instance_id, aud, role,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('PASSWORD_FROM_ENV', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  '', '', '', ''  -- CRITICAL: empty strings, not NULL!
);

-- Also create identity record (required for login)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '<user_id_from_above>',
  'test@example.com',
  'email',
  '{"sub":"<user_id>","email":"test@example.com","email_verified":true}'::jsonb,
  NOW(), NOW(), NOW()
);
```

## Documentation

| Topic               | Location                               |
| ------------------- | -------------------------------------- |
| Authentication      | `docs/AUTH-SETUP.md`                   |
| Messaging System    | `docs/messaging/QUICKSTART.md`         |
| Payment Integration | `docs/features/payment-integration.md` |
| Security            | `docs/project/SECURITY.md`             |
| Mobile-First Design | `docs/MOBILE-FIRST.md`                 |
| Component Creation  | `docs/CREATING_COMPONENTS.md`          |
| Template Setup      | `docs/TEMPLATE-GUIDE.md`               |
| Testing Guide       | `docs/project/TESTING.md`              |

## Supabase Database Migrations (CRITICAL)

**NEVER create separate migration files.** This project uses a **monolithic migration file**:

```
supabase/migrations/20251006_complete_monolithic_setup.sql
```

### Adding Schema Changes

1. **Edit the monolithic file directly** - Add new tables, columns, indexes to the appropriate section
2. **Use `IF NOT EXISTS`** - All CREATE statements must be idempotent
3. **Add to existing transaction** - New schema goes inside the `BEGIN;`...`COMMIT;` block
4. **Execute via Supabase Management API** - Use `SUPABASE_ACCESS_TOKEN` from `.env`

### Executing Migrations (Claude Code)

**NEVER tell the user to run migrations manually.** Use the Supabase Management API:

```bash
# Check for access token in .env
SUPABASE_ACCESS_TOKEN=<token>
NEXT_PUBLIC_SUPABASE_PROJECT_REF=<project-ref>

# Execute SQL via Management API
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT 1"}'
```

**DO NOT:**

- Tell user to copy SQL to dashboard manually
- Install database clients locally (pg, psql, etc.)
- Try direct database connections from Docker (DNS issues)

### Example: Adding a Column

```sql
-- Add to the appropriate table section in the monolithic file
ALTER TABLE user_encryption_keys
ADD COLUMN IF NOT EXISTS encryption_salt TEXT;
```

### Why Monolithic?

- Single source of truth for entire schema
- Can recreate database from scratch with one file
- No migration ordering issues
- Supabase Cloud doesn't support CLI migrations on free tier

**DO NOT:**

- Create files like `032_add_encryption_salt.sql`
- Suggest running SQL snippets piecemeal
- Use Supabase CLI migrations

## Important Notes

- Never create components manually - use the generator
- All PRs must pass component structure validation
- E2E tests are local-only, not in CI pipeline
- Docker-first development is mandatory
- Use `min-h-11 min-w-11` for 44px touch targets (mobile-first)

## Active Technologies

- TypeScript 5.9 with Node.js 22 + Vitest 3.2.3, happy-dom 20.0.11 (already installed), React 19 (042-test-memory-optimization)
- N/A (test infrastructure change) (042-test-memory-optimization)

- TypeScript 5.x with Next.js 15, React 19 + Supabase (Auth, Database), TanStack Query, DaisyUI (014-job-applications-fix)
- Supabase PostgreSQL (cloud) with multi-tenant schema (014-job-applications-fix)

## Recent Changes

- 014-job-applications-fix: Added TypeScript 5.x with Next.js 15, React 19 + Supabase (Auth, Database), TanStack Query, DaisyUI
