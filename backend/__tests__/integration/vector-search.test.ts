import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/db/config';
import { documents, documentChunks } from '@/db/schema';
import { DocumentRepository } from '@/repositories/document.repository';
import { ChunkRepository } from '@/repositories/chunk.repository';
import { EmbeddingService } from '@/services/embedding-service';

describe('Vector Search Integration Tests', () => {
  let documentRepo: DocumentRepository;
  let chunkRepo: ChunkRepository;
  let embedder: EmbeddingService;
  let testDocumentId: string;

  beforeAll(async () => {
    documentRepo = new DocumentRepository();
    chunkRepo = new ChunkRepository();
    embedder = new EmbeddingService();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(documentChunks);
    await db.delete(documents);
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete(documentChunks);
    await db.delete(documents);
  });

  it('should insert chunks with embeddings in batches', async () => {
    // Create test document
    const document = await documentRepo.create({
      title: 'Test Document',
      category: 'principles',
      filePath: '/tmp/test.pdf',
      fileType: 'pdf',
    });

    testDocumentId = document.id;

    // Generate test chunks with embeddings
    const texts = [
      'Islamic finance prohibits interest (riba)',
      'Sukuk are Islamic bonds',
      'Profit and loss sharing is fundamental',
    ];

    const embeddings = await embedder.embedBatch(texts);

    const chunks = texts.map((text, index) => ({
      documentId: testDocumentId,
      content: text,
      chunkIndex: index,
      embedding: embeddings[index],
    }));

    // Insert chunks in batch
    await chunkRepo.insertBatch(chunks, 150);

    // Verify insertion
    const inserted = await chunkRepo.findByDocumentId(testDocumentId);
    expect(inserted).toHaveLength(3);
    expect(inserted[0].embedding).toBeDefined();
  });

  it('should return top-k similar chunks ordered by similarity', async () => {
    // Create document and chunks
    const document = await documentRepo.create({
      title: 'Finance Principles',
      category: 'principles',
      filePath: '/tmp/finance.pdf',
      fileType: 'pdf',
    });

    const texts = [
      'Islamic finance prohibits interest',
      'Sukuk are Islamic financial instruments',
      'Weather forecast shows sunny skies',
      'Profit sharing in Islamic banking',
    ];

    const embeddings = await embedder.embedBatch(texts);

    const chunks = texts.map((text, index) => ({
      documentId: document.id,
      content: text,
      chunkIndex: index,
      embedding: embeddings[index],
    }));

    await chunkRepo.insertBatch(chunks);

    // Search for finance-related query
    const query = 'Islamic banking principles';
    const queryEmbedding = await embedder.embedSingle(query);

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 3,
      threshold: 0.5,
    });

    // Should return finance-related chunks, not weather
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);

    // Check similarity scores are in descending order
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }

    // Verify finance-related chunks are returned
    const financeChunks = results.filter((r) => r.content.toLowerCase().includes('islamic'));

    expect(financeChunks.length).toBeGreaterThan(0);
  });

  it('should filter results by similarity threshold', async () => {
    const document = await documentRepo.create({
      title: 'Test Doc',
      category: 'general',
      filePath: '/tmp/test.pdf',
      fileType: 'pdf',
    });

    const texts = ['Islamic finance', 'Completely unrelated random text xyz'];

    const embeddings = await embedder.embedBatch(texts);

    const chunks = texts.map((text, index) => ({
      documentId: document.id,
      content: text,
      chunkIndex: index,
      embedding: embeddings[index],
    }));

    await chunkRepo.insertBatch(chunks);

    // Search with high threshold
    const query = 'Islamic banking';
    const queryEmbedding = await embedder.embedSingle(query);

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 10,
      threshold: 0.7, // High threshold
    });

    // Should only return chunks above threshold
    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.7);
    });
  });

  it('should filter by category', async () => {
    // Create documents in different categories
    const doc1 = await documentRepo.create({
      title: 'Principles Doc',
      category: 'principles',
      filePath: '/tmp/principles.pdf',
      fileType: 'pdf',
    });

    const doc2 = await documentRepo.create({
      title: 'Products Doc',
      category: 'products',
      filePath: '/tmp/products.pdf',
      fileType: 'pdf',
    });

    const text = 'Islamic finance concepts';
    const embedding = await embedder.embedSingle(text);

    await chunkRepo.insertBatch([
      {
        documentId: doc1.id,
        content: text,
        chunkIndex: 0,
        embedding,
      },
      {
        documentId: doc2.id,
        content: text,
        chunkIndex: 0,
        embedding,
      },
    ]);

    // Search with category filter
    const queryEmbedding = await embedder.embedSingle(text);

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 10,
      threshold: 0.5,
      filters: {
        category: 'principles',
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0].metadata.category).toBe('principles');
  });

  it('should filter by documentId', async () => {
    const doc1 = await documentRepo.create({
      title: 'Doc 1',
      category: 'general',
      filePath: '/tmp/doc1.pdf',
      fileType: 'pdf',
    });

    const doc2 = await documentRepo.create({
      title: 'Doc 2',
      category: 'general',
      filePath: '/tmp/doc2.pdf',
      fileType: 'pdf',
    });

    const text = 'Test content';
    const embedding = await embedder.embedSingle(text);

    await chunkRepo.insertBatch([
      {
        documentId: doc1.id,
        content: text,
        chunkIndex: 0,
        embedding,
      },
      {
        documentId: doc2.id,
        content: text,
        chunkIndex: 0,
        embedding,
      },
    ]);

    // Search filtered by document
    const queryEmbedding = await embedder.embedSingle(text);

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 10,
      threshold: 0.5,
      filters: {
        documentId: doc1.id,
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe(doc1.id);
  });

  it('should handle combined filters (category + threshold)', async () => {
    const doc = await documentRepo.create({
      title: 'Principles',
      category: 'principles',
      filePath: '/tmp/test.pdf',
      fileType: 'pdf',
    });

    const texts = ['Islamic finance', 'Random unrelated text'];
    const embeddings = await embedder.embedBatch(texts);

    await chunkRepo.insertBatch(
      texts.map((text, index) => ({
        documentId: doc.id,
        content: text,
        chunkIndex: index,
        embedding: embeddings[index],
      }))
    );

    const query = 'Islamic banking';
    const queryEmbedding = await embedder.embedSingle(query);

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 10,
      threshold: 0.6,
      filters: {
        category: 'principles',
      },
    });

    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.6);
      expect(result.metadata.category).toBe('principles');
    });
  });

  it('should handle empty results', async () => {
    const query = 'Non-existent content xyz123';
    const queryEmbedding = await embedder.embedSingle(query);

    const results = await chunkRepo.vectorSearch(queryEmbedding, {
      limit: 10,
      threshold: 0.99, // Very high threshold
    });

    expect(results).toHaveLength(0);
  });
});
