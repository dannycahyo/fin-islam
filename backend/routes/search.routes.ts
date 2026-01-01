import { Hono } from 'hono';
import { SearchController } from '../controllers/search.controller';
import { SearchService } from '../services/search.service';
import { ChunkRepository } from '../repositories/chunk.repository';
import { EmbeddingService } from '../services/embedding-service';
import { RoutingAgent } from '../agents/routing-agent';

export const searchRoutes = (app: Hono) => {
  const chunkRepo = new ChunkRepository();
  const embedder = new EmbeddingService();
  const routingAgent = new RoutingAgent();

  const searchService = new SearchService(chunkRepo, embedder);
  const controller = new SearchController(searchService, routingAgent);

  app.post('/api/search', (c) => controller.search(c));
};
