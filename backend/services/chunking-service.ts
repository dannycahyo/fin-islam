import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ProcessedDocument } from './document-processor.js';

export interface ChunkMetadata {
  source: string;
  pageNumber?: number;
  chunkIndex: number;
  totalChunks?: number;
  wordCount: number;
  tokenCount?: number;
}

export interface DocumentChunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkedDocument {
  chunks: DocumentChunk[];
  totalChunks: number;
  originalMetadata: ProcessedDocument['metadata'];
}

export class ChunkingServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ChunkingServiceError';
  }
}

export class ChunkingService {
  private readonly CHUNK_SIZE = 800; // tokens
  private readonly CHUNK_OVERLAP = 100; // tokens
  private readonly MAX_CHUNK_SIZE = 1000; // tokens
  private readonly AVG_CHARS_PER_TOKEN = 4; // Approximate for English text

  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    // Convert token counts to approximate character counts
    // RecursiveCharacterTextSplitter works with characters, not tokens
    const chunkSizeInChars = this.CHUNK_SIZE * this.AVG_CHARS_PER_TOKEN;
    const overlapInChars = this.CHUNK_OVERLAP * this.AVG_CHARS_PER_TOKEN;

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: chunkSizeInChars,
      chunkOverlap: overlapInChars,
      separators: ['\n\n', '\n', '. ', '! ', '? ', ';', ',', ' ', ''],
      keepSeparator: true,
      lengthFunction: (text: string) => text.length,
    });
  }

  /**
   * Estimate token count based on character count
   * This is a simple approximation - for production use, consider using tiktoken
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / this.AVG_CHARS_PER_TOKEN);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Validate chunk doesn't exceed maximum token count
   */
  private validateChunkSize(text: string): void {
    const tokenCount = this.estimateTokenCount(text);
    if (tokenCount > this.MAX_CHUNK_SIZE) {
      throw new ChunkingServiceError(
        `Chunk exceeds maximum token count of ${this.MAX_CHUNK_SIZE} (got ${tokenCount})`,
        'CHUNK_TOO_LARGE'
      );
    }
  }

  /**
   * Chunk a processed document into smaller pieces
   */
  async chunkDocument(
    processedDoc: ProcessedDocument,
    source: string,
    pageNumber?: number
  ): Promise<ChunkedDocument> {
    try {
      if (!processedDoc.content || processedDoc.content.trim().length === 0) {
        throw new ChunkingServiceError('Document content is empty', 'EMPTY_CONTENT');
      }

      // Split text into chunks
      const textChunks = await this.textSplitter.splitText(processedDoc.content);

      // Validate all chunks
      textChunks.forEach((chunk) => this.validateChunkSize(chunk));

      // Create document chunks with metadata
      const chunks: DocumentChunk[] = textChunks.map((content, index) => ({
        content,
        metadata: {
          source,
          pageNumber,
          chunkIndex: index,
          totalChunks: textChunks.length,
          wordCount: this.countWords(content),
          tokenCount: this.estimateTokenCount(content),
        },
      }));

      return {
        chunks,
        totalChunks: chunks.length,
        originalMetadata: processedDoc.metadata,
      };
    } catch (error) {
      if (error instanceof ChunkingServiceError) {
        throw error;
      }
      throw new ChunkingServiceError(
        `Failed to chunk document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHUNKING_ERROR'
      );
    }
  }

  /**
   * Get chunking statistics for a processed document
   */
  async getChunkingStats(processedDoc: ProcessedDocument): Promise<{
    estimatedChunks: number;
    estimatedTokensPerChunk: number;
    totalEstimatedTokens: number;
  }> {
    const totalTokens = this.estimateTokenCount(processedDoc.content);
    const effectiveChunkSize = this.CHUNK_SIZE - this.CHUNK_OVERLAP;
    const estimatedChunks = Math.ceil(totalTokens / effectiveChunkSize);

    return {
      estimatedChunks,
      estimatedTokensPerChunk: this.CHUNK_SIZE,
      totalEstimatedTokens: totalTokens,
    };
  }
}
