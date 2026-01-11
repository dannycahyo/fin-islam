import { DocumentRepository } from '../repositories/document.repository';
import { ChunkRepository } from '../repositories/chunk.repository';
import { DocumentProcessor } from './document-processor';
import { ChunkingService } from './chunking-service';
import { EmbeddingService } from './embedding-service';
import type { NewDocument, Document, NewDocumentChunk } from '../db/schema';

export class DocumentService {
  constructor(
    private documentRepo: DocumentRepository,
    private chunkRepo: ChunkRepository,
    private processor: DocumentProcessor,
    private chunker: ChunkingService,
    private embedder: EmbeddingService
  ) {}

  async createDocument(data: NewDocument): Promise<Document> {
    return this.documentRepo.create(data);
  }

  async getDocumentById(id: string): Promise<Document | null> {
    return this.documentRepo.findById(id);
  }

  async listDocuments(
    category?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ documents: Document[]; total: number }> {
    return this.documentRepo.findPaginated({ category, page, limit });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.chunkRepo.deleteByDocumentId(id);
    await this.documentRepo.delete(id);
  }

  async updateDocumentStatus(
    id: string,
    status: 'processing' | 'indexed' | 'failed'
  ): Promise<Document> {
    return this.documentRepo.update(id, { status });
  }

  async processDocument(documentId: string, filePath: string): Promise<void> {
    const processed = await this.processor.processFile(filePath);
    const chunked = await this.chunker.chunkDocument(processed, filePath);

    const texts = chunked.chunks.map((chunk) => chunk.content);
    const embeddings = await this.embedder.embedBatch(texts);

    const chunks: NewDocumentChunk[] = chunked.chunks.map((chunk, index) => ({
      documentId,
      content: chunk.content,
      chunkIndex: chunk.metadata.chunkIndex,
      embedding: embeddings[index],
    }));

    await this.chunkRepo.insertBatch(chunks);
    await this.documentRepo.update(documentId, { status: 'indexed' });
  }
}
