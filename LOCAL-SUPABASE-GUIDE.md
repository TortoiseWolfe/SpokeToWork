# Local Supabase via Docker Compose

This guide documents how to add self-hosted Supabase services to a Docker Compose project for offline/local development.

---

## Part 1: Brownfield Implementation (Copy-Paste Ready)

For existing projects. These are the exact configurations used in SpokeToWork with specific, tested versions.

### Prerequisites

- Docker and Docker Compose v2+
- Existing `docker-compose.yml` with a network defined

### Step 1: Add Services to docker-compose.yml

Add these services to your `docker-compose.yml`. They use Docker Compose **profiles** so they only start when explicitly requested.

```yaml
# =============================================================================
# LOCAL SUPABASE SERVICES (start with: docker compose --profile supabase up)
# =============================================================================

supabase-db:
  image: supabase/postgres:15.8.1.085
  profiles: [supabase]
  ports:
    - '${SUPABASE_DB_PORT:-0}:5432'
  environment:
    POSTGRES_HOST: /var/run/postgresql
    PGPORT: 5432
    POSTGRES_PORT: 5432
    PGPASSWORD: ${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}
    POSTGRES_PASSWORD: ${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}
    PGDATABASE: postgres
    POSTGRES_DB: postgres
    JWT_SECRET: ${SUPABASE_LOCAL_JWT_SECRET:-your-super-secret-jwt-token-with-at-least-32-characters-long}
    JWT_EXP: 3600
  volumes:
    - supabase_db_data:/var/lib/postgresql/data
  healthcheck:
    test:
      [
        'CMD-SHELL',
        'pg_isready -U postgres -h localhost && psql -U supabase_admin -d postgres -c "SELECT 1 FROM pg_roles WHERE rolname=''supabase_auth_admin''" | grep -q 1',
      ]
    interval: 5s
    timeout: 5s
    retries: 30
    start_period: 30s
  restart: unless-stopped
  networks:
    - your-network-name

supabase-init:
  image: supabase/postgres:15.8.1.085
  profiles: [supabase]
  depends_on:
    supabase-db:
      condition: service_healthy
  environment:
    PGPASSWORD: ${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}
  entrypoint: ['/bin/bash', '-c']
  command:
    - |
      psql -h supabase-db -U supabase_admin -d postgres -c "ALTER USER supabase_auth_admin WITH PASSWORD '$$PGPASSWORD';"
      psql -h supabase-db -U supabase_admin -d postgres -c "ALTER USER authenticator WITH PASSWORD '$$PGPASSWORD';"
      psql -h supabase-db -U supabase_admin -d postgres -c "ALTER USER supabase_storage_admin WITH PASSWORD '$$PGPASSWORD';"
      echo "Supabase role passwords configured"
  networks:
    - your-network-name

supabase-auth:
  image: supabase/gotrue:v2.164.0
  profiles: [supabase]
  depends_on:
    supabase-init:
      condition: service_completed_successfully
  environment:
    GOTRUE_API_HOST: 0.0.0.0
    GOTRUE_API_PORT: 9999
    API_EXTERNAL_URL: http://localhost:${SUPABASE_API_PORT:-0}
    GOTRUE_DB_DRIVER: postgres
    GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}@supabase-db:5432/postgres
    GOTRUE_SITE_URL: http://spoketowork:3000
    GOTRUE_URI_ALLOW_LIST: ''
    GOTRUE_DISABLE_SIGNUP: 'false'
    GOTRUE_JWT_ADMIN_ROLES: service_role
    GOTRUE_JWT_AUD: authenticated
    GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
    GOTRUE_JWT_EXP: 3600
    GOTRUE_JWT_SECRET: ${SUPABASE_LOCAL_JWT_SECRET:-your-super-secret-jwt-token-with-at-least-32-characters-long}
    GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true'
    GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED: 'false'
    GOTRUE_MAILER_AUTOCONFIRM: 'true'
  restart: unless-stopped
  networks:
    - your-network-name

supabase-rest:
  image: postgrest/postgrest:v12.2.0
  profiles: [supabase]
  depends_on:
    supabase-init:
      condition: service_completed_successfully
  environment:
    PGRST_DB_URI: postgres://authenticator:${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}@supabase-db:5432/postgres
    PGRST_DB_SCHEMAS: public,graphql_public
    PGRST_DB_ANON_ROLE: anon
    PGRST_JWT_SECRET: ${SUPABASE_LOCAL_JWT_SECRET:-your-super-secret-jwt-token-with-at-least-32-characters-long}
    PGRST_DB_USE_LEGACY_GUCS: 'false'
    PGRST_APP_SETTINGS_JWT_SECRET: ${SUPABASE_LOCAL_JWT_SECRET:-your-super-secret-jwt-token-with-at-least-32-characters-long}
    PGRST_APP_SETTINGS_JWT_EXP: 3600
  restart: unless-stopped
  networks:
    - your-network-name

supabase-meta:
  image: supabase/postgres-meta:v0.83.2
  profiles: [supabase]
  depends_on:
    supabase-init:
      condition: service_completed_successfully
  environment:
    PG_META_PORT: 8080
    PG_META_DB_HOST: supabase-db
    PG_META_DB_PORT: 5432
    PG_META_DB_NAME: postgres
    PG_META_DB_USER: supabase_admin
    PG_META_DB_PASSWORD: ${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}
  restart: unless-stopped
  networks:
    - your-network-name

supabase-kong:
  image: kong:2.8.1
  profiles: [supabase]
  depends_on:
    supabase-auth:
      condition: service_started
    supabase-rest:
      condition: service_started
  ports:
    - '${SUPABASE_API_PORT:-0}:8000'
  environment:
    KONG_DATABASE: 'off'
    KONG_DECLARATIVE_CONFIG: /kong/kong.yml
    KONG_DNS_ORDER: LAST,A,CNAME
    KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
    KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
    KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
    SUPABASE_ANON_KEY: ${SUPABASE_LOCAL_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE}
    SUPABASE_SERVICE_KEY: ${SUPABASE_LOCAL_SERVICE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q}
  volumes:
    - ./docker/kong/kong.yml:/kong/kong.yml:ro
  restart: unless-stopped
  networks:
    - your-network-name

supabase-studio:
  image: supabase/studio:20241202-71e5240
  profiles: [supabase]
  depends_on:
    supabase-kong:
      condition: service_started
    supabase-meta:
      condition: service_started
  ports:
    - '${SUPABASE_STUDIO_PORT:-0}:3000'
  environment:
    STUDIO_PG_META_URL: http://supabase-meta:8080
    POSTGRES_PASSWORD: ${SUPABASE_LOCAL_DB_PASSWORD:-your-super-secret-and-long-postgres-password}
    DEFAULT_ORGANIZATION_NAME: YourProject
    DEFAULT_PROJECT_NAME: Local Development
    SUPABASE_URL: http://supabase-kong:8000
    SUPABASE_PUBLIC_URL: http://localhost:${SUPABASE_API_PORT:-0}
    SUPABASE_ANON_KEY: ${SUPABASE_LOCAL_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE}
    SUPABASE_SERVICE_KEY: ${SUPABASE_LOCAL_SERVICE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q}
    AUTH_JWT_SECRET: ${SUPABASE_LOCAL_JWT_SECRET:-your-super-secret-jwt-token-with-at-least-32-characters-long}
    LOGFLARE_API_KEY: ''
    LOGFLARE_URL: ''
    NEXT_PUBLIC_ENABLE_LOGS: 'false'
    NEXT_ANALYTICS_BACKEND_PROVIDER: ''
  restart: unless-stopped
  networks:
    - your-network-name
```

**Don't forget to add the volume:**

```yaml
volumes:
  supabase_db_data:
```

### Step 2: Create Kong Configuration

Create `docker/kong/kong.yml`:

```yaml
_format_version: '2.1'
_transform: true

###
### Kong configuration for local Supabase
### Routes API requests to appropriate services
###

consumers:
  - username: ANON
    keyauth_credentials:
      - key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
  - username: SERVICE_ROLE
    keyauth_credentials:
      - key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q

acls:
  - consumer: ANON
    group: anon
  - consumer: SERVICE_ROLE
    group: admin

services:
  ## Auth (GoTrue)
  - name: auth-v1
    url: http://supabase-auth:9999/verify
    routes:
      - name: auth-v1-route
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors

  - name: auth-v1-all
    url: http://supabase-auth:9999
    routes:
      - name: auth-v1-all-route
        strip_path: true
        paths:
          - /auth/v1
    plugins:
      - name: cors

  ## REST (PostgREST)
  - name: rest-v1
    url: http://supabase-rest:3000
    routes:
      - name: rest-v1-route
        strip_path: true
        paths:
          - /rest/v1
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_names:
            - apikey
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - anon
            - admin

  ## Meta (postgres-meta)
  - name: meta
    url: http://supabase-meta:8080
    routes:
      - name: meta-route
        strip_path: true
        paths:
          - /pg
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
          key_names:
            - apikey
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
```

### Step 3: Add Environment Variables to .env

```bash
# =============================================================================
# LOCAL SUPABASE (docker compose --profile supabase up)
# =============================================================================
# Ports – dynamic (0 = OS-assigned) by default.
# Uncomment to pin fixed ports:
# SUPABASE_DB_PORT=54322
# SUPABASE_API_PORT=54321
# SUPABASE_STUDIO_PORT=54323

# Credentials (match Supabase official defaults)
# SUPABASE_LOCAL_DB_PASSWORD=your-super-secret-and-long-postgres-password
# SUPABASE_LOCAL_JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long

# To use local Supabase instead of cloud, set:
# (requires SUPABASE_API_PORT=54321 above, or use `docker compose port supabase-kong 8000` to find the dynamic port)
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

### Step 4: Usage

```bash
# Start app only (default behavior)
docker compose up

# Start app + local Supabase
docker compose --profile supabase up

# Stop everything
docker compose --profile supabase down

# Reset database (wipes all data)
docker compose --profile supabase down -v
docker compose --profile supabase up
```

### Access Points

Ports are dynamic by default. Discover with `docker compose port`:

| Service           | Discover port                              | Pin via env var      |
| ----------------- | ------------------------------------------ | -------------------- |
| API Gateway       | `docker compose port supabase-kong 8000`   | SUPABASE_API_PORT    |
| Auth API          | (same as API Gateway, path /auth/v1)       |                      |
| REST API          | (same as API Gateway, path /rest/v1)       |                      |
| Studio Dashboard  | `docker compose port supabase-studio 3000` | SUPABASE_STUDIO_PORT |
| Database (direct) | `docker compose port supabase-db 5432`     | SUPABASE_DB_PORT     |

### Test It Works

```bash
# Discover the API port
API_PORT=$(docker compose port supabase-kong 8000 | cut -d: -f2)

# Health check
curl http://localhost:$API_PORT/auth/v1/health

# Sign up a user
curl -X POST http://localhost:$API_PORT/auth/v1/signup \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

---

## Part 2: Greenfield Guidance (Conceptual)

For new projects starting fresh. This explains the architecture and patterns without prescribing specific versions.

### Why Self-Host Supabase Locally?

1. **Offline development** - Work without internet
2. **Speed** - No network latency to cloud
3. **Cost** - No usage limits during development
4. **Data isolation** - Dev data separate from production
5. **Reproducibility** - Same environment for all developers

### The Architecture

Supabase is not a monolith - it's a collection of open-source tools:

```
                    ┌─────────────────┐
                    │   Your App      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Kong (API GW) │  Dynamic (or SUPABASE_API_PORT)
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           │                 │                 │
   ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
   │    GoTrue     │ │   PostgREST   │ │ postgres-meta │
   │    (Auth)     │ │   (REST API)  │ │  (for Studio) │
   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │  Dynamic (or SUPABASE_DB_PORT)
                    │  (with pgvector,│
                    │   extensions)   │
                    └─────────────────┘

   Optional:
   ┌─────────────────┐
   │  Studio (UI)    │  Dynamic (or SUPABASE_STUDIO_PORT)
   └─────────────────┘
```

### The Docker Compose Profiles Pattern

Use profiles to make services optional:

```yaml
services:
  my-app:
    # No profile = always starts

  supabase-db:
    profiles: [supabase] # Only starts with --profile supabase
```

This gives you:

- `docker compose up` - Just your app
- `docker compose --profile supabase up` - App + Supabase

### Which Services Do You Need?

| Service       | Required?           | Purpose                      |
| ------------- | ------------------- | ---------------------------- |
| PostgreSQL    | Yes                 | The database                 |
| Kong          | Yes                 | API gateway, routes requests |
| GoTrue        | Yes (if using auth) | Authentication               |
| PostgREST     | Yes (if using REST) | Auto-generated REST API      |
| postgres-meta | Only for Studio     | Database introspection       |
| Studio        | No                  | Web dashboard UI             |
| Realtime      | No                  | WebSocket subscriptions      |
| Storage       | No                  | File storage (S3-compatible) |

**Minimal setup**: PostgreSQL + Kong + GoTrue + PostgREST

### The Password Synchronization Challenge

The Supabase PostgreSQL image creates internal roles with their own passwords. Your services (GoTrue, PostgREST) need to connect with YOUR password.

**The problem**: Roles are created during PostgreSQL initialization with passwords that don't match your environment variable.

**The solution**: An init container that runs AFTER the database is healthy, updating role passwords:

```yaml
supabase-init:
  depends_on:
    supabase-db:
      condition: service_healthy
  command: |
    psql -h supabase-db -U supabase_admin -c "ALTER USER supabase_auth_admin WITH PASSWORD '...';"
```

Services then depend on the init container completing successfully:

```yaml
supabase-auth:
  depends_on:
    supabase-init:
      condition: service_completed_successfully
```

### JWT Keys for Local Development

Supabase uses JWTs for API authentication. For local development, you can use deterministic keys (same for all developers):

1. **anon key** - Public, used by client apps
2. **service_role key** - Private, bypasses RLS

These must be:

- Signed with the same JWT secret as your database
- Have the correct claims (`role: "anon"` or `role: "service_role"`)

The keys in this guide are the official Supabase demo keys - they work with the default JWT secret.

### Kong Configuration Essentials

Kong routes requests to the right services:

- `/auth/v1/*` → GoTrue
- `/rest/v1/*` → PostgREST
- `/pg/*` → postgres-meta (for Studio)

Kong also handles:

- API key authentication
- CORS headers
- ACL (which roles can access which routes)

**Important**: Kong's declarative config doesn't support environment variable substitution. Either hardcode the keys or use a templating solution.

### Switching Between Local and Cloud

Your app should read Supabase config from environment variables:

```javascript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

Then switching is just changing `.env`:

```bash
# Cloud
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-cloud-key

# Local (requires SUPABASE_API_PORT=54321 in .env, or discover with docker compose port)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-key
```

### Recommended Reading

- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Supabase Docker Repository](https://github.com/supabase/supabase/tree/master/docker)
- [Kong Declarative Configuration](https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/)
- [PostgREST Documentation](https://postgrest.org/)
- [GoTrue Documentation](https://github.com/supabase/gotrue)

### Version Selection Tips

When choosing versions for a new project:

1. **PostgreSQL**: Use the latest `supabase/postgres` image - it includes all required extensions
2. **Kong**: Version 2.x works well; 3.x has different config format
3. **GoTrue**: Match the version Supabase Cloud uses for API compatibility
4. **PostgREST**: Latest stable is usually fine
5. **Studio**: Optional, use latest for best experience

Check [Supabase releases](https://github.com/supabase/supabase/releases) for compatible version sets.

---

## Troubleshooting

### "password authentication failed"

The init container didn't run or failed. Check:

```bash
docker compose --profile supabase logs supabase-init
```

Reset and try again:

```bash
docker compose --profile supabase down -v
docker compose --profile supabase up
```

### Services start but can't connect to each other

Check they're on the same Docker network:

```bash
docker compose --profile supabase ps
```

### Kong returns "Invalid authentication credentials"

The API keys in `kong.yml` must match exactly what you send in the `apikey` header.

### Studio shows as "unhealthy"

Studio's healthcheck is strict. It usually still works - discover the port with `docker compose port supabase-studio 3000` and access it.
