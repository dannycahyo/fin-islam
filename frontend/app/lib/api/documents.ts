import {
  DocumentSchema,
  DocumentListResponseSchema,
  DeleteDocumentResponseSchema,
  DocumentUploadResponseSchema,
  type Document,
  type DocumentListResponse,
  type DeleteDocumentResponse,
  type DocumentUploadResponse,
  type DocumentCategory,
} from 'shared';
import { fetcher, FetchError } from '../fetcher';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface UploadDocumentParams {
  file: File;
  title: string;
  category: DocumentCategory;
  description?: string;
}

export const documentsApi = {
  async getAll(
    category?: DocumentCategory,
    page?: number,
    limit?: number
  ): Promise<DocumentListResponse> {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (page) params.page = String(page);
    if (limit) params.limit = String(limit);

    return fetcher('/api/documents', {
      schema: DocumentListResponseSchema,
      params: Object.keys(params).length > 0 ? params : undefined,
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

  async upload(params: UploadDocumentParams): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('title', params.title);
    formData.append('category', params.category);
    if (params.description) {
      formData.append('description', params.description);
    }

    const url = new URL('/api/documents', API_BASE_URL);
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new FetchError(errorText, response.status, response.statusText);
    }

    const data = await response.json();
    return DocumentUploadResponseSchema.parse(data);
  },
};
