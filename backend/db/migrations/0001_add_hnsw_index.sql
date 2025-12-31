-- Create HNSW index for vector similarity search
-- Default parameters: m=16, ef_construction=64
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
