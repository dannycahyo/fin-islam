import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { readFile } from 'fs/promises';

export interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
  };
}

export class DocumentProcessor {
  async processPDF(filePath: string): Promise<ProcessedDocument> {
    const dataBuffer = await readFile(filePath);
    const data = await pdf(dataBuffer);

    return {
      content: data.text,
      metadata: {
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).length,
      },
    };
  }

  async processDOCX(filePath: string): Promise<ProcessedDocument> {
    const result = await mammoth.extractRawText({ path: filePath });

    return {
      content: result.value,
      metadata: {
        wordCount: result.value.split(/\s+/).length,
      },
    };
  }

  async processTXT(filePath: string): Promise<ProcessedDocument> {
    const content = await readFile(filePath, 'utf-8');

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
      },
    };
  }

  async processMD(filePath: string): Promise<ProcessedDocument> {
    return this.processTXT(filePath);
  }

  chunkText(text: string, chunkSize = 600, overlap = 100): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }
}
