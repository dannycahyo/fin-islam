import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { readFile, stat } from 'fs/promises';
import { extname } from 'path';

export interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
  };
}

export enum FileType {
  PDF = '.pdf',
  DOCX = '.docx',
  TXT = '.txt',
  MD = '.md',
}

export class DocumentProcessorError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'DocumentProcessorError';
  }
}

export class DocumentProcessor {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  private readonly ALLOWED_TYPES = [FileType.PDF, FileType.DOCX, FileType.TXT, FileType.MD];

  /**
   * Validate file type based on extension
   */
  private validateFileType(filePath: string): void {
    const ext = extname(filePath).toLowerCase();
    if (!this.ALLOWED_TYPES.includes(ext as FileType)) {
      throw new DocumentProcessorError(
        `Invalid file type: ${ext}. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`,
        'INVALID_FILE_TYPE'
      );
    }
  }

  /**
   * Validate file size (max 10MB)
   */
  private async validateFileSize(filePath: string): Promise<void> {
    try {
      const stats = await stat(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new DocumentProcessorError(
          `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
          'FILE_TOO_LARGE'
        );
      }
      if (stats.size === 0) {
        throw new DocumentProcessorError('File is empty', 'EMPTY_FILE');
      }
    } catch (error) {
      if (error instanceof DocumentProcessorError) {
        throw error;
      }
      throw new DocumentProcessorError(
        `Failed to access file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_ACCESS_ERROR'
      );
    }
  }

  /**
   * Clean extracted text by removing excessive whitespace and special characters
   */
  private cleanText(text: string): string {
    return (
      text
        // Remove null bytes and other control characters except newlines and tabs
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
        // Replace multiple spaces with single space
        .replace(/ +/g, ' ')
        // Replace multiple newlines with maximum 2 newlines
        .replace(/\n{3,}/g, '\n\n')
        // Remove spaces at the beginning and end of lines
        .replace(/^[ \t]+|[ \t]+$/gm, '')
        // Trim overall text
        .trim()
    );
  }

  /**
   * Validate file before processing
   */
  private async validateFile(filePath: string): Promise<void> {
    this.validateFileType(filePath);
    await this.validateFileSize(filePath);
  }

  async processPDF(filePath: string): Promise<ProcessedDocument> {
    await this.validateFile(filePath);

    try {
      const dataBuffer = await readFile(filePath);
      const data = await pdf(dataBuffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new DocumentProcessorError(
          'PDF file contains no extractable text',
          'NO_TEXT_CONTENT'
        );
      }

      const cleanedText = this.cleanText(data.text);

      return {
        content: cleanedText,
        metadata: {
          pageCount: data.numpages,
          wordCount: cleanedText.split(/\s+/).filter((w) => w.length > 0).length,
        },
      };
    } catch (error) {
      if (error instanceof DocumentProcessorError) {
        throw error;
      }
      throw new DocumentProcessorError(
        `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PDF_PROCESSING_ERROR'
      );
    }
  }

  async processDOCX(filePath: string): Promise<ProcessedDocument> {
    await this.validateFile(filePath);

    try {
      const result = await mammoth.extractRawText({ path: filePath });

      if (!result.value || result.value.trim().length === 0) {
        throw new DocumentProcessorError(
          'DOCX file contains no extractable text',
          'NO_TEXT_CONTENT'
        );
      }

      const cleanedText = this.cleanText(result.value);

      return {
        content: cleanedText,
        metadata: {
          wordCount: cleanedText.split(/\s+/).filter((w) => w.length > 0).length,
        },
      };
    } catch (error) {
      if (error instanceof DocumentProcessorError) {
        throw error;
      }
      throw new DocumentProcessorError(
        `Failed to process DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOCX_PROCESSING_ERROR'
      );
    }
  }

  async processTXT(filePath: string): Promise<ProcessedDocument> {
    await this.validateFile(filePath);

    try {
      const content = await readFile(filePath, 'utf-8');

      if (!content || content.trim().length === 0) {
        throw new DocumentProcessorError('Text file is empty', 'NO_TEXT_CONTENT');
      }

      const cleanedText = this.cleanText(content);

      return {
        content: cleanedText,
        metadata: {
          wordCount: cleanedText.split(/\s+/).filter((w) => w.length > 0).length,
        },
      };
    } catch (error) {
      if (error instanceof DocumentProcessorError) {
        throw error;
      }
      throw new DocumentProcessorError(
        `Failed to process TXT: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TXT_PROCESSING_ERROR'
      );
    }
  }

  async processMD(filePath: string): Promise<ProcessedDocument> {
    // MD files are processed the same way as TXT files
    // Validation is handled in processTXT
    return this.processTXT(filePath);
  }

  /**
   * Process any supported file type
   */
  async processFile(filePath: string): Promise<ProcessedDocument> {
    const ext = extname(filePath).toLowerCase() as FileType;

    switch (ext) {
      case FileType.PDF:
        return this.processPDF(filePath);
      case FileType.DOCX:
        return this.processDOCX(filePath);
      case FileType.TXT:
        return this.processTXT(filePath);
      case FileType.MD:
        return this.processMD(filePath);
      default:
        throw new DocumentProcessorError(`Unsupported file type: ${ext}`, 'UNSUPPORTED_FILE_TYPE');
    }
  }
}
