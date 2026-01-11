import { FileText, Loader2 } from 'lucide-react';
import { useDocuments } from '~/hooks/use-documents';
import { DocumentCard } from './DocumentCard';

export function DocumentList() {
  const { data, isLoading, isError, error } = useDocuments();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading documents...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-sm text-destructive">
          Failed to load documents: {error?.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!data?.documents || data.documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {data.total} {data.total === 1 ? 'document' : 'documents'}
        </p>
      </div>
      <div className="space-y-2 sm:space-y-3">
        {data.documents.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </div>
    </div>
  );
}
