# Multi-stage build for backend + mcp-server
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY mcp-server/package.json ./mcp-server/
COPY shared/package.json ./shared/
RUN pnpm install --frozen-lockfile --filter backend --filter mcp-server --filter shared

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/mcp-server/node_modules ./mcp-server/node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend ./backend
COPY mcp-server ./mcp-server
COPY shared ./shared

WORKDIR /app/backend
RUN pnpm build
WORKDIR /app/mcp-server
RUN pnpm build

# Production stage
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/
COPY mcp-server/package.json ./mcp-server/
COPY shared/package.json ./shared/

# Install all dependencies (need drizzle-kit for migrations)
RUN pnpm install --frozen-lockfile --filter backend --filter mcp-server --filter shared

# Copy built files
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/mcp-server/dist ./mcp-server/dist
COPY --from=build /app/shared ./shared

# Copy drizzle config and migrations
COPY backend/drizzle.config.ts ./backend/
COPY backend/drizzle ./backend/drizzle

# Copy entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create uploads directory and non-root user
RUN mkdir -p /app/uploads && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
