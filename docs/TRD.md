# Technical Requirements Document (TRD)

## Islamic Finance Knowledge Assistant

**Version:** 1.0  
**Date:** December 25, 2024  
**Author:** Danny - AI Engineer  
**Related:** PRD v1.0

---

## 1. Executive Summary

### 1.1 Purpose

This document defines the technical architecture, implementation details, and infrastructure requirements for the Islamic Finance Knowledge Assistant. It serves as the technical blueprint for development.

### 1.2 Technical Objectives

- Implement production-ready RAG architecture using open-source tools
- Deploy multi-agent system with specialized capabilities
- Achieve <5 second response time with streaming
- Support 50+ concurrent users on single machine
- Enable easy knowledge base management
- Demonstrate mastery of: Vectors, Embeddings, RAG, Agents, MCP, Streaming, Open Source LLMs

### 1.3 Development Environment

- **Primary Development:** MacBook Pro M1 2021, 16GB RAM
- **Target Deployment:** Linux server or containerized environment
- **Development OS:** macOS (primary), Linux (deployment)

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js Frontend (React Router v7 + Tailwind)        │ │
│  │  - Chat Interface (XState for state management)       │ │
│  │  - Admin Dashboard (shadcn/ui components)             │ │
│  │  - SSE Client (streaming responses)                   │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/SSE
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API LAYER                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Hono.js Backend (TypeScript)                          │ │
│  │  - REST API endpoints                                  │ │
│  │  - SSE streaming endpoint                              │ │
│  │  - File upload handling                                │ │
│  │  - Agent orchestration                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└───┬──────────────┬──────────────┬──────────────┬───────────┘
    │              │              │              │
    ▼              ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Agent   │  │ Vector   │  │ Ollama   │  │ PostgreSQL   │
│ System  │  │ Search   │  │ LLM      │  │ Database     │
└─────────┘  └──────────┘  └──────────┘  └──────────────┘
    │              │              │              │
    │              │              │              │
    └──────────────┴──────────────┴──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │  MCP Server  │
            │ (Calculator) │
            └──────────────┘
```

### 2.2 Component Breakdown

**Frontend (Port 3000)**

- React Router v7 application
- Server-side rendering (SSR) for initial page load
- Client-side routing for chat interactions
- Tailwind CSS for styling
- shadcn/ui component library
- XState for complex state management

**Backend API (Port 3001)**

- Hono.js lightweight framework
- TypeScript for type safety
- RESTful endpoints + SSE for streaming
- Agent orchestrator
- Document processing pipeline

**LLM Service (Port 11434)**

- Ollama server running Llama 3.1 8B
- Tool calling support for MCP
- Streaming response generation

**Vector Database**

- PostgreSQL with pgvector extension
- Embedded vector storage and search
- Document metadata storage

**MCP Server (Port 3002)**

- Standalone calculation service
- Implements Model Context Protocol
- Deterministic profit-sharing calculations

---

## 3. Technology Stack

### 3.1 Frontend Stack

| Technology         | Version | Purpose                  |
| ------------------ | ------- | ------------------------ |
| **React**          | 18.3+   | UI framework             |
| **React Router**   | v7      | Routing and data loading |
| **TypeScript**     | 5.3+    | Type safety              |
| **Tailwind CSS**   | 3.4+    | Utility-first styling    |
| **shadcn/ui**      | Latest  | Pre-built components     |
| **XState**         | 5.x     | State machine management |
| **TanStack Query** | 5.x     | Server state management  |
| **Zod**            | 3.x     | Runtime validation       |
| **React Markdown** | 9.x     | Markdown rendering       |
| **Lucide React**   | Latest  | Icon library             |

**Additional Frontend Packages:**

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@remix-run/react": "^2.x",
    "react-router": "^7.x",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "xstate": "^5.x",
    "@xstate/react": "^4.x",
    "@tanstack/react-query": "^5.x",
    "zod": "^3.22.0",
    "react-markdown": "^9.0.0",
    "lucide-react": "latest",
    "eventsource-parser": "^1.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 3.2 Backend Stack

| Technology       | Version | Purpose                  |
| ---------------- | ------- | ------------------------ |
| **Hono.js**      | 4.x     | Web framework            |
| **TypeScript**   | 5.3+    | Type safety              |
| **Node.js**      | 20+     | Runtime                  |
| **PostgreSQL**   | 16+     | Primary database         |
| **pgvector**     | 0.7.0+  | Vector similarity search |
| **Drizzle ORM**  | Latest  | Type-safe SQL queries    |
| **Ollama**       | Latest  | LLM runtime              |
| **Langchain.js** | 0.1.x   | LLM orchestration        |
| **pdf-parse**    | 1.1.1   | PDF text extraction      |
| **mammoth**      | 1.7.x   | DOCX text extraction     |
| **Zod**          | 3.x     | Schema validation        |

**Additional Backend Packages:**

```json
{
  "dependencies": {
    "hono": "^4.x",
    "@hono/node-server": "^1.x",
    "typescript": "^5.3.0",
    "postgres": "^3.4.0",
    "drizzle-orm": "^0.29.0",
    "drizzle-kit": "^0.20.0",
    "langchain": "^0.1.x",
    "@langchain/community": "^0.0.x",
    "@langchain/ollama": "^0.0.x",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.7.0",
    "zod": "^3.22.0",
    "dotenv": "^16.4.0",
    "nanoid": "^5.0.0",
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/pdf-parse": "^1.1.4",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.0"
  }
}
```

### 3.3 AI/ML Stack

| Component         | Technology                      | Purpose                          |
| ----------------- | ------------------------------- | -------------------------------- |
| **LLM**           | Llama 3.1 8B (via Ollama)       | Primary language model           |
| **Embeddings**    | nomic-embed-text (via Ollama)   | Text embeddings (768 dimensions) |
| **Vector Store**  | pgvector (PostgreSQL extension) | Vector similarity search         |
| **LLM Framework** | Langchain.js                    | Prompt templates, chains, agents |
| **MCP**           | @modelcontextprotocol/sdk       | Tool calling protocol            |

**Model Specifications:**

```bash
# Ollama models to pull
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

### 3.4 Infrastructure & DevOps

| Tool               | Purpose                        |
| ------------------ | ------------------------------ |
| **Docker**         | Containerization               |
| **Docker Compose** | Multi-container orchestration  |
| **pnpm**           | Package manager                |
| **Turborepo**      | Monorepo management (optional) |
| **ESLint**         | Code linting                   |
| **Prettier**       | Code formatting                |

---

## 4. Project Structure

```
islamic-finance-assistant/
├── frontend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── _index.tsx          # Chat page
│   │   │   └── admin.tsx            # Admin dashboard
│   │   ├── components/
│   │   │   ├── Chat.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── ui/                  # shadcn components
│   │   ├── machines/
│   │   │   └── chatMachine.ts
│   │   └── root.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── agents/
│   │   ├── routing-agent.ts
│   │   ├── knowledge-agent.ts
│   │   ├── calculation-agent.ts
│   │   ├── compliance-agent.ts
│   │   ├── orchestrator.ts
│   │   └── types.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── config.ts
│   │   └── migrations/
│   ├── services/
│   │   └── document-processor.ts
│   ├── server.ts
│   ├── package.json
│   └── tsconfig.json
├── mcp-server/
│   ├── calculator.ts
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

### 5. Setup Scripts

```json
// package.json (root)
{
  "name": "islamic-finance-assistant",
  "private": true,
  "workspaces": ["frontend", "backend", "mcp-server"],
  "scripts": {
    "setup": "pnpm install && pnpm db:setup && pnpm ollama:pull",
    "db:setup": "cd backend && pnpm db:generate && pnpm db:migrate",
    "ollama:pull": "ollama pull llama3.1:8b && ollama pull nomic-embed-text",
    "dev": "concurrently \"pnpm dev:backend\" \"pnpm dev:frontend\" \"pnpm dev:mcp\"",
    "dev:frontend": "cd frontend && pnpm dev",
    "dev:backend": "cd backend && pnpm dev",
    "dev:mcp": "cd mcp-server && pnpm dev",
    "build": "pnpm build:frontend && pnpm build:backend",
    "build:frontend": "cd frontend && pnpm build",
    "build:backend": "cd backend && pnpm build"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```
