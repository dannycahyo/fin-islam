# Islamic Finance Knowledge Assistant

An AI-powered chatbot providing accurate Islamic finance information to Muslims and organizations. Built with modern LLM technologies including RAG, Multi-Agent Systems, MCP, and Open Source LLMs.

## Features

- **Chat Interface**: Conversational AI assistant for Islamic finance questions
- **Knowledge Base**: RAG-powered retrieval from 30+ documents on Islamic finance
- **Profit Calculator**: MCP-based Musharakah & Mudharabah profit-sharing calculations
- **Multi-Agent System**: Specialized routing, knowledge, calculation, and compliance agents
- **Streaming Responses**: Real-time token-by-token answer delivery
- **Admin Dashboard**: Document upload and management interface
- **Open Source LLM**: Local deployment via Ollama (Llama 3.1)
- **Vector Search**: Semantic search using pgvector

## Tech Stack

### Frontend

- React 18.3+ with React Router v7
- TypeScript 5.3+
- Tailwind CSS + shadcn/ui
- XState for state management
- TanStack Query for server state
- Vite for build tooling

### Backend

- Hono.js web framework
- PostgreSQL 16+ with pgvector
- Drizzle ORM
- Langchain.js for LLM orchestration
- Ollama for local LLM runtime

### AI/ML

- Llama 3.1 8B (via Ollama)
- nomic-embed-text for embeddings
- Multi-agent architecture
- Model Context Protocol (MCP)

## Prerequisites

- **Node.js**: 20.0.0 or higher
- **pnpm**: 9.0.0 or higher
- **Docker**: For PostgreSQL and production deployment
- **Ollama**: Latest version (for local development)
- **Git**: For version control

## Quick Start (Development)

### 1. Install Dependencies

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.dev.example .env

# Edit .env with your configuration
```

### 3. Start PostgreSQL

```bash
# Start PostgreSQL with pgvector
docker-compose up -d

# Verify database is running
docker ps
```

### 4. Install Ollama and Pull Models

```bash
# Install Ollama (macOS)
brew install ollama

# Or download from https://ollama.ai

# Start Ollama server
ollama serve

# Pull required models (in another terminal)
pnpm ollama:pull
# This runs: ollama pull llama3.1:8b && ollama pull nomic-embed-text
```

### 5. Set Up Database

```bash
# Generate database schema
pnpm db:generate

# Run migrations
pnpm db:migrate

# Optional: Open Drizzle Studio to view database
pnpm db:studio
```

### 6. Start Development Servers

```bash
# Start all services (frontend, backend, MCP server)
pnpm dev

# Or start individually:
pnpm dev:frontend  # http://localhost:3000
pnpm dev:backend   # http://localhost:3001
pnpm dev:mcp       # stdio transport
```

## Production Deployment (Docker)

Full containerized deployment with nginx reverse proxy.

### 1. Configure Environment

```bash
cp .env.prod.example .env.prod

# Edit .env.prod with production values:
# - POSTGRES_PASSWORD: Strong database password
# - OLLAMA_API_KEY: API key for cloud models
# - OLLAMA_CLOUD_URL: https://ollama.com (for cloud models)
```

### 2. Build and Start All Services

```bash
# Build and start all containers
docker compose -f docker-compose.prod.yml up -d --build

# Check container health
docker ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 3. Run Database Migrations

Migrations run automatically on container start via entrypoint script.

### 4. Access Application

- **Frontend**: http://localhost (port 80)
- **API**: http://localhost/api

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   PostgreSQL    │
│   (nginx:80)    │     │   (node:3001)   │     │  (pgvector:5432)│
└─────────────────┘     │  + MCP Server   │     └─────────────────┘
                        └────────┬────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
     ┌────────▼────────┐                   ┌────────▼────────┐
     │  Ollama (local) │                   │  Ollama (cloud) │
     │  Embeddings     │                   │  LLM Model      │
     │ :11434 container│                   │ ollama.com      │
     └─────────────────┘                   └─────────────────┘
```

## LLM Configuration

### Option 1: Local Models (Development)

Use local Ollama for both LLM and embeddings:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### Option 2: Cloud LLM + Local Embeddings (Production)

Use cloud Ollama for LLM, local container for embeddings:

```env
# Cloud LLM (requires API key)
OLLAMA_CLOUD_URL=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b-cloud
OLLAMA_API_KEY=your-api-key

# Local embeddings (containerized)
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### Option 3: Fully Local (Production)

Use local Ollama for everything (requires GPU):

```env
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
# No OLLAMA_CLOUD_URL or OLLAMA_API_KEY needed
```

## Project Structure

```
islamic-finance-assistant/
├── frontend/              # React + Vite frontend
│   ├── app/
│   │   ├── routes/       # Page routes
│   │   ├── components/   # UI components
│   │   ├── machines/     # XState state machines
│   │   └── lib/          # Utilities
│   └── package.json
├── backend/              # Hono.js backend
│   ├── agents/          # Multi-agent system
│   ├── db/              # Database schema & config
│   ├── services/        # Business logic
│   ├── routes/          # API routes
│   └── server.ts
├── mcp-server/          # MCP calculator service
│   └── src/
│       └── index.ts
├── docker/              # Docker configuration
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   ├── nginx.conf
│   ├── entrypoint.sh
│   └── ollama-entrypoint.sh
├── docs/                # Documentation
│   ├── PRD.md
│   └── TRD.md
├── docker-compose.yml        # Dev: PostgreSQL only
├── docker-compose.prod.yml   # Prod: Full stack
└── package.json              # Root workspace config
```

## Architecture

### Multi-Agent System

1. **Routing Agent**: Classifies user queries into categories
2. **Knowledge Agent**: Retrieves information via RAG
3. **Calculation Agent**: Handles profit-sharing calculations via MCP
4. **Compliance Agent**: Validates Shariah alignment

### Data Flow

```
User Query → Routing Agent → [Knowledge/Calculation Agent] → Compliance Agent → Response
                ↓
         Vector Search (for knowledge queries)
         MCP Server (for calculations)
```

## Adding Documents

1. Navigate to Admin Dashboard at http://localhost:3000/admin
2. Click "Upload Document"
3. Select PDF/DOCX/TXT/MD file
4. Add title, description, and category
5. Click Upload
6. Document will be processed, chunked, embedded, and indexed

## SSL/HTTPS

For production HTTPS, use one of:

- Cloudflare Tunnel
- nginx-proxy with Let's Encrypt
- External load balancer (AWS ALB, etc.)

## Learning Objectives

This project demonstrates:

- ✅ Vector embeddings and semantic search
- ✅ RAG (Retrieval-Augmented Generation)
- ✅ Multi-agent AI systems
- ✅ Model Context Protocol (MCP)
- ✅ Streaming LLM responses
- ✅ Open source LLM deployment (Ollama)
- ✅ TypeScript monorepo management
- ✅ Modern React patterns (XState, TanStack Query)
- ✅ PostgreSQL with pgvector

## Contributing

This is a personal learning project. Feel free to fork and experiment!

## License

[MIT](./LICENSE)

## Author

Danny - AI Engineer

## References

- [PRD.md](./docs/PRD.md) - Product Requirements
- [TRD.md](./docs/TRD.md) - Technical Requirements
- [Ollama](https://ollama.ai)
- [pgvector](https://github.com/pgvector/pgvector)
- [Model Context Protocol](https://modelcontextprotocol.io)
