#!/bin/bash
set -e

echo "🤖 Initializing Ollama models..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  echo "Waiting for Ollama to start..."
  sleep 2
done

echo "✅ Ollama service is ready"

# Pull required models
OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.1:8b}
OLLAMA_EMBEDDING_MODEL=${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}

echo "📥 Pulling language model: $OLLAMA_MODEL"
docker exec islamic-finance-ollama ollama pull $OLLAMA_MODEL

echo "📥 Pulling embedding model: $OLLAMA_EMBEDDING_MODEL"
docker exec islamic-finance-ollama ollama pull $OLLAMA_EMBEDDING_MODEL

echo "✅ All Ollama models ready"
