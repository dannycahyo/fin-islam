import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useDocuments } from '~/hooks/use-documents';
import { DocumentCard } from './DocumentCard';
import { Pagination } from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 10;

export function DocumentList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isError, error } = useDocuments({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
          {data.total} {data.total === 1 ? 'document' : 'documents'}
        </p>
      </div>

      {/* Grid layout for documents - 2 columns on medium+ screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {data.documents.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={data.totalPages}
        onPageChange={handlePageChange}
        className="pt-2"
      />
    </div>
  );
}
