# Docker Deployment Guide

Production-ready Docker Compose configuration for Islamic Finance Knowledge Assistant.

## Architecture

```
┌─────────────┐
│  Frontend   │  Port 80 (nginx)
│  (React)    │
└──────┬──────┘
       │
┌──────▼──────┐
│  Backend    │  Port 3001 (Hono.js)
│  (Node.js)  │
└──┬───┬───┬──┘
   │   │   │
   │   │   └─────────┐
   │   │             │
┌──▼───▼──┐    ┌────▼────┐    ┌──────────┐
│PostgreSQL│    │ Ollama  │    │   MCP    │
│+pgvector │    │  LLM    │    │  Server  │
└──────────┘    └─────────┘    └──────────┘
```

## Services

| Service    | Container                  | Port  | Description               |
| ---------- | -------------------------- | ----- | ------------------------- |
| Frontend   | `islamic-finance-frontend` | 80    | nginx serving React app   |
| Backend    | `islamic-finance-backend`  | 3001  | Hono.js API server        |
| MCP Server | `islamic-finance-mcp`      | -     | Calculation tools (stdio) |
| PostgreSQL | `islamic-finance-db`       | 5432  | Database with pgvector    |
| Ollama     | `islamic-finance-ollama`   | 11434 | Local LLM service         |

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 16GB RAM minimum
- 50GB disk space
- (Optional) NVIDIA GPU for Ollama acceleration

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Update values (IMPORTANT: change POSTGRES_PASSWORD!)
nano .env
```

### 2. Bootstrap (Automated)

```bash
# One-command setup
chmod +x scripts/*.sh
./scripts/bootstrap.sh
```

This script will:

- Create .env if missing
- Start all Docker services
- Pull Ollama models
- Run database migrations
- Perform health checks

### 3. Manual Setup (Alternative)

```bash
# Start services
docker-compose up -d

# Wait for services (30-60s)
docker-compose ps

# Initialize Ollama models
./scripts/init-ollama.sh

# Setup database
./scripts/setup-database.sh

# Check health
./scripts/health-check.sh
```

## Accessing Services

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001
- **Ollama**: http://localhost:11434

## Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart service
docker-compose restart backend

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

### Database Operations

```bash
# Access PostgreSQL shell
docker exec -it islamic-finance-db psql -U postgres -d islamic_finance

# Run migrations
docker exec islamic-finance-backend sh -c "cd /app/backend && pnpm db:migrate"

# Backup database
docker exec islamic-finance-db pg_dump -U postgres islamic_finance > backup.sql

# Restore database
docker exec -i islamic-finance-db psql -U postgres islamic_finance < backup.sql
```

### Ollama Operations

```bash
# List downloaded models
docker exec islamic-finance-ollama ollama list

# Pull new model
docker exec islamic-finance-ollama ollama pull llama3.1:8b

# Test model
docker exec islamic-finance-ollama ollama run llama3.1:8b "Hello"

# Remove model
docker exec islamic-finance-ollama ollama rm llama3.1:8b
```

### Health Checks

```bash
# Run health check script
./scripts/health-check.sh

# Manual checks
curl http://localhost:3001/health
curl http://localhost:80/health
curl http://localhost:11434/api/tags
docker exec islamic-finance-db pg_isready -U postgres
```

### Debugging

```bash
# Execute shell in container
docker exec -it islamic-finance-backend sh

# View container stats
docker stats

# Inspect container
docker inspect islamic-finance-backend

# View container processes
docker top islamic-finance-backend

# View network
docker network inspect docker-compose_islamic-finance-network
```

## Volumes

### Persistent Data

```bash
# List volumes
docker volume ls | grep docker-compose

# Inspect volume
docker volume inspect docker-compose_postgres_data

# Backup volume
docker run --rm -v docker-compose_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore volume
docker run --rm -v docker-compose_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

### Volume Locations

- `postgres_data`: PostgreSQL database files
- `ollama_models`: Downloaded LLM models
- `uploads_data`: Uploaded documents

## Production Deployment

### Security Hardening

1. **Change default credentials**

```bash
# Update in .env
POSTGRES_PASSWORD=<strong-password>
```

2. **Use secrets management**

```bash
# Use Docker secrets instead of env vars
docker secret create postgres_password ./postgres_password.txt
```

3. **Enable TLS/SSL**

```nginx
# Update nginx.conf for HTTPS
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
}
```

4. **Restrict network access**

```yaml
# In docker-compose.yml, remove port mappings for internal services
# Only expose frontend and use reverse proxy
```

### Performance Tuning

1. **PostgreSQL**

```bash
# Increase shared_buffers for production
docker exec -it islamic-finance-db psql -U postgres -c "ALTER SYSTEM SET shared_buffers = '2GB';"
```

2. **Ollama GPU**

```yaml
# Ensure GPU is available
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

3. **Resource limits**

```yaml
# Add to docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

### Monitoring

```bash
# Install Prometheus exporter (example)
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# View metrics
curl http://localhost:9090/metrics
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check Docker daemon
docker info
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker exec islamic-finance-db pg_isready -U postgres
```

### Ollama model errors

```bash
# Check available disk space
docker exec islamic-finance-ollama df -h

# Re-pull model
docker exec islamic-finance-ollama ollama pull llama3.1:8b

# Check model list
docker exec islamic-finance-ollama ollama list
```

### Frontend can't reach backend

```bash
# Check network
docker network inspect docker-compose_islamic-finance-network

# Verify backend health
curl http://localhost:3001/health

# Check nginx config
docker exec islamic-finance-frontend cat /etc/nginx/conf.d/default.conf
```

### Out of memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Docker Desktop: Preferences > Resources > Memory

# Reduce Ollama model size
# Use smaller model: llama3.1:7b instead of 8b
```

## Clean System Test

### Prerequisites for clean test

```bash
# Remove existing containers
docker-compose down -v

# Remove images
docker rmi $(docker images -q 'islamic-finance*')

# Verify clean state
docker ps -a
docker volume ls
```

### Test procedure

```bash
# 1. Clone/copy project to clean directory
# 2. Setup environment
cp .env.example .env
nano .env  # Update POSTGRES_PASSWORD

# 3. Run bootstrap
./scripts/bootstrap.sh

# 4. Verify all services
./scripts/health-check.sh

# 5. Test frontend
curl http://localhost

# 6. Test backend
curl http://localhost:3001/health

# 7. Test document upload (if applicable)
# Upload a test document via frontend

# 8. Test chat functionality
# Send a test query via frontend
```

## Environment Variables

| Variable                 | Default            | Description                    |
| ------------------------ | ------------------ | ------------------------------ |
| `POSTGRES_USER`          | `postgres`         | Database user                  |
| `POSTGRES_PASSWORD`      | `postgres`         | Database password (⚠️ change!) |
| `POSTGRES_DB`            | `islamic_finance`  | Database name                  |
| `POSTGRES_PORT`          | `5432`             | PostgreSQL port                |
| `BACKEND_PORT`           | `3001`             | Backend API port               |
| `FRONTEND_PORT`          | `80`               | Frontend port                  |
| `OLLAMA_PORT`            | `11434`            | Ollama API port                |
| `OLLAMA_MODEL`           | `llama3.1:8b`      | Language model                 |
| `OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model                |
| `NODE_ENV`               | `production`       | Environment                    |
| `LOG_LEVEL`              | `info`             | Logging level                  |

## Network Architecture

All services communicate on `islamic-finance-network` (bridge network):

- Frontend → Backend: `http://backend:3001`
- Backend → PostgreSQL: `postgresql://postgres:5432`
- Backend → Ollama: `http://ollama:11434`
- Backend → MCP Server: stdio/IPC

External access:

- Frontend: `localhost:80`
- Backend: `localhost:3001`
- PostgreSQL: `localhost:5432` (dev only)
- Ollama: `localhost:11434` (dev only)

## Development vs Production

### Development (current setup)

```bash
# Exposes all ports for debugging
docker-compose up -d
```

### Production (recommended)

```yaml
# Remove port mappings for internal services
# Use reverse proxy (nginx/Traefik) for frontend
# Enable TLS/SSL
# Use Docker secrets
# Add monitoring
```

## CI/CD Integration

### GitHub Actions example

```yaml
name: Docker Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build images
        run: docker-compose build
      - name: Run tests
        run: docker-compose run backend pnpm test
```

### Automated deployment

```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d

# Run migrations
./scripts/setup-database.sh
```

## Support

For issues:

1. Check logs: `docker-compose logs -f`
2. Run health checks: `./scripts/health-check.sh`
3. Review troubleshooting section above
4. Open GitHub issue with logs

## License

[Your License]
