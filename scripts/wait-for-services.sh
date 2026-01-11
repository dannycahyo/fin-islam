#!/bin/bash
# Wait for all services to be healthy before proceeding

set -e

MAX_WAIT=300  # 5 minutes
SLEEP_TIME=5

wait_for_service() {
    local service_name=$1
    local health_command=$2
    local elapsed=0

    echo "⏳ Waiting for $service_name..."

    until eval "$health_command" > /dev/null 2>&1; do
        if [ $elapsed -ge $MAX_WAIT ]; then
            echo "❌ Timeout waiting for $service_name"
            return 1
        fi

        echo "  Still waiting... (${elapsed}s / ${MAX_WAIT}s)"
        sleep $SLEEP_TIME
        elapsed=$((elapsed + SLEEP_TIME))
    done

    echo "✅ $service_name is ready"
    return 0
}

echo "🔍 Checking service health..."
echo ""

# PostgreSQL
wait_for_service "PostgreSQL" \
    "docker exec islamic-finance-db pg_isready -U postgres"

# Ollama
wait_for_service "Ollama" \
    "curl -s http://localhost:11434/api/tags"

# Backend
wait_for_service "Backend API" \
    "curl -s http://localhost:3001/health"

# Frontend
wait_for_service "Frontend" \
    "curl -s http://localhost:80/health"

echo ""
echo "✅ All services are healthy!"
