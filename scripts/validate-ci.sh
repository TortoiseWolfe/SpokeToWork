#!/bin/bash

# CI Validation Script
# Runs all CI checks locally to catch issues before pushing to GitHub
# This mirrors the GitHub Actions CI workflow

set -e  # Exit on any error

echo "🚀 Starting CI Validation..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if we're in Docker or not
if [ -f /.dockerenv ]; then
    IN_DOCKER=true
else
    IN_DOCKER=false
fi

# Clean up .next directory before starting to avoid permission issues
if [ "$IN_DOCKER" = false ]; then
    echo -e "${YELLOW}🧹 Cleaning build artifacts...${NC}"
    docker compose exec -T spoketowork rm -rf .next 2>/dev/null || true
fi

# Function to run a check
run_check() {
    local name=$1
    local command=$2

    echo -e "\n${YELLOW}🔍 Running: ${name}${NC}"
    echo "--------------------------------"

    if [ "$IN_DOCKER" = true ]; then
        # Running inside Docker, execute directly
        if $command; then
            echo -e "${GREEN}✅ ${name} passed${NC}"
        else
            echo -e "${RED}❌ ${name} failed${NC}"
            exit 1
        fi
    else
        # Running outside Docker, use docker compose exec
        if docker compose exec -T spoketowork $command; then
            echo -e "${GREEN}✅ ${name} passed${NC}"
        else
            echo -e "${RED}❌ ${name} failed${NC}"
            exit 1
        fi
    fi
}

# 1. Lint check
run_check "ESLint" "pnpm lint"

# 2. Type check
run_check "TypeScript type check" "pnpm type-check"

# 3. Unit tests (single vitest process — 4GB heap handles all 4500 tests)
run_check "Unit tests" "pnpm exec vitest run"

# 4. Contract tests (only when Supabase is already running — don't start it in pre-push)
if [ "$IN_DOCKER" = false ]; then
    if docker compose ps supabase-db 2>/dev/null | grep -q "running"; then
        run_check "Contract tests" "pnpm exec vitest run -c vitest.contract.config.ts"
    else
        echo -e "\n${YELLOW}⏭️  Skipping contract tests (Supabase not running — run ./scripts/supabase-up.sh to enable)${NC}"
    fi
else
    run_check "Contract tests" "pnpm exec vitest run -c vitest.contract.config.ts"
fi

# 6. Test coverage (optional - can be slow)
if [ "$1" != "--quick" ]; then
    run_check "Test coverage" "pnpm test:coverage"
fi

# 7. Production build — in its OWN container (#93)
#
# This must never be `docker compose exec spoketowork pnpm build`. That is the
# dev server's container, and `next dev` and `next build` both own /app/.next:
# the dev server rewrites webpack-runtime.js mid-build and the static-export
# workers then die on `Cannot find module './NNNN.js'`.
#
# The `builder` service is the same image with its own .next volume, so the two
# cannot collide — which also means the dev server no longer has to be stopped
# and restarted around every build.
if [ "$IN_DOCKER" = true ]; then
    # Already inside a container. That is fine — UNLESS it is the one serving
    # `next dev`, which is exactly the collision above. Test for the dev server
    # rather than for "am I in Docker": running this inside the builder
    # container is legitimate, running it inside the dev container is the bug.
    #
    # Scans /proc rather than using pgrep: node:22-slim ships no procps, so
    # `pgrep` there exits "command not found" and the guard would silently
    # never fire — a guard that always passes is worse than no guard.
    # The glob is expanded by the shell before grep is forked, so grep cannot
    # match its own command line.
    if cat /proc/[0-9]*/cmdline 2>/dev/null | tr '\0' '\n' \
        | grep -qE 'next-server|next/dist/bin/next'; then
        echo -e "\n${RED}❌ Refusing to build inside the dev-server container (#93).${NC}"
        echo -e "   It would clobber the .next this container is serving from."
        echo -e "   Run from the host instead:"
        echo -e "     ${YELLOW}./scripts/validate-ci.sh $*${NC}"
        echo -e "   or build directly:"
        echo -e "     ${YELLOW}docker compose run --rm builder pnpm build${NC}"
        exit 1
    fi
    run_check "Production build" "pnpm build"
else
    echo -e "\n${YELLOW}🔍 Running: Production build${NC}"
    echo "--------------------------------"
    if docker compose run --rm -T builder pnpm build; then
        echo -e "${GREEN}✅ Production build passed${NC}"
    else
        echo -e "${RED}❌ Production build failed${NC}"
        exit 1
    fi
fi

# 8. Storybook build (optional - can be slow)
if [ "$1" != "--quick" ]; then
    if [ "$IN_DOCKER" = true ]; then
        run_check "Storybook build" "pnpm build-storybook"
    else
        echo -e "\n${YELLOW}🔍 Running: Storybook build${NC}"
        echo "--------------------------------"
        echo "Stopping dev server to avoid conflicts..."
        docker compose stop spoketowork >/dev/null 2>&1
        if docker compose run --rm -T spoketowork pnpm run build-storybook; then
            echo -e "${GREEN}✅ Storybook build passed${NC}"
        else
            echo -e "${RED}❌ Storybook build failed${NC}"
            echo "Restarting dev server..."
            docker compose up -d spoketowork >/dev/null 2>&1
            exit 1
        fi
        echo "Restarting dev server..."
        docker compose up -d spoketowork >/dev/null 2>&1
    fi
fi

echo -e "\n================================"
echo -e "${GREEN}🎉 All CI checks passed!${NC}"
echo -e "Safe to push to GitHub.\n"