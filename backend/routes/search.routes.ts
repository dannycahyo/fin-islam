import { Hono } from 'hono';
import { SearchController } from '@/controllers/search.controller';
import { ChunkRepository } from '@/repositories/chunk.repository';
import { EmbeddingService } from '@/services/embedding-service';
import { SessionStore } from '@/services/session-store';
import { RoutingAgent } from '@/agents/routing-agent';
import { KnowledgeAgent } from '@/agents/knowledge-agent';
import { CalculationAgent } from '@/agents/calculation-agent';
import { ComplianceAgent } from '@/agents/compliance-agent';
import { AgentOrchestrator } from '@/agents/agent-orchestrator';

export const searchRoutes = (app: Hono) => {
  const chunkRepo = new ChunkRepository();
  const embedder = new EmbeddingService();
  const sessionStore = new SessionStore();

  const routingAgent = new RoutingAgent();
  const knowledgeAgent = new KnowledgeAgent(chunkRepo, embedder);
  const calculationAgent = new CalculationAgent();
  const complianceAgent = new ComplianceAgent();

  const orchestrator = new AgentOrchestrator(
    routingAgent,
    knowledgeAgent,
    calculationAgent,
    complianceAgent,
    sessionStore
  );

  const controller = new SearchController(orchestrator, sessionStore);

  app.post('/api/session', (c) => controller.createSession(c));
  app.post('/api/search', (c) => controller.search(c));

  // Cleanup on shutdown
  process.on('SIGTERM', () => sessionStore.destroy());
  process.on('SIGINT', () => sessionStore.destroy());
};
