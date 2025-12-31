import { Hono } from 'hono';
import { DocumentController } from '@/controllers/document.controller';
import { DocumentService } from '@/services/document.service';
import { DocumentRepository } from '@/repositories/document.repository';
import { ChunkRepository } from '@/repositories/chunk.repository';
import { DocumentProcessor } from '@/services/document-processor';
import { ChunkingService } from '@/services/chunking-service';
import { EmbeddingService } from '@/services/embedding-service';

export const documentRoutes = (app: Hono) => {
  const documentRepo = new DocumentRepository();
  const chunkRepo = new ChunkRepository();

  const processor = new DocumentProcessor();
  const chunker = new ChunkingService();
  const embedder = new EmbeddingService();

  const documentService = new DocumentService(
    documentRepo,
    chunkRepo,
    processor,
    chunker,
    embedder
  );

  const controller = new DocumentController(documentService);

  app.post('/api/documents', (c) => controller.uploadDocument(c));
  app.get('/api/documents/:id', (c) => controller.getDocument(c));
  app.get('/api/documents', (c) => controller.listDocuments(c));
  app.delete('/api/documents/:id', (c) => controller.deleteDocument(c));
};
