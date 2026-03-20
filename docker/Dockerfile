# Development Dockerfile for SpokeToWork
FROM node:22-slim AS base

# Install pnpm and configure store
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm config set store-dir /pnpm/store --global

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* ./
# Use pnpm if lockfile exists, otherwise npm
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else echo "No lockfile found" && exit 1; fi

# Development image
FROM base AS dev
WORKDIR /app

# Create node user if it doesn't exist and set ownership
RUN useradd -m -u 1000 node 2>/dev/null || true

# Install system dependencies for development tools
# Playwright browsers run in a separate MCP container (see .mcp.json)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    imagemagick \
    bc \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global --add safe.directory /app

# Install gitleaks for secret scanning
RUN curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_linux_x64.tar.gz | tar -xz -C /usr/local/bin gitleaks && \
    chmod +x /usr/local/bin/gitleaks

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

COPY --chown=node:node . .

# Set proper ownership for all files including pnpm store
RUN chown -R node:node /app /pnpm

# Copy entrypoint script
COPY --chown=node:node docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as non-root user (Bret Fisher pattern: USER in Dockerfile,
# not runtime su/gosu. This also fixes docker compose exec running
# as root and creating root-owned files in bind mounts like .git/)
USER node

# Expose ports for Next.js and Storybook
EXPOSE 3000 6006

# Set hostname and port
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Use entrypoint to handle initialization
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start development server (Storybook can be run separately if needed)
CMD ["pnpm", "run", "dev"]

# Builder stage for production
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]