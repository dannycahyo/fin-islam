# Product Requirements Document (PRD)

## Islamic Finance Knowledge Assistant

**Version:** 1.0  
**Date:** December 25, 2024  
**Owner:** Danny - AI Engineer  
**Type:** Personal Learning Project → Production Ready

---

## 1. Executive Summary

### 1.1 Overview

An AI-powered chatbot that provides accurate Islamic finance information to Muslims and Islamic organizations. This project serves as both a comprehensive learning exercise for modern LLM technologies and a genuinely useful production-ready application.

### 1.2 Goals

- **Personal Learning:** Master implementation of Vectors, Embeddings, RAG, Agents, MCP, Streaming, and Open Source LLMs
- **Product:** Create production-ready Islamic finance knowledge assistant
- **Impact:** Help Muslims understand Islamic finance principles, products, and calculations

---

## 2. Product Scope

### 2.1 Core Features (MVP - Must Have)

| Feature                     | Description                                                  | Learning Focus             |
| --------------------------- | ------------------------------------------------------------ | -------------------------- |
| **F1: Chat Interface**      | Single-session conversational chat (no login, no history)    | User Experience, Streaming |
| **F2: Knowledge Base**      | 30+ documents covering Islamic finance principles & products | RAG, Document Processing   |
| **F3: Profit Calculator**   | Musharakah & Mudharabah profit-sharing calculations          | MCP Integration            |
| **F4: Multi-Agent System**  | Routing, Knowledge, Calculation, and Compliance agents       | Agent Architecture         |
| **F5: Streaming Responses** | Real-time token-by-token answer delivery                     | Streaming & Real-time      |
| **F6: Admin Dashboard**     | Document upload and management (no auth)                     | Knowledge Management       |
| **F7: Open Source LLM**     | Local deployment via Ollama (Llama 3.1/Mistral)              | Open Source LLM            |
| **F8: Vector Search**       | Semantic search using embeddings                             | Vectors & Embeddings       |

### 2.2 Out of Scope

- Financial advice or recommendations
- Issuing fatwas or religious rulings
- Investment recommendations
- Banking system integrations
- Financial transactions
- Personal data storage
- Legal advice

---

## 3. User Requirements

### 3.1 Target Users

**Primary User: Muslim Learner**

- Wants to understand Islamic finance basics
- No prior knowledge required
- Needs clear, accessible explanations
- Usage: Ad-hoc learning

**Secondary User: Islamic Finance Professional**

- Needs quick reference and calculations
- Verifies understanding of concepts
- Usage: Regular work tool

**Admin User: Knowledge Manager**

- Maintains knowledge base quality
- Uploads and organizes documents
- Monitors system health

### 3.2 Key User Stories

**US-1: Learn Basic Concepts**

```
As a Muslim new to Islamic finance
I want to understand what Riba is
So I can make Shariah-compliant financial decisions

Acceptance:
- Ask "What is Riba?" in natural language
- Receive clear explanation with examples
- Understand why it's prohibited
- Can ask follow-up questions
```

**US-2: Compare Products**

```
As someone exploring financing options
I want to compare Murabaha vs Ijarah
So I can understand which suits different needs

Acceptance:
- Ask comparison naturally
- Get clear differences explained
- Understand use cases for each
- No product recommendations (info only)
```

**US-3: Calculate Profit Sharing**

```
As a business partner
I want to calculate profit distribution in Musharakah
So we ensure fair, Shariah-compliant sharing

Acceptance:
- Provide investment and profit amounts
- Receive step-by-step calculation
- 100% mathematically accurate
- Islamic finance terminology used
```

**US-4: Upload Documents (Admin)**

```
As a knowledge manager
I want to upload Islamic finance documents
So users can access comprehensive information

Acceptance:
- Upload PDF/DOCX/TXT/MD files
- Categorize document (Principle/Product/etc.)
- Document indexed within 5 minutes
- Can answer questions using new content
```

---

## 4. Functional Requirements

### 4.1 Chat Interface

**Requirements:**

- Single-session chat (no persistence)
- English language only
- Streaming token-by-token responses
- Follow-up question support
- Session resets on page refresh
- Mobile and desktop responsive

**Acceptance:**

- User can chat without login/registration
- Responses stream within 2 seconds
- Conversation context maintained in session
- Clean UI requiring no instructions

---

### 4.2 Knowledge Base

**Content Requirements:**

| Category        | Minimum Docs | Topics                                                            |
| --------------- | ------------ | ----------------------------------------------------------------- |
| **Principles**  | 10           | Riba, Gharar, Maysir, Halal/Haram basics                          |
| **Products**    | 15           | Murabaha, Musharakah, Mudharabah, Ijarah, Wakalah, Salam, Istisna |
| **Comparisons** | 5            | Islamic vs conventional, product comparisons                      |

**Document Processing:**

- Support PDF, DOCX, TXT, MD formats
- Chunk documents (500-800 tokens, 100 token overlap)
- Generate embeddings for all chunks
- Store in vector database
- Index metadata (category, title, description)

**Acceptance:**

- Minimum 30 documents covering core topics
- All documents properly chunked and embedded
- Semantic search returns relevant results
- Knowledge retrievable within session

---

### 4.3 Profit-Sharing Calculator (MCP)

**Calculation Types:**

**Musharakah:**

- Input: Partner investments, total profit/loss
- Output: Each partner's share based on capital ratio
- Note: Profits by agreement, losses always by capital ratio

**Mudharabah:**

- Input: Capital amount, profit, agreed ratio
- Output: Capital provider vs entrepreneur shares
- Note: Capital provider bears losses, entrepreneur gets nothing if loss

**Requirements:**

- MCP server performs calculations
- Extract parameters from natural language
- Show step-by-step breakdown
- 100% mathematical accuracy
- Handle edge cases (zero profit, losses)

**Acceptance:**

- Natural language input supported
- All calculations verified correct
- Clear explanations provided
- Islamic terminology used properly

---

### 4.4 Multi-Agent Architecture

**Agent Specifications:**

| Agent           | Responsibility             | Input               | Output                      |
| --------------- | -------------------------- | ------------------- | --------------------------- |
| **Routing**     | Classify query type        | User question       | Category + agent assignment |
| **Knowledge**   | Retrieve & synthesize info | Question + category | Contextual answer via RAG   |
| **Calculation** | Handle computations        | Numeric parameters  | Calculation result via MCP  |
| **Compliance**  | Validate Shariah alignment | Generated response  | Approved/flagged response   |

**Categories:**

- `principles` - Islamic finance fundamentals
- `products` - Specific product information
- `compliance` - Halal/haram verification
- `comparison` - Product/concept comparisons
- `calculation` - Numerical computations
- `general` - Miscellaneous questions

**Flow:**

1. Routing Agent classifies question
2. Appropriate agent(s) process query
3. Compliance Agent validates response
4. Response streamed to user

**Acceptance:**

- 95%+ correct routing
- Seamless agent handoffs
- Complex queries handled by multiple agents
- User unaware of agent complexity

---

### 4.5 Streaming Responses

**Requirements:**

- Server-Sent Events (SSE) or WebSocket
- Token-by-token delivery
- Visual indicators (typing, streaming, complete)
- Smooth rendering without flicker
- Handle network interruptions gracefully

**Acceptance:**

- Streaming begins < 2 seconds
- Readable streaming speed
- Clean completion indicator
- Works on mobile browsers

---

### 4.6 Admin Dashboard

**Features:**

**Document Upload:**

- Drag-and-drop or file browser
- Support PDF, DOCX, TXT, MD
- Categorization (Principle/Product/Comparison/General)
- Title and description fields
- Progress indication

**Document Management:**

- List all documents (title, category, date, status)
- View document details
- Delete with confirmation
- Re-index if needed

**Monitoring:**

- Total documents count
- System health status
- Indexing status
- Basic usage stats (optional)

**Acceptance:**

- No authentication required
- Upload process < 5 minutes
- Intuitive interface
- Clear success/error messages
- Documents immediately searchable after indexing

---

### 4.7 LLM Integration

**Model Selection:**

- Primary: Ollama (Llama 3.1 8B or Mistral 7B)
- Fallback: Cloud API (Claude/GPT - optional)

**Configuration:**

- System prompt with Islamic finance context
- Streaming enabled
- Temperature: 0.7 (balanced creativity/accuracy)
- Max tokens: 1000-2000

**Acceptance:**

- Local model runs successfully
- Understands Islamic finance concepts
- Generates accurate, relevant responses
- Streaming works properly

---

### 4.8 Vector Search & Embeddings

**Components:**

- **Embedding Model:** sentence-transformers (all-MiniLM-L6-v2) or OpenAI text-embedding-3-small
- **Vector DB:** Qdrant (self-hosted) or Pinecone (cloud)
- **Search Strategy:** Hybrid (semantic + keyword)
- **Retrieval:** Top 5-10 chunks, re-rank to top 3-5

**Process:**

1. Document chunked into passages
2. Each chunk embedded
3. Stored with metadata in vector DB
4. Query embedded at search time
5. Cosine similarity ranking
6. Top results returned to Knowledge Agent

**Acceptance:**

- All documents properly embedded
- Semantic search finds relevant content
- Works with varied phrasings
- Irrelevant results filtered (similarity threshold)

---

## 5. Non-Functional Requirements

### 5.1 Performance

- Response time: < 5 seconds (90th percentile)
- First token: < 2 seconds
- Document indexing: < 5 minutes (per 10MB file)
- Concurrent users: Support 50+ simultaneous sessions
- Vector search: < 500ms

### 5.2 Reliability

- System uptime: 99%+ (local deployment)
- Graceful error handling
- No data loss during operations
- Automatic recovery from transient failures

### 5.3 Usability

- Zero learning curve for basic chat
- Intuitive admin interface
- Clear error messages
- Mobile-friendly responsive design
- Accessible (keyboard navigation, screen reader friendly)

### 5.4 Security & Privacy

- No user data collection (sessionless)
- No personal information stored
- Secure document upload (file validation)
- HTTPS for production deployment
- Admin access control (in future versions)

### 5.5 Maintainability

- Clean, documented code
- Modular architecture
- TypeScript throughout
- Comprehensive error logging
- Easy to update knowledge base

---

## 6. Technical Architecture Overview

### 6.1 Data Flow

**Question → Answer:**

1. User submits question via chat UI
2. API receives question
3. Routing Agent classifies query
4. Knowledge/Calculation Agent processes
5. Vector search retrieves relevant docs (if knowledge query)
6. MCP server called for calculations (if calculation query)
7. Response generated by LLM
8. Compliance Agent validates
9. Response streamed to frontend
10. User sees answer token-by-token

**Document Upload:**

1. Admin uploads file via dashboard
2. File validated (type, size)
3. Text extracted (PDF/DOCX parsing)
4. Document chunked into passages
5. Embeddings generated for each chunk
6. Chunks stored in vector DB
7. Metadata stored in DB
8. Admin sees confirmation
