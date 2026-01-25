#!/bin/bash
set -e

echo "Starting Ollama server..."
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done
echo "Ollama is ready!"

# Pull the embedding model if not already present
EMBEDDING_MODEL="${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}"
echo "Checking for embedding model: $EMBEDDING_MODEL"

if ! ollama list | grep -q "$EMBEDDING_MODEL"; then
  echo "Pulling embedding model: $EMBEDDING_MODEL"
  ollama pull "$EMBEDDING_MODEL"
  echo "Embedding model pulled successfully!"
else
  echo "Embedding model already present."
fi

echo "Ollama setup complete. Keeping server running..."
# Keep the container running
wait
