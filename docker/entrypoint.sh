#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/backend
pnpm db:migrate

echo "Starting backend server..."
exec node dist/server.js
