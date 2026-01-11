# Cloud Ollama Configuration

Guide for using cloud-hosted Ollama with local embeddings.

## Overview

Use `docker-compose.cloud.yml` to run the application with:

- **Cloud Ollama API** for chat/completion (llama3.1:8b)
- **Local Ollama** for embeddings only (nomic-embed-text)

This hybrid approach significantly reduces resource requirements while maintaining full functionality.

## Why Hybrid?

Cloud providers typically don't offer embedding model APIs, so we run:

- **Chat models** → Cloud (resource-intensive, 8GB+ models)
- **Embedding models** → Local (lightweight, ~500MB model)

## Benefits

- **Reduced GPU requirements** - Chat inference on cloud
- **Lower memory usage** - Only embedding model local (~4GB vs 12GB+)
- **Faster startup** - Only pull small embedding model
- **Lower disk usage** - Save ~7.5GB (only nomic-embed-text ~500MB)
- **Scalable chat** - Cloud handles chat load
- **Cost-effective** - Pay only for chat API calls

## Prerequisites

- Ollama Cloud API key
- Stable internet connection
- Cloud Ollama account (https://ollama.ai or compatible provider)

## Configuration

### 1. Environment Variables

Update your `.env` file with cloud configuration:

```bash
# Cloud Ollama for chat/completion
OLLAMA_CLOUD_URL=https://api.ollama.ai
OLLAMA_CLOUD_API_KEY=your-actual-api-key-here
OLLAMA_CLOUD_MODEL=llama3.1:8b

# Local Ollama for embeddings (runs in Docker)
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Backward compatibility
OLLAMA_MODEL=llama3.1:8b
OLLAMA_API_KEY=your-actual-api-key-here
```

**Note**: `OLLAMA_BASE_URL` stays as `http://ollama:11434` for local embeddings.

### 2. Full `.env` Example for Cloud

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=islamic_finance
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=3001
NODE_ENV=production

# Cloud Ollama for chat (REQUIRED)
OLLAMA_CLOUD_URL=https://api.ollama.ai
OLLAMA_CLOUD_API_KEY=sk-your-api-key-here
OLLAMA_CLOUD_MODEL=llama3.1:8b

# Local Ollama for embeddings
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Backward compatibility
OLLAMA_MODEL=llama3.1:8b
OLLAMA_API_KEY=sk-your-api-key-here

# Frontend
FRONTEND_PORT=80
VITE_API_URL=http://localhost:3001

# Other configs...
MAX_FILE_SIZE=10485760
VECTOR_DIMENSIONS=768
SIMILARITY_THRESHOLD=0.7
LOG_LEVEL=info
```

## Usage

### Start with Cloud Ollama

```bash
# Using docker-compose
docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up -d

# Or with Makefile
make up-cloud
```

### Stop Services

```bash
# Stop all
docker-compose -f docker-compose.yml -f docker-compose.cloud.yml down

# Or
make down
```

## What Changes?

### Services Started

1. ✅ **Frontend** (nginx)
2. ✅ **Backend** (Node.js) - configured for hybrid Ollama
3. ✅ **PostgreSQL** with pgvector
4. ✅ **MCP Server**
5. ✅ **Ollama** (embeddings only - reduced resources)

### Resource Comparison

| Resource        | Full Local           | Hybrid (Cloud Chat + Local Embeddings) |
| --------------- | -------------------- | -------------------------------------- |
| RAM             | ~12-16GB             | ~6-8GB                                 |
| Disk            | ~50GB                | ~15GB                                  |
| GPU             | Required/Recommended | Optional (only for embeddings)         |
| Startup         | 5-10 min             | 2-3 min                                |
| Chat Model      | Local (~8GB)         | Cloud API                              |
| Embedding Model | Local (~500MB)       | Local (~500MB)                         |

## Verification

### 1. Check Backend Configuration

```bash
# View backend logs
docker-compose logs backend | grep -i ollama

# Should show cloud URL, not localhost
# Example: "Ollama URL: https://api.ollama.ai"
```

### 2. Test API Connection

```bash
# Check backend health
curl http://localhost:3001/health

# Send test query
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is Islamic finance?"}'
```

### 3. Verify Ollama (Embeddings Only)

```bash
# Ollama container should be running
docker-compose ps ollama
# Should show: Up (healthy)

# Check only embedding model is loaded
docker exec islamic-finance-ollama ollama list
# Should show ONLY: nomic-embed-text

# Port 11434 accessible (for embeddings)
curl http://localhost:11434/api/tags
# Should return embedding model info
```

## Troubleshooting

### API Key Issues

**Error**: "Unauthorized" or "Invalid API key"

**Solution**:

```bash
# Verify API key in .env
cat .env | grep OLLAMA_API_KEY

# Restart backend
docker-compose restart backend
```

### Connection Errors

**Error**: "Failed to connect to Ollama"

**Solution**:

```bash
# Check OLLAMA_CLOUD_URL
cat .env | grep OLLAMA_CLOUD_URL

# Test URL manually
curl https://api.ollama.ai/api/tags

# Check backend logs
docker-compose logs backend
```

### Slow Responses

**Issue**: Slower than local Ollama

**Explanation**:

- Cloud has network latency
- Local Ollama is faster for inference
- Cloud better for scalability

**Options**:

- Use streaming responses (already enabled)
- Upgrade cloud tier
- Switch back to local for low-latency needs

### Rate Limiting

**Error**: "Rate limit exceeded"

**Solution**:

- Upgrade cloud plan
- Implement request caching
- Add retry logic with backoff

## Cost Considerations

### Cloud Ollama Pricing

Check your provider's pricing:

- **Free tier**: Limited requests/month
- **Pay-as-you-go**: Per token/request
- **Subscription**: Monthly unlimited

### Cost Optimization

1. **Cache responses** - Reduce duplicate queries
2. **Smaller models** - Use 7b instead of 8b if available
3. **Batch requests** - Combine when possible
4. **Monitor usage** - Track API calls

## Switching Between Local and Cloud

### Switch to Local

```bash
# Stop cloud setup
docker-compose -f docker-compose.yml -f docker-compose.cloud.yml down

# Start with local Ollama
docker-compose up -d

# Pull models
./scripts/init-ollama.sh
```

### Switch to Cloud

```bash
# Stop local setup
docker-compose down

# Update .env with cloud config
nano .env

# Start with cloud
docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up -d
```

## Security Best Practices

### API Key Management

```bash
# Never commit .env
echo ".env" >> .gitignore

# Use environment variables in CI/CD
export OLLAMA_API_KEY="sk-..."

# Rotate keys regularly
# Update in cloud provider dashboard
```

### Network Security

```bash
# Use HTTPS only
OLLAMA_CLOUD_URL=https://api.ollama.ai  # ✅ Secure
# OLLAMA_CLOUD_URL=http://api.ollama.ai  # ❌ Insecure

# Restrict API key permissions
# Configure in cloud provider settings
```

## Alternative Cloud Providers

If using different Ollama-compatible API:

```bash
# OpenRouter
OLLAMA_CLOUD_URL=https://openrouter.ai/api/v1
OLLAMA_API_KEY=sk-or-...

# Replicate
OLLAMA_CLOUD_URL=https://api.replicate.com
OLLAMA_API_KEY=r8_...

# Custom deployment
OLLAMA_CLOUD_URL=https://your-ollama.example.com
OLLAMA_API_KEY=your-key
```

## Makefile Support

Add to `Makefile`:

```makefile
# Start with cloud Ollama
up-cloud:
	docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up -d

# Bootstrap with cloud
bootstrap-cloud:
	@if [ ! -f .env ]; then \
		echo "Creating .env..."; \
		cp .env.example .env; \
		echo "⚠️  Update OLLAMA_API_KEY in .env"; \
		read -p "Press enter after updating..."; \
	fi
	@echo "Starting with cloud Ollama..."
	@make up-cloud
	@./scripts/wait-for-services.sh
	@./scripts/setup-database.sh
	@./scripts/health-check.sh
```

Usage:

```bash
make up-cloud
make bootstrap-cloud
```

## Summary

**When to Use Cloud Ollama**:

- ✅ Limited local resources (RAM/GPU)
- ✅ Production deployment
- ✅ Scalability needs
- ✅ Quick testing/development
- ✅ Cost-effective for low volume

**When to Use Local Ollama**:

- ✅ Privacy requirements
- ✅ Low latency needs
- ✅ High request volume
- ✅ Offline operation
- ✅ Full control over models

## Support

For cloud-specific issues:

1. Check cloud provider status
2. Verify API key validity
3. Review backend logs: `docker-compose logs backend`
4. Test API endpoint manually
5. Contact cloud provider support

For application issues:

1. Follow main [DOCKER.md](./DOCKER.md) troubleshooting
2. Run health checks: `make health`
3. Open GitHub issue
