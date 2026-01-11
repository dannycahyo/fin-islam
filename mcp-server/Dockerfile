# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY mcp-server/package.json ./mcp-server/
COPY shared/package.json ./shared/

# Install pnpm
RUN npm install -g pnpm@9.15.4

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY mcp-server ./mcp-server
COPY shared ./shared
COPY tsconfig.base.json ./

# Build mcp-server
WORKDIR /app/mcp-server
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.4

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY mcp-server/package.json ./mcp-server/
COPY shared/package.json ./shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Switch to non-root user
USER node

WORKDIR /app/mcp-server

CMD ["node", "dist/index.js"]
