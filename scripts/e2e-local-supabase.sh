#!/usr/bin/env bash
# Starts the repo's own Supabase stack for the E2E tests and waits until it
# answers. Used by .github/actions/local-supabase (CI) and runnable by hand.
#
# What it does, in order:
#   1. fills this run's keys into a generated Kong (gateway) config
#   2. starts the database, sign-in, REST, meta, realtime and gateway containers
#   3. builds the schema from supabase/migrations and loads supabase/seed*.sql
#      (the same files, in the same order, as scripts/supabase-up.sh)
#   4. creates the realtime "tenant" (realtime refuses connections without one)
#   5. waits until sign-in, REST and the SQL route all answer on the gateway
#
# It needs the settings from scripts/e2e-local-keys.mjs in the environment:
#   eval "$(node scripts/e2e-local-keys.mjs --export)" && scripts/e2e-local-supabase.sh
#
# The compose project name is E2E_COMPOSE_PROJECT (default "e2e"); stop the
# stack afterwards with:  docker compose -p e2e --profile supabase down -v

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${E2E_COMPOSE_PROJECT:-e2e}"
: "${SUPABASE_LOCAL_ANON_KEY:?run scripts/e2e-local-keys.mjs first}"
: "${SUPABASE_LOCAL_SERVICE_KEY:?run scripts/e2e-local-keys.mjs first}"
: "${SUPABASE_LOCAL_JWT_SECRET:?run scripts/e2e-local-keys.mjs first}"
: "${SUPABASE_LOCAL_DB_PASSWORD:?run scripts/e2e-local-keys.mjs first}"
API_PORT="${SUPABASE_API_PORT:-54321}"
SERVICES="supabase-db supabase-init supabase-auth supabase-rest supabase-meta supabase-realtime supabase-kong"

dc() { docker compose -p "$PROJECT" --profile supabase "$@"; }

echo "== 1. Kong config with this run's keys"
# Kong cannot read environment variables in its config file, so the keys are
# filled into a generated copy of the committed template.
sed \
  -e "s|set-anon-key-in-env-file|${SUPABASE_LOCAL_ANON_KEY}|g" \
  -e "s|set-service-key-in-env-file|${SUPABASE_LOCAL_SERVICE_KEY}|g" \
  docker/kong/kong.yml > docker/kong/kong.generated.yml
# docker-compose.yml names a .env file for the app service; it only has to
# exist, the Supabase services do not read it.
[ -f .env ] || touch .env

echo "== 2. Start the containers"
# Image pulls from Docker Hub can fail on a busy shared runner: retry.
for attempt in 1 2 3; do
  if timeout 600 docker compose -p "$PROJECT" --profile supabase pull --quiet $SERVICES; then
    break
  fi
  echo "::warning::image pull failed (attempt $attempt of 3)"
  [ "$attempt" = "3" ] && exit 1
  sleep $((attempt * 15))
done
# shellcheck disable=SC2086
timeout 300 docker compose -p "$PROJECT" --profile supabase up -d $SERVICES

echo "== 3. Wait for the database, then build the schema"
ready=0
for i in $(seq 1 60); do
  if dc exec -T supabase-db psql -U supabase_admin -d postgres -tAc \
    "SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin'" 2>/dev/null | grep -q 1; then
    echo "database ready after $i checks"
    ready=1
    break
  fi
  sleep 3
done
if [ "$ready" != "1" ]; then
  echo "::error::database did not become ready"
  dc logs --tail=80 supabase-db
  exit 1
fi

run_sql() {
  # The migration file is written to be safe to run twice, so an error line is
  # shown here but does not stop the job: the tests are the judge of whether
  # the schema is right.
  dc exec -T -e PGPASSWORD="${SUPABASE_LOCAL_DB_PASSWORD}" supabase-db \
    psql -U supabase_admin -d postgres -v ON_ERROR_STOP=0 -f - < "$1" 2>&1 \
    | grep -E "(ERROR|FATAL)" || true
}
for f in supabase/migrations/[0-9][0-9][0-9][0-9]*_*.sql; do
  [ -f "$f" ] || continue
  echo "applying $(basename "$f")"
  run_sql "$f"
done
for f in supabase/seed*.sql; do
  [ -f "$f" ] || continue
  echo "applying $(basename "$f")"
  run_sql "$f"
done
dc exec -T supabase-db psql -U supabase_admin -d postgres -c "NOTIFY pgrst, 'reload schema';"

echo "== 4. Realtime tenant"
# Same call as scripts/supabase-up.sh Phase 4. It goes through a throw-away
# curl container on the stack's own network because the realtime port is not
# published to the host.
NET="${PROJECT}_SpokeToWork"
curl_in_net() { docker run --rm --network "$NET" curlimages/curl "$@"; }
for i in $(seq 1 30); do
  code=$(curl_in_net -s -o /dev/null -w '%{http_code}' \
    http://supabase-realtime:4000/api/tenants \
    -H "Authorization: Bearer ${SUPABASE_LOCAL_SERVICE_KEY}" || true)
  [ "$code" = "200" ] && break
  echo "waiting for the realtime API (got '$code', $i of 30)"
  sleep 3
done
BODY="{\"tenant\":{\"name\":\"Local Development\",\"external_id\":\"supabase-realtime\",\"jwt_secret\":\"${SUPABASE_LOCAL_JWT_SECRET}\",\"extensions\":[{\"type\":\"postgres_cdc_rls\",\"settings\":{\"db_host\":\"supabase-db\",\"db_port\":\"5432\",\"db_name\":\"postgres\",\"db_user\":\"supabase_admin\",\"db_password\":\"${SUPABASE_LOCAL_DB_PASSWORD}\",\"region\":\"us-east-1\",\"poll_interval_ms\":100,\"poll_max_record_bytes\":1048576,\"slot_name\":\"supabase_realtime_rls\",\"ssl_enforced\":false}}]}}"
code=$(curl_in_net -s -o /dev/null -w '%{http_code}' -X POST \
  http://supabase-realtime:4000/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_LOCAL_SERVICE_KEY}" \
  -d "$BODY")
echo "realtime tenant call returned HTTP $code (201 = created, 422 = already there)"
case "$code" in 201|422) ;; *) echo "::error::realtime tenant was not created"; exit 1;; esac

echo "== 5. Wait for the gateway and prove the API answers"
URL="http://localhost:${API_PORT}"
for i in $(seq 1 40); do
  auth=$(curl -s -o /dev/null -w '%{http_code}' "$URL/auth/v1/health" || true)
  rest=$(curl -s -o /dev/null -w '%{http_code}' "$URL/rest/v1/user_profiles?select=id&limit=1" \
    -H "apikey: ${SUPABASE_LOCAL_ANON_KEY}" || true)
  sql=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/pg/query" \
    -H "apikey: ${SUPABASE_LOCAL_SERVICE_KEY}" \
    -H "Content-Type: application/json" -d '{"query":"select 1"}' || true)
  echo "check $i: auth=$auth rest=$rest sql=$sql"
  if [ "$auth" = "200" ] && [ "$rest" = "200" ] && [ "$sql" = "200" ]; then
    echo "local Supabase is up at $URL"
    exit 0
  fi
  sleep 3
done
echo "::error::local Supabase did not come up"
dc ps
dc logs --tail=60 supabase-auth supabase-rest supabase-kong supabase-meta
exit 1
