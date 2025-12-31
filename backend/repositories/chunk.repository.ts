import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db/config';
import { documentChunks, documents, type DocumentChunk, type NewDocumentChunk } from '@/db/schema';

export interface SearchOptions {
  limit: number;
  threshold?: number;
  filters?: {
    category?: string;
    documentId?: string;
  };
}

export interface SearchResult {
  id: string;
  content: string;
  documentId: string;
  similarity: number;
  metadata: {
    category: string;
    chunkIndex: number;
  };
}

export class ChunkRepository {
  async insertBatch(chunks: NewDocumentChunk[], batchSize: number = 150): Promise<void> {
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await db.insert(documentChunks).values(batch);
    }
  }

  async findByDocumentId(documentId: string): Promise<DocumentChunk[]> {
    return await db.select().from(documentChunks).where(eq(documentChunks.documentId, documentId));
  }

  async vectorSearch(embedding: number[], options: SearchOptions): Promise<SearchResult[]> {
    const { limit, threshold = 0.7, filters } = options;

    // Format embedding as pgvector-compatible string
    const vectorStr = `[${embedding.join(',')}]`;

    const whereConditions = [];
    if (filters?.documentId) {
      whereConditions.push(eq(documentChunks.documentId, filters.documentId));
    }
    if (filters?.category) {
      whereConditions.push(eq(documents.category, filters.category));
    }
    // Add threshold filter to WHERE clause
    whereConditions.push(
      sql`1 - (${documentChunks.embedding} <=> ${vectorStr}::vector) >= ${threshold}`
    );

    const results = await db
      .select({
        id: documentChunks.id,
        content: documentChunks.content,
        documentId: documentChunks.documentId,
        chunkIndex: documentChunks.chunkIndex,
        category: documents.category,
        similarity: sql<number>`1 - (${documentChunks.embedding} <=> ${vectorStr}::vector)`,
      })
      .from(documentChunks)
      .leftJoin(documents, eq(documentChunks.documentId, documents.id))
      .where(and(...whereConditions))
      .orderBy(sql`1 - (${documentChunks.embedding} <=> ${vectorStr}::vector) DESC`)
      .limit(limit);

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      documentId: r.documentId,
      similarity: r.similarity,
      metadata: {
        category: r.category || '',
        chunkIndex: r.chunkIndex,
      },
    }));
  }

  async delete(id: string): Promise<void> {
    await db.delete(documentChunks).where(eq(documentChunks.id, id));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
  }
}
