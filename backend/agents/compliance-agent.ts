import { ChatOllama } from '@langchain/ollama';
import { ComplianceStatus, type ComplianceResult, type ComplianceAgentConfig } from './types';
import { CompliancePromptBuilder } from './builders/compliance-prompt-builder';

export class ComplianceAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ComplianceAgentError';
  }
}

export class ComplianceAgent {
  private client: ChatOllama;
  private maxRetries: number;
  private confidenceThreshold: number;
  private promptBuilder: CompliancePromptBuilder;

  constructor(config: ComplianceAgentConfig = {}) {
    const {
      baseUrl = process.env.OLLAMA_CLOUD_URL ||
        process.env.OLLAMA_BASE_URL ||
        'http://localhost:11434',
      model = process.env.OLLAMA_MODEL || 'llama3.1:8b',
      apiKey = process.env.OLLAMA_API_KEY,
      maxRetries = 3,
      temperature = 0.1,
      confidenceThreshold = 0.7,
    } = config;

    let headers: Headers | undefined;
    if (apiKey) {
      headers = new Headers();
      headers.append('Authorization', `Bearer ${apiKey}`);
    }

    this.client = new ChatOllama({
      baseUrl,
      model,
      temperature,
      headers,
    });

    this.maxRetries = maxRetries;
    this.confidenceThreshold = confidenceThreshold;
    this.promptBuilder = new CompliancePromptBuilder();
  }

  async validate(response: string): Promise<ComplianceResult> {
    if (!response || response.trim().length === 0) {
      throw new ComplianceAgentError('Response cannot be empty', 'EMPTY_RESPONSE');
    }

    return this.executeWithRetry(async () => {
      const prompt = this.buildPrompt(response);
      const llmResponse = await this.client.invoke(prompt);

      const content =
        typeof llmResponse.content === 'string' ? llmResponse.content : String(llmResponse.content);

      return this.parseResponse(content);
    });
  }

  private buildPrompt(response: string): string {
    return this.promptBuilder.buildPrompt(response);
  }

  private parseResponse(response: string): ComplianceResult {
    const trimmed = response.trim();
    const parts = trimmed.split('|');

    // Expected format: status|confidence|reasoning|violations|suggestions
    if (parts.length < 3 || parts.length > 5) {
      throw new ComplianceAgentError(
        `Invalid response format: expected "status|confidence|reasoning[|violations][|suggestions]", got "${trimmed}"`,
        'INVALID_RESPONSE'
      );
    }

    const [statusStr, confidenceStr, reasoning, violationsStr, suggestionsStr] = parts.map((p) =>
      p.trim()
    );

    // Validate status
    let status: ComplianceStatus;
    try {
      status = ComplianceStatus.parse(statusStr);
    } catch {
      throw new ComplianceAgentError(
        `Invalid status: "${statusStr}". Must be COMPLIANT or FLAGGED`,
        'INVALID_STATUS'
      );
    }

    // Validate confidence
    const confidence = parseFloat(confidenceStr);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new ComplianceAgentError(
        `Invalid confidence: "${confidenceStr}". Must be a number between 0 and 1`,
        'INVALID_CONFIDENCE'
      );
    }

    // Check confidence threshold
    if (confidence < this.confidenceThreshold) {
      throw new ComplianceAgentError(
        `Low confidence validation: ${confidence.toFixed(2)}. Validation too uncertain.`,
        'LOW_CONFIDENCE_VALIDATION'
      );
    }

    // Validate reasoning
    if (!reasoning || reasoning.length === 0) {
      throw new ComplianceAgentError('Reasoning cannot be empty', 'INVALID_RESPONSE');
    }

    // Parse violations and suggestions (optional, comma-separated)
    const violations =
      violationsStr && violationsStr !== 'NONE'
        ? violationsStr.split(',').map((v) => v.trim())
        : undefined;

    const suggestions =
      suggestionsStr && suggestionsStr !== 'NONE'
        ? suggestionsStr.split(',').map((s) => s.trim())
        : undefined;

    return {
      status,
      confidence,
      reasoning,
      violations,
      suggestions,
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
          error instanceof ComplianceAgentError &&
          [
            'EMPTY_RESPONSE',
            'INVALID_RESPONSE',
            'INVALID_STATUS',
            'INVALID_CONFIDENCE',
            'LOW_CONFIDENCE_VALIDATION',
          ].includes(error.code)
        ) {
          throw error;
        }

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.maxRetries;

        if (!isRetryable || isLastAttempt) {
          throw new ComplianceAgentError(
            `Failed to validate response after ${attempt} attempt(s): ${this.getErrorMessage(error)}`,
            this.getErrorCode(error),
            error
          );
        }

        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delayMs);
      }
    }

    throw new ComplianceAgentError(
      `Failed to validate response after ${this.maxRetries} attempts`,
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
    if (error instanceof ComplianceAgentError) {
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
