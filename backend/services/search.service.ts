import { ChunkRepository, SearchResult } from '../repositories/chunk.repository';
import { EmbeddingService } from './embedding-service';

export interface SearchQuery {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: {
    category?: string;
    documentId?: string;
  };
}

export class SearchService {
  constructor(
    private chunkRepo: ChunkRepository,
    private embedder: EmbeddingService
  ) {}

  async search(params: SearchQuery): Promise<SearchResult[]> {
    const { query, limit = 10, threshold = 0.7, filters } = params;

    // Generate embedding for query
    const queryEmbedding = await this.embedder.embedSingle(query);

    // Perform vector search
    const results = await this.chunkRepo.vectorSearch(queryEmbedding, {
      limit,
      threshold,
      filters,
    });

    return results;
  }
}
