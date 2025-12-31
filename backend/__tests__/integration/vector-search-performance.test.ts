import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db/config';
import { documents, documentChunks } from '../../db/schema';
import { DocumentRepository } from '../../repositories/document.repository';
import { ChunkRepository } from '../../repositories/chunk.repository';
import { EmbeddingService } from '../../services/embedding-service';
import { sql } from 'drizzle-orm';

describe('Vector Search Performance Tests', () => {
  let documentRepo: DocumentRepository;
  let chunkRepo: ChunkRepository;
  let embedder: EmbeddingService;
  let testDocumentId: string;

  beforeAll(async () => {
    documentRepo = new DocumentRepository();
    chunkRepo = new ChunkRepository();
    embedder = new EmbeddingService();

    // Clean up before seeding
    await db.delete(documentChunks);
    await db.delete(documents);

    // Seed database with 1000+ chunks for performance testing
    console.log('Seeding database with 1000+ chunks for performance testing...');

    const document = await documentRepo.create({
      title: 'Performance Test Document',
      category: 'principles',
      filePath: '/tmp/perf-test.pdf',
      fileType: 'pdf',
    });

    testDocumentId = document.id;

    // Generate 1000 chunks with varied content
    const batchSize = 100;
    const totalChunks = 1000;

    const sampleTexts = [
      'Islamic finance principles and ethics',
      'Shariah-compliant investment strategies',
      'Prohibition of interest and riba in Islam',
      'Profit and loss sharing mechanisms',
      'Sukuk and Islamic bonds overview',
      'Takaful insurance in Islamic finance',
      'Mudarabah partnership structures',
      'Musharakah joint venture agreements',
      'Ijarah leasing in Islamic banking',
      'Istisna manufacturing contracts',
    ];

    for (let i = 0; i < totalChunks; i += batchSize) {
      const count = Math.min(batchSize, totalChunks - i);
      const texts = Array.from({ length: count }, (_, idx) => {
        const baseText = sampleTexts[idx % sampleTexts.length];
        return `${baseText} - chunk ${i + idx + 1}`;
      });

      const embeddings = await embedder.embedBatch(texts);

      const chunks = texts.map((text, idx) => ({
        documentId: testDocumentId,
        content: text,
        chunkIndex: i + idx,
        embedding: embeddings[idx],
      }));

      await chunkRepo.insertBatch(chunks, 150);

      console.log(`Seeded ${i + count}/${totalChunks} chunks`);
    }

    console.log('Database seeding complete!');
  }, 120000); // 2 minute timeout for seeding 1000 chunks

  afterAll(async () => {
    // Cleanup
    await db.delete(documentChunks);
    await db.delete(documents);
  });

  it('should perform vector search in <500ms for 1000+ chunks', async () => {
    const query = 'Islamic banking principles';
    const queryEmbedding = await embedder.embedSingle(query);

    const startTime = performance.now();

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 10,
      threshold: 0.5,
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Search completed in ${duration.toFixed(2)}ms`);

    // Assert performance requirement: <500ms
    expect(duration).toBeLessThan(500);

    // Verify results are valid
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);

    // Verify similarity scores
    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.5);
    });
  });

  it('should maintain performance with high limit (top-100)', async () => {
    const query = 'Shariah compliant finance';
    const queryEmbedding = await embedder.embedSingle(query);

    const startTime = performance.now();

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 100,
      threshold: 0.3,
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Top-100 search completed in ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(500);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should maintain performance with category filter', async () => {
    const query = 'Islamic investment strategies';
    const queryEmbedding = await embedder.embedSingle(query);

    const startTime = performance.now();

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 10,
      threshold: 0.5,
      filters: {
        category: 'principles',
      },
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Filtered search completed in ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(500);
    expect(results.length).toBeGreaterThan(0);

    // Verify filter worked
    results.forEach((result) => {
      expect(result.metadata.category).toBe('principles');
    });
  });

  it('should perform multiple consecutive searches efficiently', async () => {
    const queries = [
      'Islamic finance principles',
      'Sukuk bonds',
      'Profit sharing',
      'Shariah compliance',
      'Riba prohibition',
    ];

    const durations: number[] = [];

    for (const query of queries) {
      const queryEmbedding = await embedder.embedSingle(query);

      const startTime = performance.now();

      await chunkRepo.vectorSearch(queryEmbedding, {
        limit: 10,
        threshold: 0.5,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      durations.push(duration);
    }

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    console.log(`Average search duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Individual durations: ${durations.map((d) => d.toFixed(2)).join(', ')}ms`);

    // Average should be well under 500ms
    expect(avgDuration).toBeLessThan(500);

    // Each individual search should also be under 500ms
    durations.forEach((duration) => {
      expect(duration).toBeLessThan(500);
    });
  });

  it('should verify HNSW index exists', async () => {
    // Check if HNSW index exists on document_chunks table
    const result = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'document_chunks'
      AND indexname = 'chunks_embedding_idx';
    `);

    console.log('Index info:', JSON.stringify(result, null, 2));

    // Verify index exists
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].indexname).toBe('chunks_embedding_idx');
    expect(result[0].indexdef).toContain('hnsw');
    expect(result[0].indexdef).toContain('embedding');
  });
});
