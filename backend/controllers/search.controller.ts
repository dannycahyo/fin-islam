import { Context } from 'hono';
import { stream } from 'hono/streaming';
import { z } from 'zod';
import { AgentOrchestrator, AgentOrchestratorError } from '@/agents/agent-orchestrator';
import { SessionStore } from '@/services/session-store';
import { QueryInputSchema } from '@/schemas/orchestrator.schemas';

export class SearchController {
  constructor(
    private orchestrator: AgentOrchestrator,
    private sessionStore: SessionStore
  ) {}

  async createSession(c: Context) {
    try {
      const sessionId = this.sessionStore.createSession();
      const session = this.sessionStore.getSession(sessionId);

      if (!session) {
        return c.json({ error: 'Failed to create session' }, 500);
      }

      return c.json({
        sessionId,
        createdAt: session.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Session creation error:', error);
      return c.json({ error: 'Failed to create session' }, 500);
    }
  }

  /**
   * Process query with SSE streaming
   */
  async search(c: Context) {
    return stream(c, async (stream) => {
      try {
        const body = await c.req.json();
        const { query, sessionId: inputSessionId } = QueryInputSchema.parse(body);

        const session = this.sessionStore.getOrCreateSession(inputSessionId);
        const sessionId = session.sessionId;

        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        await stream.writeln(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n`);

        const result = await this.orchestrator.processQuery(query, sessionId, async (event) => {
          const eventData = JSON.stringify(event.data);
          await stream.writeln(`event: ${event.type}\ndata: ${eventData}\n`);
        });

        await stream.writeln(`event: done\ndata: ${JSON.stringify(result)}\n`);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorData = {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.') || 'root',
              message: e.message,
            })),
          };
          await stream.writeln(`event: error\ndata: ${JSON.stringify(errorData)}\n`);
        } else if (error instanceof AgentOrchestratorError) {
          const errorData = {
            message: error.message,
            code: error.code,
            step: error.step,
          };
          await stream.writeln(`event: error\ndata: ${JSON.stringify(errorData)}\n`);
        } else {
          const errorData = {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'UNKNOWN_ERROR',
          };
          await stream.writeln(`event: error\ndata: ${JSON.stringify(errorData)}\n`);
        }

        console.error('Orchestrator error:', error);
      } finally {
        await stream.close();
      }
    });
  }
}
