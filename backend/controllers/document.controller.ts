import { Context } from 'hono';
import { writeFile } from 'node:fs/promises';
import { DocumentService } from '../services/document.service';

export class DocumentController {
  constructor(private documentService: DocumentService) {}

  async uploadDocument(c: Context) {
    try {
      const body = await c.req.parseBody();
      const file = body.file as File;
      const title = body.title as string;
      const category = body.category as string;
      const description = body.description as string | undefined;

      if (!file || !title || !category) {
        return c.json({ error: 'Missing required fields: file, title, category' }, 400);
      }

      // Save file temporarily and process
      const tempPath = `/tmp/${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(tempPath, Buffer.from(arrayBuffer));

      // Create document record
      const document = await this.documentService.createDocument({
        title,
        description,
        category,
        filePath: tempPath,
        fileType: file.name.split('.').pop() || 'unknown',
        status: 'processing',
      });

      // Process document in background
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
      console.error('Upload error:', error);
      return c.json({ error: 'Failed to upload document' }, 500);
    }
  }

  async getDocument(c: Context) {
    try {
      const id = c.req.param('id');
      const document = await this.documentService.getDocumentById(id);

      if (!document) {
        return c.json({ error: 'Document not found' }, 404);
      }

      return c.json(document);
    } catch (error) {
      console.error('Get document error:', error);
      return c.json({ error: 'Failed to retrieve document' }, 500);
    }
  }

  async listDocuments(c: Context) {
    try {
      const category = c.req.query('category');
      const documents = await this.documentService.listDocuments(category);

      return c.json({ documents, total: documents.length });
    } catch (error) {
      console.error('List documents error:', error);
      return c.json({ error: 'Failed to list documents' }, 500);
    }
  }

  async deleteDocument(c: Context) {
    try {
      const id = c.req.param('id');
      const document = await this.documentService.getDocumentById(id);

      if (!document) {
        return c.json({ error: 'Document not found' }, 404);
      }

      await this.documentService.deleteDocument(id);

      return c.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      return c.json({ error: 'Failed to delete document' }, 500);
    }
  }
}
