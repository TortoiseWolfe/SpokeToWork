#!/bin/bash
# Fix Supabase role passwords after initialization
# This runs as part of docker-entrypoint-initdb.d

set -e

PASS="${POSTGRES_PASSWORD:-your-super-secret-and-long-postgres-password}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER USER supabase_auth_admin WITH PASSWORD '$PASS';
    ALTER USER authenticator WITH PASSWORD '$PASS';
    ALTER USER supabase_storage_admin WITH PASSWORD '$PASS';
EOSQL

echo "Supabase role passwords updated"
