#!/bin/bash
set -e

echo "🤖 Initializing Ollama embedding model only..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  echo "Waiting for Ollama to start..."
  sleep 2
done

echo "✅ Ollama service is ready"

# Pull only embedding model (for cloud setup)
OLLAMA_EMBEDDING_MODEL=${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}

echo "📥 Pulling embedding model: $OLLAMA_EMBEDDING_MODEL"
docker exec islamic-finance-ollama ollama pull $OLLAMA_EMBEDDING_MODEL

echo "✅ Embedding model ready"
echo ""
echo "ℹ️  Note: Chat model will use cloud Ollama API"
