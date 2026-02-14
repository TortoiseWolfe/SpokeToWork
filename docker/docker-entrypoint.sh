#!/bin/sh
set -e

# Docker entrypoint for SpokeToWork
# Handles .next directory permissions to prevent Docker/host conflicts

echo "🚀 Initializing SpokeToWork container..."

# Always ensure dependencies are up-to-date with package.json FIRST (as root)
# This is fast when dependencies are already installed but catches any new ones
echo "📦 Checking dependencies..."
pnpm install --frozen-lockfile
echo "✅ Dependencies are up-to-date"

# Ensure Playwright browsers are installed (handles version updates)
echo "🎭 Checking Playwright browsers..."
if pnpm exec playwright install chromium --dry-run 2>&1 | grep -q "already installed"; then
  echo "✅ Playwright browsers up-to-date"
else
  echo "📥 Installing Playwright browsers..."
  pnpm exec playwright install chromium
  echo "✅ Playwright browsers installed"
fi

# .next directory cleanup - remove if exists to prevent permission issues
echo "🧹 Cleaning .next directory..."
if [ -d "/app/.next" ]; then
  rm -rf /app/.next 2>/dev/null || echo "  .next is a volume (skip cleanup)"
else
  echo "  No .next directory to clean"
fi

# Create fresh .next directory with proper permissions
echo "🔧 Setting up fresh .next directory..."
mkdir -p /app/.next
chown -R node:node /app/.next
chmod -R 755 /app/.next
echo "✅ Fresh .next directory configured!"

# Ensure writable directories for node user (build scripts, static export)
chown node:node /app 2>/dev/null || true
chown -R node:node /app/node_modules 2>/dev/null || true
chown -R node:node /app/public 2>/dev/null || true
chown -R node:node /app/out 2>/dev/null || true

# Check for common issues that might need fixing
if [ -f ".next/BUILD_ID" ]; then
    echo "✅ Found existing build cache"
else
    echo "🔨 No build cache found (will be created on first run)"
fi

echo "✨ Container initialized successfully"

# Switch to node user and execute the main command
# Create a script that will be executed as node user
cat > /tmp/start.sh << 'SCRIPT'
#!/bin/sh
cd /app
exec "$@"
SCRIPT
chmod +x /tmp/start.sh

# Execute as node user
exec su node /tmp/start.sh "$@"