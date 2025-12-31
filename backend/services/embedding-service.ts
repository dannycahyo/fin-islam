import { OllamaEmbeddings } from '@langchain/ollama';

/**
 * Custom error for embedding service failures
 */
export class EmbeddingServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'EmbeddingServiceError';
  }
}

/**
 * Configuration for EmbeddingService
 */
export interface EmbeddingServiceConfig {
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  batchSize?: number;
}

/**
 * Service to generate embeddings using nomic-embed-text model via Ollama
 * Implements batch processing with retry logic for efficiency
 */
export class EmbeddingService {
  private client: OllamaEmbeddings;
  private maxRetries: number;
  private batchSize: number;

  constructor(config: EmbeddingServiceConfig = {}) {
    const {
      baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      maxRetries = 3,
      batchSize = 10,
    } = config;

    this.client = new OllamaEmbeddings({
      baseUrl,
      model,
    });

    this.maxRetries = maxRetries;
    this.batchSize = batchSize;
  }

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns 768-dimensional embedding vector
   */
  async embedSingle(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingServiceError('Text cannot be empty', 'EMPTY_TEXT');
    }

    return this.executeWithRetry(async () => {
      const embedding = await this.client.embedQuery(text);

      // Validate embedding dimensions
      if (embedding.length !== 768) {
        throw new EmbeddingServiceError(
          `Invalid embedding dimensions: expected 768, got ${embedding.length}`,
          'INVALID_DIMENSIONS'
        );
      }

      return embedding;
    });
  }

  /**
   * Generate embeddings for multiple texts in batches
   * @param texts - Array of texts to embed
   * @returns Array of 768-dimensional embedding vectors
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new EmbeddingServiceError('Texts array cannot be empty', 'EMPTY_ARRAY');
    }

    // Validate all texts
    for (const text of texts) {
      if (!text || text.trim().length === 0) {
        throw new EmbeddingServiceError('All texts must be non-empty', 'EMPTY_TEXT');
      }
    }

    const embeddings: number[][] = [];

    // Process in batches of batchSize
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      const batchEmbeddings = await this.executeWithRetry(async () => {
        const results = await this.client.embedDocuments(batch);

        // Validate all embeddings
        for (const embedding of results) {
          if (embedding.length !== 768) {
            throw new EmbeddingServiceError(
              `Invalid embedding dimensions: expected 768, got ${embedding.length}`,
              'INVALID_DIMENSIONS'
            );
          }
        }

        return results;
      });

      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Execute a function with retry logic for transient failures
   * @param fn - Function to execute
   * @returns Result from the function
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.maxRetries;

        if (!isRetryable || isLastAttempt) {
          // Throw immediately if not retryable or last attempt
          throw new EmbeddingServiceError(
            `Failed to generate embeddings after ${attempt} attempt(s): ${this.getErrorMessage(error)}`,
            this.getErrorCode(error),
            error
          );
        }

        // Wait before retry with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delayMs);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new EmbeddingServiceError(
      `Failed to generate embeddings after ${this.maxRetries} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError
    );
  }

  /**
   * Check if error is retryable (connection/network issues)
   */
  private isRetryableError(error: unknown): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    // Retry on connection failures, timeouts, and rate limits
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      errorMessage.includes('503') ||
      errorMessage.includes('network')
    );
  }

  /**
   * Get error message from unknown error type
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: unknown): string {
    if (error instanceof EmbeddingServiceError) {
      return error.code;
    }

    const message = this.getErrorMessage(error).toLowerCase();

    if (message.includes('connection') || message.includes('econnrefused')) {
      return 'CONNECTION_FAILED';
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'RATE_LIMIT';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
