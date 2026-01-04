import {
  DocumentSchema,
  DocumentListResponseSchema,
  DeleteDocumentResponseSchema,
  type Document,
  type DocumentListResponse,
  type DeleteDocumentResponse,
  type DocumentCategory,
} from 'shared';
import { fetcher } from '../fetcher';

export const documentsApi = {
  async getAll(category?: DocumentCategory): Promise<DocumentListResponse> {
    return fetcher('/api/documents', {
      schema: DocumentListResponseSchema,
      params: category ? { category } : undefined,
    });
  },

  async getById(id: string): Promise<Document> {
    return fetcher(`/api/documents/${id}`, {
      schema: DocumentSchema,
    });
  },

  async delete(id: string): Promise<DeleteDocumentResponse> {
    return fetcher(`/api/documents/${id}`, {
      method: 'DELETE',
      schema: DeleteDocumentResponseSchema,
    });
  },
};
