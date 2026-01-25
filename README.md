# Islamic Finance Knowledge Assistant

AI-powered chatbot for Islamic finance questions. Features RAG-based knowledge retrieval, multi-agent orchestration, MCP profit calculations, and streaming responses.

## Features

- **RAG Knowledge Base**: Vector search over 30+ Islamic finance documents using pgvector (768-dim embeddings)
- **Multi-Agent System**: Routing → Knowledge/Calculation → Compliance agent pipeline
- **Profit Calculator**: Musharakah & Mudharabah calculations via MCP
- **Streaming Chat**: SSE-based token-by-token response delivery
- **Admin Dashboard**: Document upload with PDF/DOCX/TXT/MD support
- **Dual LLM Config**: Cloud LLM + local embeddings for production

## Tech Stack

| Layer    | Technology                                                               |
| -------- | ------------------------------------------------------------------------ |
| Frontend | React 18.3, React Router v7, TanStack Query, XState, Tailwind, shadcn/ui |
| Backend  | Hono 4.6, Drizzle ORM, Langchain 0.3, @langchain/ollama                  |
| Database | PostgreSQL 16 + pgvector                                                 |
| LLM      | Ollama (Llama 3.1 8B), nomic-embed-text embeddings                       |
| MCP      | @modelcontextprotocol/sdk 1.0                                            |
| Build    | Vite, TypeScript 5.3, pnpm workspaces                                    |

## Project Structure

```
├── frontend/              # React SPA
│   ├── app/
│   │   ├── routes/        # / (chat), /admin
│   │   ├── components/    # Chat, DocumentUpload
│   │   ├── hooks/         # use-chat-stream (SSE)
│   │   └── reducer/       # Chat state (useReducer)
│   └── vite.config.ts     # Dev server :3000, proxy /api → :3001
│
├── backend/               # Hono API server
│   ├── agents/            # 4-agent system
│   │   ├── agent-orchestrator.ts
│   │   ├── routing-agent.ts      # 6 categories
│   │   ├── knowledge-agent.ts    # RAG pipeline
│   │   ├── calculation-agent.ts  # MCP client
│   │   └── compliance-agent.ts   # Shariah validation
│   ├── services/
│   │   ├── embedding-service.ts  # nomic-embed-text
│   │   ├── document-processor.ts # PDF/DOCX/TXT/MD
│   │   └── chunking-service.ts   # 800 tokens/chunk
│   ├── repositories/
│   │   └── chunk.repository.ts   # Vector search (cosine)
│   └── db/
│       └── schema.ts             # documents, documentChunks
│
├── mcp-server/            # MCP calculation service
│   ├── src/
│   │   ├── index.ts              # McpServer + StdioTransport
│   │   ├── tools/                # calculate_musharakah, calculate_mudharabah
│   │   └── calculators/          # Business logic
│   └── package.json
│
├── shared/                # Shared Zod schemas
│   └── src/schemas/
│
├── docker/                # Docker configs
│   ├── backend.Dockerfile        # Multi-stage, tsx runtime
│   ├── frontend.Dockerfile       # Vite build → nginx
│   ├── nginx.conf                # /api proxy, SPA routing
│   ├── entrypoint.sh             # Migrations + start
│   └── ollama-entrypoint.sh      # Auto-pull embeddings
│
├── docker-compose.yml            # Dev: postgres only
└── docker-compose.prod.yml       # Prod: full stack
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker
- Ollama (local dev)

## Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d

# Install Ollama + pull models
brew install ollama
ollama serve
pnpm ollama:pull  # llama3.1:8b + nomic-embed-text

# Setup database
pnpm db:generate && pnpm db:migrate

# Start all services
pnpm dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
```

## Production Deployment

```bash
# Configure environment
cp .env.prod.example .env.prod
# Edit: POSTGRES_PASSWORD, OLLAMA_API_KEY, OLLAMA_CLOUD_URL

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Access: http://localhost (nginx serves frontend, proxies /api)
```

### Production Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   nginx:80  │────▶│ backend:3001│────▶│postgres:5432│
│  (frontend) │     │ + MCP server│     │  (pgvector) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
   ┌──────▼──────┐                  ┌───────▼───────┐
   │ ollama:11434│                  │ Ollama Cloud  │
   │ (embeddings)│                  │ (LLM model)   │
   └─────────────┘                  └───────────────┘
```

## LLM Configuration

### Local (Development)

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### Cloud + Local Embeddings (Production)

```env
OLLAMA_CLOUD_URL=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b-cloud
OLLAMA_API_KEY=your-key

OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

## Multi-Agent Flow

```
User Query
    │
    ▼
┌─────────────────┐
│  Routing Agent  │  → Classifies: principles|products|compliance|
│  (temp: 0.1)    │     comparison|calculation|general
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌───────────┐
│Knowledge│ │Calculation│
│ Agent  │ │  Agent    │
│ (RAG)  │ │  (MCP)    │
└────┬───┘ └─────┬─────┘
     │           │
     └─────┬─────┘
           ▼
    ┌────────────┐
    │ Compliance │  → COMPLIANT | FLAGGED
    │   Agent    │
    └────────────┘
```

## Key Configurations

| Config          | Value           | Location                                                |
| --------------- | --------------- | ------------------------------------------------------- |
| Embedding dims  | 768             | `backend/db/schema.ts:27`                               |
| Chunk size      | 800 tokens      | `backend/services/chunking-service.ts:35`               |
| Chunk overlap   | 100 tokens      | `backend/services/chunking-service.ts:36`               |
| Retrieval limit | 5 → rerank to 3 | `KNOWLEDGE_RETRIEVAL_LIMIT`, `KNOWLEDGE_RERANKED_LIMIT` |
| Session timeout | 30 min          | `backend/services/session-store.ts:38`                  |
| Max file size   | 10 MB           | `backend/services/document-processor.ts:32`             |

## Scripts

```bash
pnpm dev              # Start all services
pnpm build            # Production build
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:studio        # Drizzle Studio
pnpm ollama:pull      # Pull required models
pnpm seed             # Seed documents
pnpm test             # Run tests
```

## License

[MIT](./LICENSE) - Danny Dwi Cahyono

## Author

Danny - AI Engineer
