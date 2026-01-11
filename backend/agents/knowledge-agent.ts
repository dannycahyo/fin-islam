import { ChatOllama } from '@langchain/ollama';
import type { QueryCategory, KnowledgeResult } from './types';
import { KnowledgePromptBuilder } from './builders/knowledge-prompt-builder';
import type { ChunkRepository, SearchResult } from '@/repositories/chunk.repository';
import type { EmbeddingService } from '@/services/embedding-service';

export class KnowledgeAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'KnowledgeAgentError';
  }
}

export interface KnowledgeAgentConfig {
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  temperature?: number;
  retrievalLimit?: number;
  rerankedLimit?: number;
  confidenceThreshold?: number;
}

export class KnowledgeAgent {
  private client: ChatOllama;
  private maxRetries: number;
  private retrievalLimit: number;
  private rerankedLimit: number;
  private confidenceThreshold: number;
  private promptBuilder: KnowledgePromptBuilder;

  constructor(
    private chunkRepo: ChunkRepository,
    private embedder: EmbeddingService,
    config: KnowledgeAgentConfig = {}
  ) {
    const {
      baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model = process.env.KNOWLEDGE_AGENT_MODEL || process.env.OLLAMA_MODEL || 'llama3.1:8b',
      maxRetries = 3,
      temperature = Number(process.env.KNOWLEDGE_AGENT_TEMPERATURE) || 0.7,
      retrievalLimit = Number(process.env.KNOWLEDGE_RETRIEVAL_LIMIT) || 5,
      rerankedLimit = Number(process.env.KNOWLEDGE_RERANKED_LIMIT) || 3,
      confidenceThreshold = Number(process.env.KNOWLEDGE_CONFIDENCE_THRESHOLD) || 0.5,
    } = config;

    this.client = new ChatOllama({
      baseUrl,
      model,
      temperature,
    });

    this.maxRetries = maxRetries;
    this.retrievalLimit = retrievalLimit;
    this.rerankedLimit = rerankedLimit;
    this.confidenceThreshold = confidenceThreshold;
    this.promptBuilder = new KnowledgePromptBuilder();
  }

  async process(query: string, category: QueryCategory): Promise<KnowledgeResult> {
    if (!query || query.trim().length === 0) {
      throw new KnowledgeAgentError('Query cannot be empty', 'EMPTY_QUERY');
    }

    return this.executeWithRetry(async () => {
      // Step 1: Embed query
      const queryEmbedding = await this.embedder.embedSingle(query);

      // Step 2: Retrieve top 5 chunks
      const retrievedChunks = await this.retrieveChunks(queryEmbedding, category);

      // Step 3: Re-rank to top 3
      const rerankedChunks = this.rerankChunks(retrievedChunks);

      // Step 4: Calculate confidence
      const confidence = this.calculateConfidence(rerankedChunks);

      // Step 5: Check confidence threshold
      if (confidence < this.confidenceThreshold) {
        return {
          answer:
            "I don't have enough information to answer that question accurately. The available context may not contain sufficient relevant information.",
          sources: rerankedChunks.map((chunk) => ({
            documentId: chunk.documentId,
            content: chunk.content,
            relevance: chunk.similarity,
          })),
          confidence,
          category,
        };
      }

      // Step 6: Assemble context
      const context = this.assembleContext(rerankedChunks);

      // Step 7: Generate answer
      const answer = await this.generateAnswer(query, context);

      return {
        answer,
        sources: rerankedChunks.map((chunk) => ({
          documentId: chunk.documentId,
          content: chunk.content,
          relevance: chunk.similarity,
        })),
        confidence,
        category,
      };
    });
  }

  async processStreaming(
    query: string,
    category: QueryCategory,
    streamCallback: (chunk: string) => void
  ): Promise<KnowledgeResult> {
    if (!query || query.trim().length === 0) {
      throw new KnowledgeAgentError('Query cannot be empty', 'EMPTY_QUERY');
    }

    return this.executeWithRetry(async () => {
      // Step 1: Embed query
      const queryEmbedding = await this.embedder.embedSingle(query);

      // Step 2: Retrieve top 5 chunks
      const retrievedChunks = await this.retrieveChunks(queryEmbedding, category);

      // Step 3: Handle no documents - provide general response
      if (retrievedChunks.length === 0) {
        const answer = await this.generateGeneralAnswerStreaming(query, streamCallback);
        return {
          answer,
          sources: [],
          confidence: 0,
          category,
        };
      }

      // Step 4: Re-rank to top 3
      const rerankedChunks = this.rerankChunks(retrievedChunks);

      // Step 5: Calculate confidence
      const confidence = this.calculateConfidence(rerankedChunks);

      // Step 6: Check confidence threshold
      if (confidence < this.confidenceThreshold) {
        console.log('[KNOWLEDGE] Low confidence, using fallback', {
          category,
          confidence,
          threshold: this.confidenceThreshold,
        });
        const fallbackAnswer =
          "I don't have enough information to answer that question accurately. The available context may not contain sufficient relevant information.";
        streamCallback(fallbackAnswer);
        return {
          answer: fallbackAnswer,
          sources: rerankedChunks.map((chunk) => ({
            documentId: chunk.documentId,
            content: chunk.content,
            relevance: chunk.similarity,
          })),
          confidence,
          category,
        };
      }

      // Step 7: Assemble context
      const context = this.assembleContext(rerankedChunks);

      // Step 8: Generate answer with streaming
      const answer = await this.generateAnswerStreaming(query, context, streamCallback);

      return {
        answer,
        sources: rerankedChunks.map((chunk) => ({
          documentId: chunk.documentId,
          content: chunk.content,
          relevance: chunk.similarity,
        })),
        confidence,
        category,
      };
    });
  }

  private async retrieveChunks(
    queryEmbedding: number[],
    category: QueryCategory
  ): Promise<SearchResult[]> {
    const results = await this.chunkRepo.vectorSearch(queryEmbedding, {
      limit: this.retrievalLimit,
      threshold: 0.5, // Minimum similarity for retrieval
      filters: { category },
    });

    return results;
  }

  private rerankChunks(chunks: SearchResult[]): SearchResult[] {
    // Simple re-ranking: take top N by similarity score (already sorted by repository)
    return chunks.slice(0, this.rerankedLimit);
  }

  private calculateConfidence(chunks: SearchResult[]): number {
    if (chunks.length === 0) {
      return 0;
    }

    // Average similarity of top chunks
    const avgSimilarity = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length;

    return avgSimilarity;
  }

  private assembleContext(chunks: SearchResult[]): string {
    return chunks
      .map((chunk, index) => {
        return `[Source ${index + 1}]\n${chunk.content}`;
      })
      .join('\n\n');
  }

  private async generateAnswer(query: string, context: string): Promise<string> {
    const prompt = this.promptBuilder.buildPrompt({ query, context });
    const response = await this.client.invoke(prompt);

    const content =
      typeof response.content === 'string' ? response.content : String(response.content);

    return content.trim();
  }

  private async generateAnswerStreaming(
    query: string,
    context: string,
    streamCallback: (chunk: string) => void
  ): Promise<string> {
    const prompt = this.promptBuilder.buildPrompt({ query, context });
    const stream = await this.client.stream(prompt);

    let fullAnswer = '';
    for await (const chunk of stream) {
      const content = typeof chunk.content === 'string' ? chunk.content : String(chunk.content);
      fullAnswer += content;
      streamCallback(content);
    }

    return fullAnswer.trim();
  }

  private async generateGeneralAnswerStreaming(
    query: string,
    streamCallback: (chunk: string) => void
  ): Promise<string> {
    const generalPrompt = `You are a helpful assistant specializing in Islamic finance. Answer the following question in a friendly and helpful manner:

Question: ${query}

Provide a concise and helpful response.`;

    const stream = await this.client.stream(generalPrompt);

    let fullAnswer = '';
    for await (const chunk of stream) {
      const content = typeof chunk.content === 'string' ? chunk.content : String(chunk.content);
      fullAnswer += content;
      streamCallback(content);
    }

    return fullAnswer.trim();
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on validation errors or no results
        if (
          error instanceof KnowledgeAgentError &&
          ['EMPTY_QUERY', 'NO_RESULTS', 'LOW_CONFIDENCE'].includes(error.code)
        ) {
          throw error;
        }

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.maxRetries;

        if (!isRetryable || isLastAttempt) {
          throw new KnowledgeAgentError(
            `Failed to generate answer after ${attempt} attempt(s): ${this.getErrorMessage(error)}`,
            this.getErrorCode(error),
            error
          );
        }

        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delayMs);
      }
    }

    throw new KnowledgeAgentError(
      `Failed to generate answer after ${this.maxRetries} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError
    );
  }

  private isRetryableError(error: unknown): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof KnowledgeAgentError) {
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

    return 'GENERATION_FAILED';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
