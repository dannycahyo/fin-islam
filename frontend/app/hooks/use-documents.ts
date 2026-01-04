import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '~/lib/api/documents';
import type { DocumentCategory } from 'shared';

export const DOCUMENTS_QUERY_KEY = 'documents';

export function useDocuments(category?: DocumentCategory) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, category],
    queryFn: () => documentsApi.getAll(category),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: [DOCUMENTS_QUERY_KEY, id],
    queryFn: () => documentsApi.getById(id),
    enabled: !!id,
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
