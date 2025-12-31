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

  async listDocuments(category?: string): Promise<Document[]> {
    return category ? this.documentRepo.findByCategory(category) : this.documentRepo.findAll();
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
    // Process file
    const processed = await this.processor.processFile(filePath);

    // Chunk document
    const chunked = await this.chunker.chunkDocument(processed, filePath);

    // Generate embeddings
    const texts = chunked.chunks.map((chunk) => chunk.content);
    const embeddings = await this.embedder.embedBatch(texts);

    // Prepare chunks for insertion
    const chunks: NewDocumentChunk[] = chunked.chunks.map((chunk, index) => ({
      documentId,
      content: chunk.content,
      chunkIndex: chunk.metadata.chunkIndex,
      embedding: embeddings[index],
    }));

    // Insert chunks with embeddings
    await this.chunkRepo.insertBatch(chunks);

    // Update document status
    await this.documentRepo.update(documentId, { status: 'indexed' });
  }
}
