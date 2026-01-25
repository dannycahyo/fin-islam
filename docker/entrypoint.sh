#!/bin/sh
set -e

echo "Enabling pgvector extension..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U ${POSTGRES_USER:-finislam} -d ${POSTGRES_DB:-islamic_finance} -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true

echo "Running database migrations..."
cd /app/backend
pnpm db:migrate

echo "Starting backend server..."
exec pnpm exec tsx server.ts
