#!/bin/bash
set -e

echo "🚀 Bootstrapping Islamic Finance Knowledge Assistant"
echo "===================================================="

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  No .env file found. Creating from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please update with your configuration."
  echo ""
  echo "⚠️  IMPORTANT: Update POSTGRES_PASSWORD in .env before continuing!"
  read -p "Press enter to continue after updating .env..."
fi

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services
./scripts/wait-for-services.sh

# Initialize Ollama models
./scripts/init-ollama.sh

# Setup database
./scripts/setup-database.sh

# Health check
./scripts/health-check.sh

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Access frontend: http://localhost"
echo "  2. Access backend API: http://localhost:3001"
echo "  3. View logs: docker-compose logs -f"
echo "  4. Stop services: docker-compose down"
