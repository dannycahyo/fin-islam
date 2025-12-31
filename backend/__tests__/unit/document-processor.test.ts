import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentProcessor, DocumentProcessorError } from '@/services/document-processor.js';
import { readFile, stat } from 'fs/promises';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Mock external dependencies
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;

  beforeEach(() => {
    processor = new DocumentProcessor();
    vi.clearAllMocks();
  });

  describe('processPDF', () => {
    it('should process valid PDF file', async () => {
      const mockPdfContent = 'Sample PDF content for testing.\nSecond line.';
      const mockBuffer = Buffer.from('mock pdf data');

      vi.mocked(stat).mockResolvedValue({
        size: 1024 * 500, // 500KB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(readFile).mockResolvedValue(mockBuffer);

      vi.mocked(pdf).mockResolvedValue({
        text: mockPdfContent,
        numpages: 1,
        info: {},
        metadata: null,
        version: 'v1.10.100',
        numrender: 1,
      });

      const result = await processor.processPDF('/path/to/test.pdf');

      expect(result.content).toContain('Sample PDF content');
      expect(result.metadata.pageCount).toBe(1);
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(readFile).toHaveBeenCalledWith('/path/to/test.pdf');
      expect(pdf).toHaveBeenCalledWith(mockBuffer);
    });

    it('should throw error for empty PDF', async () => {
      vi.mocked(stat).mockResolvedValue({
        size: 1024,
      } as any);

      vi.mocked(readFile).mockResolvedValue(Buffer.from('mock'));

      vi.mocked(pdf).mockResolvedValue({
        text: '',
        numpages: 1,
        info: {},
        metadata: null,
        version: 'v1.10.100',
        numrender: 1,
      });

      await expect(processor.processPDF('/path/to/empty.pdf')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processPDF('/path/to/empty.pdf')).rejects.toMatchObject({
        code: 'NO_TEXT_CONTENT',
      });
    });

    it('should throw error for file too large', async () => {
      vi.mocked(stat).mockResolvedValue({
        size: 11 * 1024 * 1024, // 11MB
      } as any);

      await expect(processor.processPDF('/path/to/large.pdf')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processPDF('/path/to/large.pdf')).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
      });
    });

    it('should throw error for empty file', async () => {
      vi.mocked(stat).mockResolvedValue({
        size: 0,
      } as any);

      await expect(processor.processPDF('/path/to/empty.pdf')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processPDF('/path/to/empty.pdf')).rejects.toMatchObject({
        code: 'EMPTY_FILE',
      });
    });

    it('should clean text properly', async () => {
      const mockPdfContent = 'Test   content\n\n\n\nwith    spaces\x00\x01';

      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from('mock'));
      vi.mocked(pdf).mockResolvedValue({
        text: mockPdfContent,
        numpages: 1,
        info: {},
        metadata: null,
        version: 'v1.10.100',
        numrender: 1,
      });

      const result = await processor.processPDF('/path/to/test.pdf');

      // Should remove excessive whitespace
      expect(result.content).not.toContain('   ');
      expect(result.content).not.toContain('\n\n\n');
      // Should remove control characters
      expect(result.content).not.toContain('\x00');
      expect(result.content).not.toContain('\x01');
    });

    it('should handle pdf-parse errors', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from('mock'));
      vi.mocked(pdf).mockRejectedValue(new Error('Invalid PDF structure'));

      await expect(processor.processPDF('/path/to/corrupt.pdf')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processPDF('/path/to/corrupt.pdf')).rejects.toMatchObject({
        code: 'PDF_PROCESSING_ERROR',
      });
    });
  });

  describe('processDOCX', () => {
    it('should process valid DOCX file', async () => {
      const mockDocxContent = 'Sample DOCX content for testing.';

      vi.mocked(stat).mockResolvedValue({
        size: 1024 * 500,
      } as any);

      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: mockDocxContent,
        messages: [],
      });

      const result = await processor.processDOCX('/path/to/test.docx');

      expect(result.content).toContain('Sample DOCX content');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(mammoth.extractRawText).toHaveBeenCalledWith({
        path: '/path/to/test.docx',
      });
    });

    it('should throw error for empty DOCX', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: '',
        messages: [],
      });

      await expect(processor.processDOCX('/path/to/empty.docx')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processDOCX('/path/to/empty.docx')).rejects.toMatchObject({
        code: 'NO_TEXT_CONTENT',
      });
    });

    it('should handle mammoth errors', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error('Invalid DOCX structure'));

      await expect(processor.processDOCX('/path/to/corrupt.docx')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processDOCX('/path/to/corrupt.docx')).rejects.toMatchObject({
        code: 'DOCX_PROCESSING_ERROR',
      });
    });
  });

  describe('processTXT', () => {
    it('should process valid TXT file', async () => {
      const mockContent = 'Sample text file content.\nMultiple lines.';

      vi.mocked(stat).mockResolvedValue({
        size: 1024,
      } as any);

      vi.mocked(readFile).mockResolvedValue(mockContent);

      const result = await processor.processTXT('/path/to/test.txt');

      expect(result.content).toContain('Sample text file');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(readFile).toHaveBeenCalledWith('/path/to/test.txt', 'utf-8');
    });

    it('should throw error for empty TXT file', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue('');

      await expect(processor.processTXT('/path/to/empty.txt')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processTXT('/path/to/empty.txt')).rejects.toMatchObject({
        code: 'NO_TEXT_CONTENT',
      });
    });

    it('should handle file read errors', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      await expect(processor.processTXT('/path/to/missing.txt')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processTXT('/path/to/missing.txt')).rejects.toMatchObject({
        code: 'TXT_PROCESSING_ERROR',
      });
    });

    it('should handle UTF-8 content correctly', async () => {
      const mockContent = 'Test with unicode: مالية إسلامية';

      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(mockContent);

      const result = await processor.processTXT('/path/to/unicode.txt');

      expect(result.content).toContain('مالية إسلامية');
    });
  });

  describe('processMD', () => {
    it('should process markdown file using processTXT', async () => {
      const mockContent = '# Heading\n\nMarkdown content.';

      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(mockContent);

      const result = await processor.processMD('/path/to/test.md');

      expect(result.content).toContain('# Heading');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(readFile).toHaveBeenCalledWith('/path/to/test.md', 'utf-8');
    });
  });

  describe('processFile', () => {
    it('should route to processPDF for PDF files', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from('mock'));
      vi.mocked(pdf).mockResolvedValue({
        text: 'PDF content',
        numpages: 1,
        info: {},
        metadata: null,
        version: 'v1.10.100',
        numrender: 1,
      });

      await processor.processFile('/path/to/document.pdf');

      expect(pdf).toHaveBeenCalled();
    });

    it('should route to processDOCX for DOCX files', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: 'DOCX content',
        messages: [],
      });

      await processor.processFile('/path/to/document.docx');

      expect(mammoth.extractRawText).toHaveBeenCalled();
    });

    it('should route to processTXT for TXT files', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue('Text content');

      await processor.processFile('/path/to/document.txt');

      expect(readFile).toHaveBeenCalledWith('/path/to/document.txt', 'utf-8');
    });

    it('should route to processMD for MD files', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue('# Markdown');

      await processor.processFile('/path/to/document.md');

      expect(readFile).toHaveBeenCalledWith('/path/to/document.md', 'utf-8');
    });

    it('should throw error for unsupported file type', async () => {
      await expect(processor.processFile('/path/to/file.jpg')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processFile('/path/to/file.jpg')).rejects.toMatchObject({
        code: 'UNSUPPORTED_FILE_TYPE',
      });
    });
  });

  describe('File validation', () => {
    it('should validate file type correctly', async () => {
      // Test allowed types
      for (const ext of ['.pdf', '.docx', '.txt', '.md']) {
        vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
        if (ext === '.pdf') {
          vi.mocked(readFile).mockResolvedValue(Buffer.from('mock'));
          vi.mocked(pdf).mockResolvedValue({
            text: 'content',
            numpages: 1,
            info: {},
            metadata: null,
            version: 'v1.10.100',
            numrender: 1,
          });
        } else if (ext === '.docx') {
          vi.mocked(mammoth.extractRawText).mockResolvedValue({
            value: 'content',
            messages: [],
          });
        } else {
          vi.mocked(readFile).mockResolvedValue('content');
        }

        await expect(processor.processFile(`/path/to/file${ext}`)).resolves.toBeDefined();
      }

      // Test disallowed types
      for (const ext of ['.jpg', '.png', '.doc', '.xlsx']) {
        await expect(processor.processFile(`/path/to/file${ext}`)).rejects.toThrow(
          DocumentProcessorError
        );
      }
    });

    it('should validate file size correctly', async () => {
      // Within limit
      vi.mocked(stat).mockResolvedValue({ size: 5 * 1024 * 1024 } as any);
      vi.mocked(readFile).mockResolvedValue('content');

      await expect(processor.processTXT('/path/to/file.txt')).resolves.toBeDefined();

      // Exceeds limit
      vi.mocked(stat).mockResolvedValue({ size: 11 * 1024 * 1024 } as any);

      await expect(processor.processTXT('/path/to/large.txt')).rejects.toThrow(
        DocumentProcessorError
      );
    });

    it('should handle file access errors', async () => {
      vi.mocked(stat).mockRejectedValue(new Error('Permission denied'));

      await expect(processor.processTXT('/path/to/forbidden.txt')).rejects.toThrow(
        DocumentProcessorError
      );
      await expect(processor.processTXT('/path/to/forbidden.txt')).rejects.toMatchObject({
        code: 'FILE_ACCESS_ERROR',
      });
    });
  });

  describe('Text cleaning', () => {
    it('should remove control characters except newlines', async () => {
      const dirtyText = 'Clean\x00text\x01with\x08control\x0Cchars';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(dirtyText);

      const result = await processor.processTXT('/path/to/test.txt');

      // eslint-disable-next-line no-control-regex
      expect(result.content).not.toMatch(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/);
    });

    it('should normalize whitespace', async () => {
      const dirtyText = 'Text   with    multiple     spaces\n\n\n\nand newlines';
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(dirtyText);

      const result = await processor.processTXT('/path/to/test.txt');

      expect(result.content).not.toMatch(/ {3,}/);
      expect(result.content).not.toMatch(/\n{3,}/);
    });

    it('should trim leading and trailing whitespace', async () => {
      const dirtyText = '  \n\n  Text content  \n\n  ';
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(dirtyText);

      const result = await processor.processTXT('/path/to/test.txt');

      expect(result.content).toBe('Text content');
    });
  });

  describe('Metadata generation', () => {
    it('should generate correct word count', async () => {
      const content = 'One two three four five';
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(content);

      const result = await processor.processTXT('/path/to/test.txt');

      expect(result.metadata.wordCount).toBe(5);
    });

    it('should include page count for PDFs', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue(Buffer.from('mock'));
      vi.mocked(pdf).mockResolvedValue({
        text: 'content',
        numpages: 10,
        info: {},
        metadata: null,
        version: 'v1.10.100',
        numrender: 1,
      });

      const result = await processor.processPDF('/path/to/test.pdf');

      expect(result.metadata.pageCount).toBe(10);
    });

    it('should not include page count for non-PDF files', async () => {
      vi.mocked(stat).mockResolvedValue({ size: 1024 } as any);
      vi.mocked(readFile).mockResolvedValue('content');

      const result = await processor.processTXT('/path/to/test.txt');

      expect(result.metadata.pageCount).toBeUndefined();
    });
  });
});
