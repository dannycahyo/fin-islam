import { ChatOllama } from '@langchain/ollama';
import { QueryCategory, type RoutingResult } from './types';
import { RoutingPromptBuilder } from './builders/routing-prompt-builder';

export class RoutingAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'RoutingAgentError';
  }
}

export interface RoutingAgentConfig {
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  temperature?: number;
}

export class RoutingAgent {
  private client: ChatOllama;
  private maxRetries: number;
  private promptBuilder: RoutingPromptBuilder;

  constructor(config: RoutingAgentConfig = {}) {
    const {
      baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model = process.env.OLLAMA_MODEL || 'llama3.1:8b',
      maxRetries = 3,
      temperature = 0.1,
    } = config;

    this.client = new ChatOllama({
      baseUrl,
      model,
      temperature,
    });

    this.maxRetries = maxRetries;
    this.promptBuilder = new RoutingPromptBuilder();
  }

  async process(query: string): Promise<RoutingResult> {
    if (!query || query.trim().length === 0) {
      throw new RoutingAgentError('Query cannot be empty', 'EMPTY_QUERY');
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildPrompt(query);
      const response = await this.client.invoke(prompt);

      const content =
        typeof response.content === 'string' ? response.content : String(response.content);

      return this.parseResponse(content);
    });
  }

  private buildPrompt(query: string): string {
    return this.promptBuilder.buildPrompt(query);
  }

  private parseResponse(response: string): RoutingResult {
    const trimmed = response.trim();
    const parts = trimmed.split('|');

    if (parts.length !== 3) {
      throw new RoutingAgentError(
        `Invalid response format: expected "category|confidence|explanation", got "${trimmed}"`,
        'INVALID_RESPONSE'
      );
    }

    const [categoryStr, confidenceStr, explanation] = parts.map((p) => p.trim());

    // Validate category
    let category: QueryCategory;
    try {
      category = QueryCategory.parse(categoryStr);
    } catch {
      throw new RoutingAgentError(
        `Invalid category: "${categoryStr}". Must be one of: principles, products, compliance, comparison, calculation, general`,
        'INVALID_CATEGORY'
      );
    }

    // Validate confidence
    const confidence = parseFloat(confidenceStr);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new RoutingAgentError(
        `Invalid confidence: "${confidenceStr}". Must be a number between 0 and 1`,
        'INVALID_CONFIDENCE'
      );
    }

    // Reject low confidence
    if (confidence < 0.5) {
      throw new RoutingAgentError(
        `Low confidence classification: ${confidence.toFixed(2)}. Query classification is too uncertain.`,
        'LOW_CONFIDENCE'
      );
    }

    // Validate explanation
    if (!explanation || explanation.length === 0) {
      throw new RoutingAgentError('Explanation cannot be empty', 'INVALID_RESPONSE');
    }

    return {
      category,
      confidence,
      explanation,
    };
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on validation errors
        if (
          error instanceof RoutingAgentError &&
          [
            'EMPTY_QUERY',
            'INVALID_RESPONSE',
            'INVALID_CATEGORY',
            'INVALID_CONFIDENCE',
            'LOW_CONFIDENCE',
          ].includes(error.code)
        ) {
          throw error;
        }

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.maxRetries;

        if (!isRetryable || isLastAttempt) {
          throw new RoutingAgentError(
            `Failed to classify query after ${attempt} attempt(s): ${this.getErrorMessage(error)}`,
            this.getErrorCode(error),
            error
          );
        }

        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delayMs);
      }
    }

    throw new RoutingAgentError(
      `Failed to classify query after ${this.maxRetries} attempts`,
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
    if (error instanceof RoutingAgentError) {
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
