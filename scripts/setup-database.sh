#!/bin/bash
set -e

echo "🗄️  Setting up database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until docker exec islamic-finance-db pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL to start..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

# Run migrations
echo "🔄 Running database migrations..."
docker exec islamic-finance-backend sh -c "cd /app/backend && node -e \"require('drizzle-orm').migrate\""

echo "✅ Database setup complete"
