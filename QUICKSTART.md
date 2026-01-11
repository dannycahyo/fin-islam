# Quick Start Guide

Get Islamic Finance Knowledge Assistant running in 5 minutes.

## Prerequisites

### Local Ollama (Full Setup)

- Docker & Docker Compose installed
- 16GB RAM minimum
- 50GB free disk space
- (Optional) GPU for faster inference

### Cloud Ollama (Lightweight)

- Docker & Docker Compose installed
- 4GB RAM minimum
- 10GB free disk space
- Ollama Cloud API key

## 1. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Update password (IMPORTANT!)
# Edit .env and change POSTGRES_PASSWORD
```

## 2. Start Everything

### Option A: Automated (Recommended)

```bash
chmod +x scripts/*.sh
./scripts/bootstrap.sh
```

### Option B: Using Make

```bash
make bootstrap
```

### Option C: Manual

```bash
# Start services
docker-compose up -d

# Wait for services (2-3 minutes)
./scripts/wait-for-services.sh

# Pull Ollama models (10-20 minutes)
./scripts/init-ollama.sh

# Setup database
./scripts/setup-database.sh

# Check health
./scripts/health-check.sh
```

## 3. Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart
docker-compose restart

# Health check
make health
```

## Alternative Deployments

### CPU-only (No GPU)

```bash
# Use CPU-only configuration
docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up -d

# Or with make
make up-cpu
```

### Cloud Ollama (Hybrid - Recommended for Limited Resources)

Hybrid approach using cloud for chat + local for embeddings:

```bash
# 1. Update .env with cloud settings
# OLLAMA_CLOUD_URL=https://api.ollama.ai
# OLLAMA_CLOUD_API_KEY=your-api-key
# OLLAMA_CLOUD_MODEL=llama3.1:8b

# 2. Start with cloud Ollama
make bootstrap-cloud

# Or manual
docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up -d
./scripts/init-ollama-embeddings.sh
```

**Architecture**:

- Chat model: Cloud API (llama3.1:8b)
- Embeddings: Local Ollama (nomic-embed-text ~500MB)

**Benefits**: ~50% less RAM/disk, faster startup, optional GPU

**See**: [CLOUD_OLLAMA.md](./CLOUD_OLLAMA.md) for details

## Development Mode

```bash
# Start with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend will be on port 3000
# Backend on port 3001
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check disk space
df -h
```

### Backend can't connect to database

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check health
docker exec islamic-finance-db pg_isready -U postgres
```

### Ollama models not downloading

```bash
# Check disk space
docker exec islamic-finance-ollama df -h

# Manually pull
docker exec islamic-finance-ollama ollama pull llama3.1:8b
```

## Next Steps

- Read full documentation: [DOCKER.md](./DOCKER.md)
- View API docs: http://localhost:3001
- Upload documents via frontend
- Start chatting!

## Need Help?

1. Check logs: `docker-compose logs -f`
2. Run health check: `make health`
3. See [DOCKER.md](./DOCKER.md) for detailed troubleshooting
