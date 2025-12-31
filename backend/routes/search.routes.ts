import { Hono } from 'hono';
import { SearchController } from '../controllers/search.controller';
import { SearchService } from '../services/search.service';
import { ChunkRepository } from '../repositories/chunk.repository';
import { EmbeddingService } from '../services/embedding-service';

export const searchRoutes = (app: Hono) => {
  // Instantiate repository
  const chunkRepo = new ChunkRepository();

  // Instantiate embedding service
  const embedder = new EmbeddingService();

  // Instantiate service layer
  const searchService = new SearchService(chunkRepo, embedder);

  // Instantiate controller
  const controller = new SearchController(searchService);

  // Register routes
  app.post('/api/search', (c) => controller.search(c));
};
