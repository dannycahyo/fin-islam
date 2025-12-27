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
- **pnpm**: 8.0.0 or higher
- **PostgreSQL**: 16+ (or Docker)
- **Ollama**: Latest version
- **Git**: For version control

## Quick Start

### 1. Install Dependencies

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### 2. Set Up PostgreSQL with pgvector

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL with pgvector
docker-compose up -d

# Verify database is running
docker ps
```

**Option B: Local PostgreSQL**

```bash
# Install pgvector extension
# See: https://github.com/pgvector/pgvector#installation

# Create database
createdb islamic_finance
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Key variables:
# - DATABASE_URL: PostgreSQL connection string
# - OLLAMA_BASE_URL: Ollama server URL (default: http://localhost:11434)
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
├── docs/                # Documentation
│   ├── PRD.md
│   └── TRD.md
└── package.json         # Root workspace config
```

## Available Scripts

### Root Level

```bash
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format code with Prettier
pnpm typecheck        # Type check all packages
pnpm clean            # Clean all node_modules and build outputs
```

### Frontend

```bash
pnpm dev:frontend     # Start Vite dev server
pnpm build:frontend   # Build for production
```

### Backend

```bash
pnpm dev:backend      # Start backend with hot reload
pnpm build:backend    # Compile TypeScript
pnpm db:generate      # Generate Drizzle schema
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio
```

### MCP Server

```bash
pnpm dev:mcp          # Start MCP server
pnpm build:mcp        # Build MCP server
```

## Development Workflow

1. **Start PostgreSQL**: `docker-compose up -d`
2. **Start Ollama**: `ollama serve` (in separate terminal)
3. **Start all services**: `pnpm dev`
4. **Open browser**: Navigate to http://localhost:3000
5. **Access admin**: Upload documents via admin dashboard
6. **Test chat**: Ask Islamic finance questions

## Configuration

### Database

Configure PostgreSQL connection in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/islamic_finance
```

### Ollama

Configure LLM settings in `.env`:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### Vector Search

Tune vector search parameters:

```env
VECTOR_DIMENSIONS=768
SIMILARITY_THRESHOLD=0.7
MAX_RESULTS=10
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

## Production Deployment

1. Build all packages: `pnpm build`
2. Set `NODE_ENV=production` in `.env`
3. Configure production database
4. Set up reverse proxy (nginx/caddy)
5. Use process manager (PM2/systemd)
6. Configure HTTPS

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

MIT

## Author

Danny - AI Engineer

## References

- [PRD.md](./docs/PRD.md) - Product Requirements
- [TRD.md](./docs/TRD.md) - Technical Requirements
- [Ollama](https://ollama.ai)
- [pgvector](https://github.com/pgvector/pgvector)
- [Model Context Protocol](https://modelcontextprotocol.io)
