#!/bin/bash

echo "🏥 Health Check Report"
echo "===================="

# Check PostgreSQL
echo -n "PostgreSQL: "
if docker exec islamic-finance-db pg_isready -U postgres > /dev/null 2>&1; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

# Check Ollama
echo -n "Ollama: "
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

# Check Backend
echo -n "Backend: "
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

# Check Frontend
echo -n "Frontend: "
if curl -s http://localhost:80/health > /dev/null 2>&1; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

echo ""
echo "Docker Compose Status:"
docker-compose ps
