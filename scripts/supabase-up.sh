#!/bin/bash
# Docker-first Supabase startup for local development.
#
# All URLs use Docker-internal hostnames (supabase-kong:8000, spoketowork:3000)
# because the app, dev server, and Playwright all run inside containers.
# Host-mapped ports are printed for reference (Studio UI, psql from host).
#
# Usage:
#   ./scripts/supabase-up.sh                                 # default project
#   COMPOSE_PROJECT_NAME=model-a ./scripts/supabase-up.sh    # eval instance

set -euo pipefail
cd "$(dirname "$0")/.."

ANON_KEY="${SUPABASE_LOCAL_ANON_KEY:?Set SUPABASE_LOCAL_ANON_KEY in .env}"
SERVICE_KEY="${SUPABASE_LOCAL_SERVICE_KEY:?Set SUPABASE_LOCAL_SERVICE_KEY in .env}"

# Template Kong config with actual API keys.
# Kong's declarative config doesn't support env var substitution,
# so we generate it from the committed template before starting.
echo "Generating Kong config with API keys..."
sed \
  -e "s|set-anon-key-in-env-file|$ANON_KEY|g" \
  -e "s|set-service-key-in-env-file|$SERVICE_KEY|g" \
  docker/kong/kong.yml > docker/kong/kong.generated.yml

echo "Phase 1: Starting all services..."
docker compose --profile supabase up -d

echo "Waiting for services to be ready..."
sleep 3

# Apply database migrations (idempotent — safe to re-run).
# The monolithic migration uses IF NOT EXISTS / DO blocks throughout,
# so running it on an already-migrated DB is a no-op.
echo "Applying database migrations..."
DB_PASSWORD="${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}"
# Only run timestamped migrations (YYYYMMDD_*). Excludes utility scripts like
# 999_drop_all_tables.sql and misplaced seed files.
for f in supabase/migrations/[0-9][0-9][0-9][0-9]*_*.sql; do
  [ -f "$f" ] || continue
  echo "  Applying $(basename "$f")..."
  PGPASSWORD="$DB_PASSWORD" docker compose exec -T supabase-db \
    psql -U supabase_admin -d postgres -v ON_ERROR_STOP=0 -f - < "$f" > /dev/null 2>&1
done

# Apply all seed data (test users A, B, C, admin, etc.)
for f in supabase/seed*.sql; do
  [ -f "$f" ] || continue
  echo "  Applying $(basename "$f")..."
  PGPASSWORD="$DB_PASSWORD" docker compose exec -T supabase-db \
    psql -U supabase_admin -d postgres -v ON_ERROR_STOP=0 -f - < "$f" > /dev/null 2>&1
done

# Reload PostgREST schema cache so new tables/functions are visible
docker compose exec -T supabase-db \
  psql -U supabase_admin -d postgres -c "NOTIFY pgrst, 'reload schema';" > /dev/null 2>&1
echo "Migrations applied."

# Write Supabase config for the app container.
# Docker-internal hostname — resolves from app, Playwright, and headless Chrome.
cat > .env.supabase.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://supabase-kong:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
EOF

echo "Phase 2: Restarting app with Supabase config..."
docker compose up -d --force-recreate spoketowork
sleep 2

echo "Phase 3: Restarting auth with Docker-internal URLs..."
echo "  API_EXTERNAL_URL:  http://supabase-kong:8000"
echo "  GOTRUE_SITE_URL:   http://spoketowork:3000"

# GoTrue needs to know the API and app URLs for auth redirects.
# Both use Docker-internal hostnames since all clients are in-network.
API_EXTERNAL_URL="http://supabase-kong:8000" \
GOTRUE_SITE_URL="http://spoketowork:3000" \
  docker compose up -d --force-recreate supabase-auth

# Discover host-mapped ports for reference output
KONG_PORT=$(docker compose port supabase-kong 8000 2>/dev/null | cut -d: -f2)
DB_PORT=$(docker compose port supabase-db 5432 2>/dev/null | cut -d: -f2)
STUDIO_PORT=$(docker compose port supabase-studio 3000 2>/dev/null | cut -d: -f2)

echo ""
echo "Supabase ready (Docker-internal):"
echo "  App:    http://spoketowork:3000"
echo "  API:    http://supabase-kong:8000"
echo "  DB:     supabase-db:5432"
echo "  Studio: http://supabase-studio:3000"
echo ""
echo "Host-mapped ports (Studio web UI, psql from host):"
[ -n "$KONG_PORT" ] && echo "  API:    http://localhost:$KONG_PORT"
[ -n "$DB_PORT" ] && echo "  DB:     localhost:$DB_PORT"
[ -n "$STUDIO_PORT" ] && echo "  Studio: http://localhost:$STUDIO_PORT"
