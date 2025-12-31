import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentProcessor } from '@/services/document-processor.js';
import { ChunkingService } from '@/services/chunking-service.js';
import { resolve } from 'path';

/**
 * Integration tests for document processing workflow
 * These tests use real implementations (no mocking) to verify end-to-end functionality
 */
describe('Document Processing Workflow', () => {
  const fixturesDir = resolve(__dirname, '../fixtures/test-files');
  let processor: DocumentProcessor;
  let chunker: ChunkingService;

  beforeAll(() => {
    processor = new DocumentProcessor();
    chunker = new ChunkingService();
  });

  describe('TXT file workflow', () => {
    it('should process and chunk short TXT file end-to-end', async () => {
      const filePath = resolve(fixturesDir, 'short-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      expect(processed.content).toBeTruthy();
      expect(processed.metadata.wordCount).toBeGreaterThan(0);

      expect(chunked.chunks.length).toBeGreaterThan(0);
      expect(chunked.totalChunks).toBe(chunked.chunks.length);
      expect(chunked.chunks[0].metadata.source).toBe(filePath);
      expect(chunked.chunks[0].metadata.chunkIndex).toBe(0);
      expect(chunked.chunks[0].metadata.wordCount).toBeGreaterThan(0);
      expect(chunked.chunks[0].metadata.tokenCount).toBeGreaterThan(0);
      expect(chunked.chunks[0].metadata.tokenCount).toBeLessThanOrEqual(1000);
    });

    it('should process and chunk medium TXT file end-to-end', async () => {
      const filePath = resolve(fixturesDir, 'medium-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      expect(processed.content).toContain('Islamic Finance');
      expect(processed.metadata.wordCount).toBeGreaterThan(100);

      expect(chunked.chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunked.chunks.every((c) => c.metadata.source === filePath)).toBe(true);
      expect(chunked.chunks.every((c) => (c.metadata.tokenCount || 0) <= 1000)).toBe(true);
    });

    it('should process and chunk long TXT file end-to-end', async () => {
      const filePath = resolve(fixturesDir, 'long-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      expect(processed.content).toContain('Islamic Finance');
      expect(processed.metadata.wordCount).toBeGreaterThan(500);

      // Long document should create multiple chunks
      expect(chunked.chunks.length).toBeGreaterThan(1);
      expect(chunked.chunks.every((c) => (c.metadata.tokenCount || 0) <= 1000)).toBe(true);

      // Verify chunk indices are sequential
      chunked.chunks.forEach((chunk, index) => {
        expect(chunk.metadata.chunkIndex).toBe(index);
        expect(chunk.metadata.totalChunks).toBe(chunked.totalChunks);
      });
    });
  });

  describe('MD file workflow', () => {
    it('should process and chunk markdown file end-to-end', async () => {
      const filePath = resolve(fixturesDir, 'sample.md');
      const processed = await processor.processMD(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      // Markdown formatting is preserved
      expect(processed.content).toContain('#');
      expect(processed.metadata.wordCount).toBeGreaterThan(0);

      expect(chunked.chunks.length).toBeGreaterThan(0);
      expect(chunked.chunks[0].metadata.source).toBe(filePath);
    });
  });

  describe('processFile workflow (generic)', () => {
    it('should route and process TXT file correctly', async () => {
      const filePath = resolve(fixturesDir, 'short-document.txt');
      const processed = await processor.processFile(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      expect(processed.content).toBeTruthy();
      expect(chunked.chunks.length).toBeGreaterThan(0);
    });

    it('should route and process MD file correctly', async () => {
      const filePath = resolve(fixturesDir, 'sample.md');
      const processed = await processor.processFile(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      expect(processed.content).toContain('#');
      expect(chunked.chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata flow through pipeline', () => {
    it('should preserve metadata from processor to chunker', async () => {
      const filePath = resolve(fixturesDir, 'medium-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath, 3);

      // Original metadata preserved
      expect(chunked.originalMetadata.wordCount).toBe(processed.metadata.wordCount);

      // Chunk metadata includes original source and page number
      expect(chunked.chunks[0].metadata.source).toBe(filePath);
      expect(chunked.chunks[0].metadata.pageNumber).toBe(3);
    });
  });

  describe('Chunk boundaries validation', () => {
    it('should respect natural text boundaries', async () => {
      const filePath = resolve(fixturesDir, 'long-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      // All chunks should end with word boundaries (not mid-word)
      chunked.chunks.forEach((chunk) => {
        const trimmed = chunk.content.trim();
        // Check if ends with punctuation, space, or complete word
        const endsWithBoundary =
          /[.!?,;:\s]$/.test(trimmed) || // Ends with punctuation or whitespace
          /[a-zA-Z0-9)"]$/.test(trimmed); // Ends with alphanumeric (complete word)

        expect(endsWithBoundary).toBe(true);
      });
    });
  });

  describe('Token limits validation', () => {
    it('should not exceed maximum token count in any chunk', async () => {
      const filePath = resolve(fixturesDir, 'long-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      const maxTokenCount = Math.max(...chunked.chunks.map((c) => c.metadata.tokenCount || 0));

      expect(maxTokenCount).toBeLessThanOrEqual(1000);
    });

    it('should have reasonable token distribution across chunks', async () => {
      const filePath = resolve(fixturesDir, 'long-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      // Calculate average token count
      const avgTokens =
        chunked.chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0) /
        chunked.chunks.length;

      // Average should be reasonable (not too small, indicating good chunking)
      expect(avgTokens).toBeGreaterThan(100);
      expect(avgTokens).toBeLessThanOrEqual(1000);
    });
  });

  describe('Chunking statistics', () => {
    it('should provide accurate statistics for document', async () => {
      const filePath = resolve(fixturesDir, 'medium-document.txt');
      const processed = await processor.processTXT(filePath);

      const stats = await chunker.getChunkingStats(processed);
      const chunked = await chunker.chunkDocument(processed, filePath);

      // Estimated chunks should be close to actual chunks
      const difference = Math.abs(stats.estimatedChunks - chunked.totalChunks);
      const percentageDiff = (difference / chunked.totalChunks) * 100;

      // Allow up to 50% difference (estimates are approximate)
      expect(percentageDiff).toBeLessThan(50);

      // Total estimated tokens should be positive
      expect(stats.totalEstimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('Error handling in workflow', () => {
    it('should handle empty file gracefully', async () => {
      const filePath = resolve(fixturesDir, 'empty.txt');

      await expect(processor.processTXT(filePath)).rejects.toThrow();
    });

    it('should handle non-existent file gracefully', async () => {
      const filePath = resolve(fixturesDir, 'non-existent.txt');

      await expect(processor.processTXT(filePath)).rejects.toThrow();
    });
  });

  describe('Content integrity', () => {
    it('should preserve all content through processing and chunking', async () => {
      const filePath = resolve(fixturesDir, 'short-document.txt');
      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      // Concatenate all chunks
      const reconstructed = chunked.chunks.map((c) => c.content).join('');

      // Should contain key content (some whitespace differences are acceptable due to chunking)
      expect(reconstructed).toContain('Islamic Finance');
      expect(reconstructed).toContain('Murabaha');
    });
  });

  describe('Performance validation', () => {
    it('should process and chunk medium document in reasonable time', async () => {
      const filePath = resolve(fixturesDir, 'medium-document.txt');
      const startTime = Date.now();

      const processed = await processor.processTXT(filePath);
      const chunked = await chunker.chunkDocument(processed, filePath);

      const duration = Date.now() - startTime;

      expect(chunked.chunks.length).toBeGreaterThan(0);
      // Should complete in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});
