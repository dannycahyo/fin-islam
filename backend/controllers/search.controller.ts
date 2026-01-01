import { Context } from 'hono';
import { z } from 'zod';
import { SearchService } from '@/services/search.service';
import { SearchInputSchema } from '@/schemas';
import { RoutingAgent } from '@/agents/routing-agent';

export class SearchController {
  constructor(
    private searchService: SearchService,
    private routingAgent: RoutingAgent
  ) {}

  async search(c: Context) {
    try {
      const body = await c.req.json();
      const validatedInput = SearchInputSchema.parse(body);

      // Route query to classify category
      const routing = await this.routingAgent.process(validatedInput.query);

      // Search with category filter
      const results = await this.searchService.search({
        ...validatedInput,
        filters: {
          ...validatedInput.filters,
          category: routing.category,
        },
      });

      return c.json({
        query: validatedInput.query,
        results,
        total: results.length,
        limit: validatedInput.limit,
        threshold: validatedInput.threshold,
        routing: {
          category: routing.category,
          confidence: routing.confidence,
          explanation: routing.explanation,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.') || 'root',
              message: e.message,
            })),
          },
          400
        );
      }

      console.error('Search error:', error);

      if (error instanceof Error && error.name === 'EmbeddingServiceError') {
        return c.json(
          {
            error: 'Failed to generate query embedding',
            details: error.message,
          },
          500
        );
      }

      if (error instanceof Error && error.name === 'RoutingAgentError') {
        return c.json(
          {
            error: 'Failed to classify query',
            details: error.message,
          },
          500
        );
      }

      return c.json({ error: 'Search failed' }, 500);
    }
  }
}
