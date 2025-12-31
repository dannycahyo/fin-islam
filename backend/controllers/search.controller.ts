import { Context } from 'hono';
import { SearchService } from '../services/search.service';

interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    category?: string;
    documentId?: string;
  };
}

export class SearchController {
  constructor(private searchService: SearchService) {}

  async search(c: Context) {
    try {
      const body = await c.req.json<SearchRequest>();
      const { query, limit = 10, threshold = 0.7, filters } = body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return c.json({ error: 'Query is required and must be a non-empty string' }, 400);
      }

      if (limit < 1 || limit > 100) {
        return c.json({ error: 'Limit must be between 1 and 100' }, 400);
      }

      if (threshold < 0 || threshold > 1) {
        return c.json({ error: 'Threshold must be between 0 and 1' }, 400);
      }

      // Perform search via service
      const results = await this.searchService.search({
        query,
        limit,
        threshold,
        filters,
      });

      return c.json({
        query,
        results,
        total: results.length,
        limit,
        threshold,
      });
    } catch (error) {
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
