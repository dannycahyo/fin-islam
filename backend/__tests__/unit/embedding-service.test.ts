import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingService, EmbeddingServiceError } from '@/services/embedding-service.js';

// Mock the OllamaEmbeddings client
vi.mock('@langchain/ollama', () => {
  return {
    OllamaEmbeddings: class MockOllamaEmbeddings {
      embedQuery = vi.fn();
      embedDocuments = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      constructor(_config: any) {
        // Store config if needed for testing
      }
    },
  };
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockEmbedQuery: ReturnType<typeof vi.fn>;
  let mockEmbedDocuments: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new EmbeddingService();
    // Get references to the mocked methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEmbedQuery = (service as any).client.embedQuery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEmbedDocuments = (service as any).client.embedDocuments;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultService = new EmbeddingService();
      expect(defaultService).toBeInstanceOf(EmbeddingService);
    });

    it('should initialize with custom config', () => {
      const customService = new EmbeddingService({
        baseUrl: 'http://custom:11434',
        model: 'custom-model',
        maxRetries: 5,
        batchSize: 20,
      });
      expect(customService).toBeInstanceOf(EmbeddingService);
    });

    it('should use environment variables when available', () => {
      process.env.OLLAMA_BASE_URL = 'http://env-url:11434';
      process.env.OLLAMA_EMBEDDING_MODEL = 'env-model';

      const envService = new EmbeddingService();
      expect(envService).toBeInstanceOf(EmbeddingService);

      delete process.env.OLLAMA_BASE_URL;
      delete process.env.OLLAMA_EMBEDDING_MODEL;
    });
  });

  describe('embedSingle', () => {
    it('should generate embedding for valid text', async () => {
      const mockEmbedding = new Array(768).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockEmbedding);

      const result = await service.embedSingle('Test text');

      expect(result).toEqual(mockEmbedding);
      expect(result).toHaveLength(768);
      expect(mockEmbedQuery).toHaveBeenCalledWith('Test text');
      expect(mockEmbedQuery).toHaveBeenCalledTimes(1);
    });

    it('should throw error for empty text', async () => {
      await expect(service.embedSingle('')).rejects.toThrow(EmbeddingServiceError);
      await expect(service.embedSingle('')).rejects.toMatchObject({
        code: 'EMPTY_TEXT',
      });
      expect(mockEmbedQuery).not.toHaveBeenCalled();
    });

    it('should throw error for whitespace-only text', async () => {
      await expect(service.embedSingle('   \n\n   ')).rejects.toThrow(EmbeddingServiceError);
      await expect(service.embedSingle('   \n\n   ')).rejects.toMatchObject({
        code: 'EMPTY_TEXT',
      });
    });

    it('should throw error for invalid embedding dimensions', async () => {
      const invalidEmbedding = new Array(512).fill(0.1); // Wrong dimension
      mockEmbedQuery.mockResolvedValue(invalidEmbedding);

      await expect(service.embedSingle('Test text')).rejects.toThrow(EmbeddingServiceError);
      await expect(service.embedSingle('Test text')).rejects.toMatchObject({
        code: 'INVALID_DIMENSIONS',
      });
    });

    it('should retry on connection errors', async () => {
      const mockEmbedding = new Array(768).fill(0.1);

      // Fail twice, then succeed
      mockEmbedQuery
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockEmbedding);

      const result = await service.embedSingle('Test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbedQuery).toHaveBeenCalledTimes(3);
    });

    it('should retry on timeout errors', async () => {
      const mockEmbedding = new Array(768).fill(0.1);

      mockEmbedQuery
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce(mockEmbedding);

      const result = await service.embedSingle('Test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbedQuery).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limit errors', async () => {
      const mockEmbedding = new Array(768).fill(0.1);

      mockEmbedQuery
        .mockRejectedValueOnce(new Error('429 rate limit exceeded'))
        .mockResolvedValueOnce(mockEmbedding);

      const result = await service.embedSingle('Test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbedQuery).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on connection errors', async () => {
      mockEmbedQuery.mockRejectedValue(new Error('ECONNREFUSED'));

      try {
        await service.embedSingle('Test text');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmbeddingServiceError);
        expect(error).toMatchObject({
          code: 'CONNECTION_FAILED',
        });
      }

      // Should retry 3 times total
      expect(mockEmbedQuery).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      mockEmbedQuery.mockRejectedValue(new Error('Invalid API key'));

      await expect(service.embedSingle('Test text')).rejects.toThrow(EmbeddingServiceError);

      // Should only try once for non-retryable errors
      expect(mockEmbedQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle long text', async () => {
      const longText = 'A'.repeat(5000);
      const mockEmbedding = new Array(768).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockEmbedding);

      const result = await service.embedSingle(longText);

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbedQuery).toHaveBeenCalledWith(longText);
    });

    it('should handle special characters', async () => {
      const specialText = 'مالية إسلامية @#$% & Islamic Finance!';
      const mockEmbedding = new Array(768).fill(0.1);
      mockEmbedQuery.mockResolvedValue(mockEmbedding);

      const result = await service.embedSingle(specialText);

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbedQuery).toHaveBeenCalledWith(specialText);
    });
  });

  describe('embedBatch', () => {
    it('should generate embeddings for batch of texts', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const mockEmbeddings = [
        new Array(768).fill(0.1),
        new Array(768).fill(0.2),
        new Array(768).fill(0.3),
      ];
      mockEmbedDocuments.mockResolvedValue(mockEmbeddings);

      const result = await service.embedBatch(texts);

      expect(result).toEqual(mockEmbeddings);
      expect(result).toHaveLength(3);
      expect(mockEmbedDocuments).toHaveBeenCalledWith(texts);
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(1);
    });

    it('should process in batches of 10', async () => {
      const texts = Array.from({ length: 25 }, (_, i) => `Text ${i + 1}`);
      const mockEmbedding = new Array(768).fill(0.1);

      mockEmbedDocuments.mockImplementation((batch: string[]) => {
        return Promise.resolve(batch.map(() => mockEmbedding));
      });

      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(25);
      // Should be called 3 times: 10 + 10 + 5
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(3);
      expect(mockEmbedDocuments).toHaveBeenNthCalledWith(1, texts.slice(0, 10));
      expect(mockEmbedDocuments).toHaveBeenNthCalledWith(2, texts.slice(10, 20));
      expect(mockEmbedDocuments).toHaveBeenNthCalledWith(3, texts.slice(20, 25));
    });

    it('should handle single text in batch', async () => {
      const texts = ['Single text'];
      const mockEmbeddings = [new Array(768).fill(0.1)];
      mockEmbedDocuments.mockResolvedValue(mockEmbeddings);

      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(1);
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(1);
    });

    it('should throw error for empty array', async () => {
      await expect(service.embedBatch([])).rejects.toThrow(EmbeddingServiceError);
      await expect(service.embedBatch([])).rejects.toMatchObject({
        code: 'EMPTY_ARRAY',
      });
      expect(mockEmbedDocuments).not.toHaveBeenCalled();
    });

    it('should throw error if any text is empty', async () => {
      const texts = ['Valid text', '', 'Another text'];

      await expect(service.embedBatch(texts)).rejects.toThrow(EmbeddingServiceError);
      await expect(service.embedBatch(texts)).rejects.toMatchObject({
        code: 'EMPTY_TEXT',
      });
      expect(mockEmbedDocuments).not.toHaveBeenCalled();
    });

    it('should throw error if any text is whitespace-only', async () => {
      const texts = ['Valid text', '   \n   ', 'Another text'];

      await expect(service.embedBatch(texts)).rejects.toThrow(EmbeddingServiceError);
      expect(mockEmbedDocuments).not.toHaveBeenCalled();
    });

    it('should throw error for invalid embedding dimensions in batch', async () => {
      const texts = ['Text 1', 'Text 2'];
      const invalidEmbeddings = [
        new Array(768).fill(0.1),
        new Array(512).fill(0.2), // Invalid dimension
      ];
      mockEmbedDocuments.mockResolvedValue(invalidEmbeddings);

      await expect(service.embedBatch(texts)).rejects.toThrow(EmbeddingServiceError);
      await expect(service.embedBatch(texts)).rejects.toMatchObject({
        code: 'INVALID_DIMENSIONS',
      });
    });

    it('should retry on connection errors', async () => {
      const texts = ['Text 1', 'Text 2'];
      const mockEmbeddings = [new Array(768).fill(0.1), new Array(768).fill(0.2)];

      mockEmbedDocuments
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(mockEmbeddings);

      const result = await service.embedBatch(texts);

      expect(result).toEqual(mockEmbeddings);
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(2);
    });

    it('should retry each batch independently', async () => {
      const texts = Array.from({ length: 15 }, (_, i) => `Text ${i + 1}`);
      const mockEmbedding = new Array(768).fill(0.1);

      // First batch fails once, second batch succeeds
      mockEmbedDocuments
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(Array(10).fill(mockEmbedding))
        .mockResolvedValueOnce(Array(5).fill(mockEmbedding));

      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(15);
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const texts = ['Text 1', 'Text 2'];
      mockEmbedDocuments.mockRejectedValue(new Error('503 Service Unavailable'));

      await expect(service.embedBatch(texts)).rejects.toThrow(EmbeddingServiceError);
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(3); // Max retries
    });

    it('should handle large batch correctly', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Text ${i + 1}`);
      const mockEmbedding = new Array(768).fill(0.1);

      mockEmbedDocuments.mockImplementation((batch: string[]) => {
        return Promise.resolve(batch.map(() => mockEmbedding));
      });

      const result = await service.embedBatch(texts);

      expect(result).toHaveLength(100);
      expect(mockEmbedDocuments).toHaveBeenCalledTimes(10); // 100 / 10 = 10 batches
    });

    it('should preserve order of embeddings', async () => {
      const texts = ['First', 'Second', 'Third'];
      const mockEmbeddings = [
        new Array(768).fill(0.1),
        new Array(768).fill(0.2),
        new Array(768).fill(0.3),
      ];
      mockEmbedDocuments.mockResolvedValue(mockEmbeddings);

      const result = await service.embedBatch(texts);

      expect(result[0]).toEqual(mockEmbeddings[0]);
      expect(result[1]).toEqual(mockEmbeddings[1]);
      expect(result[2]).toEqual(mockEmbeddings[2]);
    });
  });

  describe('custom batch size', () => {
    it('should use custom batch size', async () => {
      const customService = new EmbeddingService({ batchSize: 5 });
      const texts = Array.from({ length: 12 }, (_, i) => `Text ${i + 1}`);
      const mockEmbedding = new Array(768).fill(0.1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customMockEmbedDocuments = (customService as any).client.embedDocuments;
      customMockEmbedDocuments.mockImplementation((batch: string[]) => {
        return Promise.resolve(batch.map(() => mockEmbedding));
      });

      const result = await customService.embedBatch(texts);

      expect(result).toHaveLength(12);
      // Should be called 3 times: 5 + 5 + 2
      expect(customMockEmbedDocuments).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('should include original error in EmbeddingServiceError', async () => {
      const originalError = new Error('Original error message');
      mockEmbedQuery.mockRejectedValue(originalError);

      try {
        await service.embedSingle('Test');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmbeddingServiceError);
        if (error instanceof EmbeddingServiceError) {
          expect(error.originalError).toBe(originalError);
        }
      }
    });

    it('should have correct error codes', async () => {
      // EMPTY_TEXT
      await expect(service.embedSingle('')).rejects.toMatchObject({
        name: 'EmbeddingServiceError',
        code: 'EMPTY_TEXT',
      });

      // EMPTY_ARRAY
      await expect(service.embedBatch([])).rejects.toMatchObject({
        name: 'EmbeddingServiceError',
        code: 'EMPTY_ARRAY',
      });

      // INVALID_DIMENSIONS
      mockEmbedQuery.mockResolvedValue(new Array(512).fill(0.1));
      await expect(service.embedSingle('Test')).rejects.toMatchObject({
        name: 'EmbeddingServiceError',
        code: 'INVALID_DIMENSIONS',
      });

      // CONNECTION_FAILED
      mockEmbedQuery.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(service.embedSingle('Test')).rejects.toMatchObject({
        name: 'EmbeddingServiceError',
        code: 'CONNECTION_FAILED',
      });
    });
  });

  describe('performance', () => {
    it('should process embeddings within reasonable time', async () => {
      const texts = Array.from({ length: 10 }, (_, i) => `Text ${i + 1}`);
      const mockEmbedding = new Array(768).fill(0.1);

      mockEmbedDocuments.mockImplementation(async (batch: string[]) => {
        // Simulate 100ms delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return batch.map(() => mockEmbedding);
      });

      const startTime = Date.now();
      await service.embedBatch(texts);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should be less than 2 seconds for 10 embeddings (as per requirements)
      // With 100ms mock delay, it should be around 100-200ms
      expect(duration).toBeLessThan(2000);
    });
  });
});
