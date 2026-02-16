#!/bin/sh
set -e

# Docker entrypoint for SpokeToWork
# Runs as node user (set by USER in Dockerfile)
# No root operations needed at runtime

echo "Initializing SpokeToWork container..."

# Ensure dependencies match package.json (fast when already current)
echo "Checking dependencies..."
pnpm install --frozen-lockfile
echo "Dependencies are up-to-date"

# Ensure Playwright browsers are installed (handles version updates)
echo "Checking Playwright browsers..."
if pnpm exec playwright install chromium --dry-run 2>&1 | grep -q "already installed"; then
  echo "Playwright browsers up-to-date"
else
  echo "Installing Playwright browsers..."
  pnpm exec playwright install chromium
  echo "Playwright browsers installed"
fi

# Clean .next directory to prevent stale cache issues
echo "Cleaning .next directory..."
if [ -d "/app/.next" ]; then
  rm -rf /app/.next 2>/dev/null || echo "  .next is a volume (skip cleanup)"
fi

mkdir -p /app/.next
echo "Fresh .next directory configured"

if [ -f ".next/BUILD_ID" ]; then
    echo "Found existing build cache"
else
    echo "No build cache found (will be created on first run)"
fi

echo "Container initialized successfully"

# Execute the main command directly (already running as node)
exec "$@"
