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

# Install system dependencies (requires root)
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

# Entrypoint needs root for chmod, copy before USER switch
COPY docker/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to node user BEFORE copying app files (Bret Fisher pattern).
# Official node:22-slim already includes the node user — no useradd needed.
# --chown on COPY sets ownership at copy time, eliminating the expensive
# RUN chown -R that previously re-owned hundreds of thousands of files
# on every rebuild.
USER node

# Copy dependencies with correct ownership
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy source with correct ownership
COPY --chown=node:node . .

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