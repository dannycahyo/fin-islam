import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChunkingService, ChunkingServiceError } from '@/services/chunking-service.js';
import { ProcessedDocument } from '@/services/document-processor.js';

// Mock the RecursiveCharacterTextSplitter
vi.mock('langchain/text_splitter', () => {
  return {
    RecursiveCharacterTextSplitter: class MockTextSplitter {
      splitText = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      constructor(_config: any) {
        // Store config if needed for testing
      }
    },
  };
});

describe('ChunkingService', () => {
  let service: ChunkingService;
  let mockSplitText: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    service = new ChunkingService();
    // Get reference to the splitText mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSplitText = (service as any).textSplitter.splitText;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('chunkDocument', () => {
    it('should chunk document into multiple pieces', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'This is a test document with enough content to be split into chunks.',
        metadata: {
          wordCount: 12,
        },
      };

      mockSplitText.mockResolvedValue([
        'This is a test document',
        'with enough content',
        'to be split into chunks.',
      ]);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks).toHaveLength(3);
      expect(result.totalChunks).toBe(3);
      expect(result.chunks[0].content).toBe('This is a test document');
      expect(result.chunks[1].content).toBe('with enough content');
      expect(result.chunks[2].content).toBe('to be split into chunks.');
      expect(mockSplitText).toHaveBeenCalledWith(processedDoc.content);
    });

    it('should throw error for empty content', async () => {
      const processedDoc: ProcessedDocument = {
        content: '',
        metadata: {
          wordCount: 0,
        },
      };

      await expect(service.chunkDocument(processedDoc, '/path/to/empty.txt')).rejects.toThrow(
        ChunkingServiceError
      );

      await expect(service.chunkDocument(processedDoc, '/path/to/empty.txt')).rejects.toMatchObject(
        {
          code: 'EMPTY_CONTENT',
        }
      );
    });

    it('should throw error for whitespace-only content', async () => {
      const processedDoc: ProcessedDocument = {
        content: '   \n\n   ',
        metadata: {
          wordCount: 0,
        },
      };

      await expect(service.chunkDocument(processedDoc, '/path/to/whitespace.txt')).rejects.toThrow(
        ChunkingServiceError
      );
    });

    it('should validate chunk size does not exceed max token count', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test content',
        metadata: {
          wordCount: 2,
        },
      };

      // Create a very large chunk (> 1000 tokens = 4000 chars)
      const largeChunk = 'a'.repeat(4100);
      mockSplitText.mockResolvedValue([largeChunk]);

      await expect(service.chunkDocument(processedDoc, '/path/to/test.txt')).rejects.toThrow(
        ChunkingServiceError
      );

      await expect(service.chunkDocument(processedDoc, '/path/to/test.txt')).rejects.toMatchObject({
        code: 'CHUNK_TOO_LARGE',
      });
    });

    it('should add correct metadata to all chunks', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test document content for chunking.',
        metadata: {
          wordCount: 5,
        },
      };

      mockSplitText.mockResolvedValue(['Test document', 'content for', 'chunking.']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt', 5);

      expect(result.chunks).toHaveLength(3);

      // Check first chunk
      expect(result.chunks[0].metadata).toMatchObject({
        source: '/path/to/test.txt',
        pageNumber: 5,
        chunkIndex: 0,
        totalChunks: 3,
      });

      // Check second chunk
      expect(result.chunks[1].metadata).toMatchObject({
        source: '/path/to/test.txt',
        pageNumber: 5,
        chunkIndex: 1,
        totalChunks: 3,
      });

      // Check third chunk
      expect(result.chunks[2].metadata).toMatchObject({
        source: '/path/to/test.txt',
        pageNumber: 5,
        chunkIndex: 2,
        totalChunks: 3,
      });
    });

    it('should calculate word count for each chunk', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test content',
        metadata: {
          wordCount: 2,
        },
      };

      mockSplitText.mockResolvedValue(['One two three', 'Four five', 'Six']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks[0].metadata.wordCount).toBe(3);
      expect(result.chunks[1].metadata.wordCount).toBe(2);
      expect(result.chunks[2].metadata.wordCount).toBe(1);
    });

    it('should estimate token count for each chunk', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test content',
        metadata: {
          wordCount: 2,
        },
      };

      // Each chunk ~12 chars = ~3 tokens
      mockSplitText.mockResolvedValue(['Test content', 'More content', 'Last content']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      result.chunks.forEach((chunk) => {
        expect(chunk.metadata.tokenCount).toBeDefined();
        expect(chunk.metadata.tokenCount).toBeGreaterThan(0);
        // Each chunk ~12 chars = ~3 tokens (4 chars/token)
        expect(chunk.metadata.tokenCount).toBe(3);
      });
    });

    it('should handle page number parameter correctly', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test',
        metadata: {
          wordCount: 1,
        },
      };

      mockSplitText.mockResolvedValue(['Test']);

      // With page number
      const resultWithPage = await service.chunkDocument(processedDoc, '/path/to/test.txt', 10);
      expect(resultWithPage.chunks[0].metadata.pageNumber).toBe(10);

      // Without page number
      const resultWithoutPage = await service.chunkDocument(processedDoc, '/path/to/test.txt');
      expect(resultWithoutPage.chunks[0].metadata.pageNumber).toBeUndefined();
    });

    it('should preserve original metadata', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test',
        metadata: {
          pageCount: 5,
          wordCount: 100,
        },
      };

      mockSplitText.mockResolvedValue(['Test']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.originalMetadata).toEqual({
        pageCount: 5,
        wordCount: 100,
      });
    });

    it('should handle single chunk documents', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Short content',
        metadata: {
          wordCount: 2,
        },
      };

      mockSplitText.mockResolvedValue(['Short content']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks).toHaveLength(1);
      expect(result.totalChunks).toBe(1);
      expect(result.chunks[0].metadata.chunkIndex).toBe(0);
      expect(result.chunks[0].metadata.totalChunks).toBe(1);
    });

    it('should handle text splitter errors', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test content',
        metadata: {
          wordCount: 2,
        },
      };

      mockSplitText.mockRejectedValue(new Error('Splitter error'));

      await expect(service.chunkDocument(processedDoc, '/path/to/test.txt')).rejects.toThrow(
        ChunkingServiceError
      );

      await expect(service.chunkDocument(processedDoc, '/path/to/test.txt')).rejects.toMatchObject({
        code: 'CHUNKING_ERROR',
      });
    });
  });

  describe('getChunkingStats', () => {
    it('should calculate correct statistics for short document', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'A'.repeat(100), // 100 chars = ~25 tokens
        metadata: {
          wordCount: 1,
        },
      };

      const stats = await service.getChunkingStats(processedDoc);

      expect(stats.totalEstimatedTokens).toBe(25);
      expect(stats.estimatedTokensPerChunk).toBe(800);
      expect(stats.estimatedChunks).toBe(1);
    });

    it('should calculate correct statistics for medium document', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'A'.repeat(3200), // 3200 chars = ~800 tokens
        metadata: {
          wordCount: 1,
        },
      };

      const stats = await service.getChunkingStats(processedDoc);

      expect(stats.totalEstimatedTokens).toBe(800);
      expect(stats.estimatedTokensPerChunk).toBe(800);
      // With overlap of 100, effective chunk size is 700
      // 800 / 700 = ~2 chunks
      expect(stats.estimatedChunks).toBeGreaterThanOrEqual(1);
    });

    it('should calculate correct statistics for large document', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'A'.repeat(32000), // 32000 chars = ~8000 tokens
        metadata: {
          wordCount: 1,
        },
      };

      const stats = await service.getChunkingStats(processedDoc);

      expect(stats.totalEstimatedTokens).toBe(8000);
      expect(stats.estimatedTokensPerChunk).toBe(800);
      // With overlap of 100, effective chunk size is 700
      // 8000 / 700 = ~12 chunks
      expect(stats.estimatedChunks).toBeGreaterThanOrEqual(10);
      expect(stats.estimatedChunks).toBeLessThanOrEqual(15);
    });

    it('should handle empty content', async () => {
      const processedDoc: ProcessedDocument = {
        content: '',
        metadata: {
          wordCount: 0,
        },
      };

      const stats = await service.getChunkingStats(processedDoc);

      expect(stats.totalEstimatedTokens).toBe(0);
      expect(stats.estimatedChunks).toBe(0);
    });
  });

  describe('Token and word counting', () => {
    it('should count words correctly', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test',
        metadata: {
          wordCount: 1,
        },
      };

      mockSplitText.mockResolvedValue(['one two three', 'four five six seven', 'eight']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks[0].metadata.wordCount).toBe(3);
      expect(result.chunks[1].metadata.wordCount).toBe(4);
      expect(result.chunks[2].metadata.wordCount).toBe(1);
    });

    it('should handle multiple spaces in word count', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test',
        metadata: {
          wordCount: 1,
        },
      };

      mockSplitText.mockResolvedValue(['one   two    three']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks[0].metadata.wordCount).toBe(3);
    });

    it('should estimate tokens based on character count', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test',
        metadata: {
          wordCount: 1,
        },
      };

      // 20 chars = 5 tokens (4 chars per token)
      mockSplitText.mockResolvedValue(['A'.repeat(20)]);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks[0].metadata.tokenCount).toBe(5);
    });

    it('should round up token estimates', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test',
        metadata: {
          wordCount: 1,
        },
      };

      // 19 chars = 4.75 tokens -> should round up to 5
      mockSplitText.mockResolvedValue(['A'.repeat(19)]);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks[0].metadata.tokenCount).toBe(5);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long single word', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'A'.repeat(500),
        metadata: {
          wordCount: 1,
        },
      };

      mockSplitText.mockResolvedValue(['A'.repeat(500)]);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].metadata.wordCount).toBe(1);
    });

    it('should handle special characters in content', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Test @#$% content!',
        metadata: {
          wordCount: 3,
        },
      };

      mockSplitText.mockResolvedValue(['Test @#$%', 'content!']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0].content).toBe('Test @#$%');
      expect(result.chunks[1].content).toBe('content!');
    });

    it('should handle newlines in chunks', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'Line 1\nLine 2\nLine 3',
        metadata: {
          wordCount: 6,
        },
      };

      mockSplitText.mockResolvedValue(['Line 1\nLine 2', 'Line 3']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks[0].content).toContain('\n');
      expect(result.chunks[0].metadata.wordCount).toBe(4);
    });

    it('should handle unicode characters', async () => {
      const processedDoc: ProcessedDocument = {
        content: 'مالية إسلامية Islamic Finance',
        metadata: {
          wordCount: 4,
        },
      };

      mockSplitText.mockResolvedValue(['مالية إسلامية', 'Islamic Finance']);

      const result = await service.chunkDocument(processedDoc, '/path/to/test.txt');

      expect(result.chunks[0].content).toBe('مالية إسلامية');
      expect(result.chunks[1].content).toBe('Islamic Finance');
    });
  });
});
