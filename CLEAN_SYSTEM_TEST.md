# Clean System Test Checklist

Step-by-step guide for testing Docker deployment on a clean system.

## Prerequisites Verification

- [ ] Docker Engine 20.10+ installed

  ```bash
  docker --version
  ```

- [ ] Docker Compose 2.0+ installed

  ```bash
  docker-compose --version
  ```

- [ ] At least 16GB RAM available

  ```bash
  # macOS/Linux
  free -h  # or sysctl hw.memsize
  ```

- [ ] At least 50GB free disk space

  ```bash
  df -h
  ```

- [ ] (Optional) NVIDIA GPU for acceleration
  ```bash
  nvidia-smi
  ```

## Clean State Setup

### 1. Remove Existing Containers/Volumes

```bash
# Stop and remove any existing containers
docker ps -a | grep islamic-finance
docker stop $(docker ps -a -q --filter "name=islamic-finance")
docker rm $(docker ps -a -q --filter "name=islamic-finance")

# Remove volumes
docker volume ls | grep docker-compose
docker volume rm $(docker volume ls -q --filter "name=docker-compose")

# Remove images
docker images | grep islamic-finance
docker rmi $(docker images -q 'islamic-finance*')

# Verify clean state
docker ps -a
docker volume ls
docker images
```

### 2. Fresh Code Checkout

```bash
# Clone repository (or copy files to new directory)
cd /tmp
git clone <repository-url> islamic-finance-test
cd islamic-finance-test

# Or copy to new directory
cp -r ~/Projects/docker-compose /tmp/islamic-finance-test
cd /tmp/islamic-finance-test
```

## Configuration

### 3. Environment Setup

- [ ] Copy environment file

  ```bash
  cp .env.example .env
  ```

- [ ] Update .env file

  ```bash
  nano .env
  # Change POSTGRES_PASSWORD to a secure password
  # Verify other settings match your environment
  ```

- [ ] Verify .env contains required variables
  ```bash
  cat .env | grep -E "POSTGRES_PASSWORD|OLLAMA_MODEL|DATABASE_URL"
  ```

## Automated Deployment Test

### 4. Run Bootstrap Script

- [ ] Make scripts executable

  ```bash
  chmod +x scripts/*.sh
  ```

- [ ] Run bootstrap

  ```bash
  ./scripts/bootstrap.sh
  ```

- [ ] Monitor output for errors
  - Should see: "Starting Docker services..."
  - Should see: "Waiting for services..."
  - Should see: "Pulling Ollama models..."
  - Should see: "Database setup complete"
  - Should see: "Bootstrap complete!"

- [ ] Note total time taken: ****\_****

## Manual Verification

### 5. Service Health Checks

- [ ] Check all containers running

  ```bash
  docker-compose ps
  # Should show 5 services: frontend, backend, mcp-server, postgres, ollama
  # All should be "Up" with "(healthy)" status
  ```

- [ ] Run health check script

  ```bash
  ./scripts/health-check.sh
  # All services should show ✅ Healthy
  ```

- [ ] Verify PostgreSQL

  ```bash
  docker exec islamic-finance-db pg_isready -U postgres
  # Should output: "accepting connections"
  ```

- [ ] Verify Ollama models

  ```bash
  docker exec islamic-finance-ollama ollama list
  # Should show: llama3.1:8b and nomic-embed-text
  ```

- [ ] Check backend health endpoint

  ```bash
  curl http://localhost:3001/health
  # Should return: {"status":"ok","database":"connected","timestamp":"..."}
  ```

- [ ] Check frontend health endpoint
  ```bash
  curl http://localhost:80/health
  # Should return: "healthy"
  ```

### 6. Frontend Testing

- [ ] Access frontend in browser

  ```
  Open: http://localhost
  ```

- [ ] Verify page loads
  - [ ] No console errors
  - [ ] UI renders correctly
  - [ ] Chat interface visible

- [ ] Test document upload
  - [ ] Click upload button
  - [ ] Select a test PDF/DOCX
  - [ ] Verify upload succeeds

### 7. Backend API Testing

- [ ] Access API root

  ```bash
  curl http://localhost:3001
  # Should return API information
  ```

- [ ] Test document list endpoint

  ```bash
  curl http://localhost:3001/api/documents
  # Should return array (possibly empty)
  ```

- [ ] Upload test document via API
  ```bash
  curl -X POST http://localhost:3001/api/documents \
    -F "file=@test.pdf" \
    -F "title=Test Document" \
    -F "category=general"
  # Should return document ID
  ```

### 8. Chat Functionality Testing

- [ ] Send test query via frontend
  - [ ] Type: "What is Islamic finance?"
  - [ ] Verify response streams back
  - [ ] Check response is relevant

- [ ] Test calculation query
  - [ ] Type: "Calculate Musharakah profit for $100,000 investment"
  - [ ] Verify calculation is performed

- [ ] Test document-based query
  - [ ] Upload a document first
  - [ ] Ask question about document content
  - [ ] Verify RAG retrieval works

### 9. Service Communication Testing

- [ ] Verify frontend → backend proxy

  ```bash
  # In browser dev tools, check Network tab
  # API calls should go to /api/* and work
  ```

- [ ] Verify backend → PostgreSQL

  ```bash
  docker-compose logs backend | grep -i database
  # Should show successful connections
  ```

- [ ] Verify backend → Ollama
  ```bash
  docker-compose logs backend | grep -i ollama
  # Should show model calls
  ```

### 10. Persistence Testing

- [ ] Restart services

  ```bash
  docker-compose restart
  ```

- [ ] Wait for healthy state

  ```bash
  ./scripts/wait-for-services.sh
  ```

- [ ] Verify data persisted
  - [ ] Documents still listed
  - [ ] Database still has data
  - [ ] Ollama models still available

- [ ] Full restart test

  ```bash
  docker-compose down
  docker-compose up -d
  ./scripts/wait-for-services.sh
  ```

- [ ] Verify everything still works
  - [ ] Frontend accessible
  - [ ] Backend healthy
  - [ ] Data persisted

### 11. Resource Monitoring

- [ ] Check resource usage

  ```bash
  docker stats
  # Note memory and CPU usage
  ```

- [ ] Verify volumes created

  ```bash
  docker volume ls | grep docker-compose
  # Should show: postgres_data, ollama_models, uploads_data
  ```

- [ ] Check volume sizes
  ```bash
  docker system df -v
  # Note sizes of volumes
  ```

### 12. Logs Verification

- [ ] Check all service logs

  ```bash
  docker-compose logs | grep -i error
  # Should have no critical errors
  ```

- [ ] Check individual service logs
  ```bash
  docker-compose logs frontend
  docker-compose logs backend
  docker-compose logs postgres
  docker-compose logs ollama
  docker-compose logs mcp-server
  ```

### 13. CPU-Only Mode Test (Optional)

If testing without GPU:

- [ ] Stop services

  ```bash
  docker-compose down
  ```

- [ ] Start with CPU-only config

  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up -d
  ```

- [ ] Verify Ollama works

  ```bash
  docker exec islamic-finance-ollama ollama list
  curl http://localhost:11434/api/tags
  ```

- [ ] Test chat functionality
  - Send a query
  - Verify response (may be slower)

### 14. Development Mode Test (Optional)

- [ ] Stop production services

  ```bash
  docker-compose down
  ```

- [ ] Start in dev mode

  ```bash
  docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
  ```

- [ ] Verify hot reload works
  - Make a code change
  - Verify service reloads

## Makefile Test

### 15. Test Makefile Commands

- [ ] Test help

  ```bash
  make help
  ```

- [ ] Test build

  ```bash
  make build
  ```

- [ ] Test up

  ```bash
  make up
  ```

- [ ] Test health

  ```bash
  make health
  ```

- [ ] Test logs

  ```bash
  make logs
  # Ctrl+C to exit
  ```

- [ ] Test down
  ```bash
  make down
  ```

## Cleanup

### 16. Full Cleanup Test

- [ ] Stop and remove everything

  ```bash
  make clean
  # Or: docker-compose down -v
  ```

- [ ] Verify all removed

  ```bash
  docker ps -a | grep islamic-finance  # Should be empty
  docker volume ls | grep docker-compose  # Should be empty
  ```

- [ ] Re-deploy from scratch

  ```bash
  make bootstrap
  ```

- [ ] Verify works again
  ```bash
  make health
  curl http://localhost:3001/health
  ```

## Results Summary

### Test Environment

- OS: ******\_\_\_******
- Docker version: ******\_\_\_******
- RAM: ******\_\_\_******
- Disk space: ******\_\_\_******
- GPU: ******\_\_\_******

### Timings

- Bootstrap time: ******\_\_\_******
- Ollama model download: ******\_\_\_******
- First query response: ******\_\_\_******
- Restart time: ******\_\_\_******

### Issues Found

1. ***
2. ***
3. ***

### Success Criteria

- [ ] All services start successfully
- [ ] All health checks pass
- [ ] Frontend accessible and functional
- [ ] Backend API responds correctly
- [ ] Chat functionality works
- [ ] Document upload works
- [ ] Data persists across restarts
- [ ] No critical errors in logs
- [ ] Services can communicate
- [ ] Clean restart works

## Sign-off

- Tester: ******\_\_\_******
- Date: ******\_\_\_******
- Status: [ ] PASS [ ] FAIL
- Notes: ******\_\_\_******

---

**If all checkboxes are checked and success criteria met, deployment is production-ready!**
