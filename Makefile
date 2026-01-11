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
	@echo "CPU-only systems:"
	@echo "  make up-cpu       - Start without GPU support"

# Build all images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Start without GPU
up-cpu:
	docker-compose -f docker-compose.yml -f docker-compose.cpu.yml up -d

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
