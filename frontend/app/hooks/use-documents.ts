import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, type UploadDocumentParams } from '~/lib/api/documents';
import type { DocumentCategory } from 'shared';

export const DOCUMENTS_QUERY_KEY = 'documents';

interface UseDocumentsParams {
  category?: DocumentCategory;
  page?: number;
  limit?: number;
}

export function useDocuments(params?: UseDocumentsParams) {
  const { category, page = 1, limit = 10 } = params || {};
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, category, page, limit],
    queryFn: () => documentsApi.getAll(category, page, limit),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, id],
    queryFn: () => documentsApi.getById(id),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UploadDocumentParams) => documentsApi.upload(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] });
    },
  });
}
