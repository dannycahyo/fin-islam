import { Context } from 'hono';
import { z } from 'zod';
import { writeFile } from 'node:fs/promises';
import { DocumentService } from '@/services/document.service';
import {
  DocumentUploadFieldsSchema,
  DocumentParamSchema,
  ListDocumentsQuerySchema,
} from '@/schemas';

export class DocumentController {
  constructor(private documentService: DocumentService) {}

  async uploadDocument(c: Context) {
    try {
      const body = await c.req.parseBody();
      const file = body.file as File;
      const title = body.title as string;
      const category = body.category as string;
      const description = body.description as string | undefined;

      const validatedFields = DocumentUploadFieldsSchema.parse({
        title,
        category,
        description,
      });

      if (!file) {
        return c.json(
          {
            error: 'Validation failed',
            message: 'file: File is required',
          },
          400
        );
      }

      const allowedExtensions = ['pdf', 'docx', 'txt', 'md'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        return c.json(
          {
            error: 'Validation failed',
            message: `file: File type must be one of: ${allowedExtensions.join(', ')}`,
          },
          400
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        return c.json(
          {
            error: 'Validation failed',
            message: 'file: File must not be empty',
          },
          400
        );
      }

      const tempPath = `/tmp/${file.name}`;
      await writeFile(tempPath, Buffer.from(arrayBuffer));

      const document = await this.documentService.createDocument({
        title: validatedFields.title,
        description: validatedFields.description,
        category: validatedFields.category,
        filePath: tempPath,
        fileType: fileExt,
        status: 'processing',
      });

      this.documentService.processDocument(document.id, tempPath).catch(async (error) => {
        console.error('Document processing failed:', error);
        await this.documentService.updateDocumentStatus(document.id, 'failed');
      });

      return c.json(
        {
          id: document.id,
          title: document.title,
          status: document.status,
          message: 'Document upload started, processing in background',
        },
        202
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          400
        );
      }

      console.error('Upload error:', error);
      return c.json({ error: 'Failed to upload document' }, 500);
    }
  }

  async getDocument(c: Context) {
    try {
      const { id } = DocumentParamSchema.parse({ id: c.req.param('id') });
      const document = await this.documentService.getDocumentById(id);

      if (!document) {
        return c.json({ error: 'Document not found' }, 404);
      }

      return c.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          400
        );
      }

      console.error('Get document error:', error);
      return c.json({ error: 'Failed to retrieve document' }, 500);
    }
  }

  async listDocuments(c: Context) {
    try {
      const { category } = ListDocumentsQuerySchema.parse({
        category: c.req.query('category'),
      });
      const documents = await this.documentService.listDocuments(category);

      return c.json({ documents, total: documents.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          400
        );
      }

      console.error('List documents error:', error);
      return c.json({ error: 'Failed to list documents' }, 500);
    }
  }

  async deleteDocument(c: Context) {
    try {
      const { id } = DocumentParamSchema.parse({ id: c.req.param('id') });
      const document = await this.documentService.getDocumentById(id);

      if (!document) {
        return c.json({ error: 'Document not found' }, 404);
      }

      await this.documentService.deleteDocument(id);

      return c.json({ message: 'Document deleted successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          400
        );
      }

      console.error('Delete document error:', error);
      return c.json({ error: 'Failed to delete document' }, 500);
    }
  }
}
