import { EventSourceParserStream } from 'eventsource-parser/stream';
import type { SSEEvent } from 'shared';

export interface SSEClientConfig {
  url: string;
  body: Record<string, unknown>;
  maxRetries?: number;
  retryDelays?: number[];
  onEvent: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class SSEClient {
  private abortController: AbortController | null = null;
  private retryCount = 0;
  private config: Required<SSEClientConfig>;

  constructor(config: SSEClientConfig) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelays: config.retryDelays ?? [1000, 2000, 4000],
      onError: config.onError ?? (() => {}),
      onConnectionChange: config.onConnectionChange ?? (() => {}),
      ...config,
    };
  }

  async connect(): Promise<void> {
    this.abortController = new AbortController();

    try {
      await this.streamEvents();
    } catch (error) {
      if (this.retryCount < this.config.maxRetries) {
        const delay = this.config.retryDelays[this.retryCount] ?? 4000;
        console.log(`[SSE] Retry ${this.retryCount + 1}/${this.config.maxRetries} in ${delay}ms`);

        this.retryCount++;
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (!this.abortController.signal.aborted) {
          return this.connect();
        }
      } else {
        this.config.onError?.(error instanceof Error ? error : new Error('SSE connection failed'));
      }
    }
  }

  private async streamEvents(): Promise<void> {
    this.config.onConnectionChange?.(true);

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.config.body),
      signal: this.abortController!.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const stream = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream());

    const reader = stream.getReader();

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value: event } = await reader.read();
        if (done) break;

        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            const sseEvent: SSEEvent = {
              type: event.event as SSEEvent['type'],
              data,
            };
            this.config.onEvent(sseEvent);

            // Stop on done or error
            if (event.event === 'done' || event.event === 'error') {
              this.disconnect();
              break;
            }
          } catch (parseError) {
            console.error('[SSE] Parse error:', parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.config.onConnectionChange?.(false);
  }

  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.retryCount = 0;
    this.config.onConnectionChange?.(false);
  }
}
