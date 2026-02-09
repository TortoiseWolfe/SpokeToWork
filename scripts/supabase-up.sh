#!/bin/bash
# Two-phase Supabase startup: start services, then fix dynamic port references.
#
# Dynamic ports mean neither GoTrue nor the browser-facing app can know
# their URLs at startup. Phase 1 starts everything, Phase 2 recreates
# the app (to pick up Supabase env), discovers its final port, then
# restarts GoTrue with correct browser-facing URLs.
#
# Usage:
#   ./scripts/supabase-up.sh                                 # default project
#   COMPOSE_PROJECT_NAME=model-a ./scripts/supabase-up.sh    # eval instance

set -euo pipefail
cd "$(dirname "$0")/.."

ANON_KEY="${SUPABASE_LOCAL_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE}"

echo "Phase 1: Starting all services..."
docker compose --profile supabase up -d

echo "Waiting for port assignments..."
sleep 3

# Discover Kong port (pinned via SUPABASE_API_PORT in .env)
KONG_PORT=$(docker compose port supabase-kong 8000 2>/dev/null | cut -d: -f2)

if [ -z "$KONG_PORT" ]; then
  echo "ERROR: Could not discover Kong port. Are containers running?"
  docker compose ps
  exit 1
fi

# Write dynamic Supabase config for the app container
cat > .env.supabase.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://localhost:$KONG_PORT
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
EOF

echo "Phase 2: Restarting app with Supabase config..."

# Recreate app first so it gets its final port assignment
docker compose up -d --force-recreate spoketowork
sleep 2

# Now discover the app's final port
APP_PORT=$(docker compose port spoketowork 3000 2>/dev/null | cut -d: -f2)

if [ -z "$APP_PORT" ]; then
  echo "ERROR: Could not discover app port."
  docker compose ps
  exit 1
fi

echo "Phase 3: Restarting auth with discovered ports..."
echo "  API_EXTERNAL_URL:  http://localhost:$KONG_PORT"
echo "  GOTRUE_SITE_URL:   http://localhost:$APP_PORT"

# Restart GoTrue with the app's final port as the redirect target
API_EXTERNAL_URL="http://localhost:$KONG_PORT" \
GOTRUE_SITE_URL="http://localhost:$APP_PORT" \
  docker compose up -d --force-recreate supabase-auth

echo ""
echo "Supabase ready:"
echo "  App:    http://localhost:$APP_PORT"
echo "  API:    http://localhost:$KONG_PORT"

DB_PORT=$(docker compose port supabase-db 5432 2>/dev/null | cut -d: -f2)
STUDIO_PORT=$(docker compose port supabase-studio 3000 2>/dev/null | cut -d: -f2)
[ -n "$DB_PORT" ] && echo "  DB:     localhost:$DB_PORT"
[ -n "$STUDIO_PORT" ] && echo "  Studio: http://localhost:$STUDIO_PORT"
