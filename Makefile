.PHONY: help build up down restart logs health clean bootstrap init-ollama setup-db

# Default target
help:
	@echo "Islamic Finance Knowledge Assistant - Docker Commands"
	@echo ""
	@echo "Quick Start:"
	@echo "  make bootstrap    - Complete setup (recommended for first time)"
	@echo ""
	@echo "Service Management:"
	@echo "  make build        - Build all Docker images"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View logs (all services)"
	@echo "  make health       - Run health checks"
	@echo ""
	@echo "Initialization:"
	@echo "  make init-ollama  - Pull Ollama models"
	@echo "  make setup-db     - Setup database & migrations"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Stop services & remove volumes (⚠️  deletes data)"
	@echo "  make clean-soft   - Stop services (keep volumes)"
	@echo ""
	@echo "Alternative modes:"
	@echo "  make up-cpu       - Start without GPU support"
	@echo "  make up-cloud     - Start with cloud Ollama (no local LLM)"
	@echo ""
	@echo "Cloud Ollama:"
	@echo "  make bootstrap-cloud - Complete setup with cloud Ollama"

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Start without GPU
up-cpu:
	docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up -d

# Start with cloud Ollama
up-cloud:
	docker-compose -f docker-compose.yml -f docker-compose.cloud.yml up -d

# Stop all services (keep volumes)
down:
	docker-compose down

# Stop and remove volumes
clean:
	docker-compose down -v

# Stop services but keep volumes
clean-soft:
	docker-compose down

# Restart all services
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs -f

# View specific service logs
logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f postgres

logs-ollama:
	docker-compose logs -f ollama

# Health checks
health:
	@./scripts/health-check.sh

# Initialize Ollama models
init-ollama:
	@./scripts/init-ollama.sh

# Setup database
setup-db:
	@./scripts/setup-database.sh

# Complete bootstrap
bootstrap:
	@./scripts/bootstrap.sh

# Bootstrap with cloud Ollama
bootstrap-cloud:
	@if [ ! -f .env ]; then \
		echo "⚠️  Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo ""; \
		echo "⚠️  IMPORTANT: Update .env with cloud Ollama settings:"; \
		echo "  - OLLAMA_CLOUD_URL (e.g., https://api.ollama.ai)"; \
		echo "  - OLLAMA_CLOUD_API_KEY (your cloud API key)"; \
		echo "  - POSTGRES_PASSWORD (secure password)"; \
		echo ""; \
		echo "See CLOUD_OLLAMA.md for details."; \
		read -p "Press enter after updating .env..."; \
	fi
	@echo "🚀 Starting services with cloud Ollama..."
	@make up-cloud
	@./scripts/wait-for-services.sh
	@echo "📥 Pulling embedding model (local)..."
	@./scripts/init-ollama-embeddings.sh
	@./scripts/setup-database.sh
	@./scripts/health-check.sh
	@echo ""
	@echo "✅ Cloud Ollama setup complete!"
	@echo ""
	@echo "📝 Configuration:"
	@echo "  - Chat model: Cloud Ollama API"
	@echo "  - Embeddings: Local Ollama (nomic-embed-text)"
	@echo ""
	@echo "📝 Access:"
	@echo "  1. Frontend: http://localhost"
	@echo "  2. Backend: http://localhost:3001"
	@echo "  3. Check logs: make logs"
	@echo "  4. See CLOUD_OLLAMA.md for details"

# Database operations
db-backup:
	docker exec islamic-finance-db pg_dump -U postgres islamic_finance > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backup created: backup_$(shell date +%Y%m%d_%H%M%S).sql"

db-shell:
	docker exec -it islamic-finance-db psql -U postgres -d islamic_finance

# Ollama operations
ollama-list:
	docker exec islamic-finance-ollama ollama list

ollama-pull:
	docker exec islamic-finance-ollama ollama pull $(MODEL)

# Container shell access
shell-backend:
	docker exec -it islamic-finance-backend sh

shell-frontend:
	docker exec -it islamic-finance-frontend sh

# Development
dev:
	docker-compose up

# Production build and deploy
prod: build up init-ollama setup-db health
	@echo "✅ Production deployment complete"

# Status check
status:
	@docker-compose ps
