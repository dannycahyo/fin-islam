import { Context } from 'hono';
import { z } from 'zod';
import { SearchService } from '@/services/search.service';
import { SearchInputSchema } from '@/schemas';

export class SearchController {
  constructor(private searchService: SearchService) {}

  async search(c: Context) {
    try {
      const body = await c.req.json();
      const validatedInput = SearchInputSchema.parse(body);

      const results = await this.searchService.search(validatedInput);

      return c.json({
        query: validatedInput.query,
        results,
        total: results.length,
        limit: validatedInput.limit,
        threshold: validatedInput.threshold,
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

      return c.json({ error: 'Search failed' }, 500);
    }
  }
}
