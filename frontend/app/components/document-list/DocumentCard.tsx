import { useState } from 'react';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import type { Document, DocumentStatus } from 'shared';
import { useDeleteDocument } from '~/hooks/use-documents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '~/hooks/use-toast';

const STATUS_VARIANTS: Record<DocumentStatus, 'success' | 'warning' | 'destructive'> = {
  indexed: 'success',
  processing: 'warning',
  failed: 'destructive',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  indexed: 'Indexed',
  processing: 'Processing',
  failed: 'Failed',
};

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteDocument(document.id, {
      onSuccess: () => {
        toast({
          title: 'Document deleted',
          description: `${document.title} has been deleted successfully.`,
        });
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast({
          title: 'Delete failed',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <>
      <div className="flex items-start gap-4 rounded-lg border p-4">
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-semibold leading-none">{document.title}</h3>
              {document.description && (
                <p className="text-sm text-muted-foreground">{document.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={STATUS_VARIANTS[document.status]}>
              {STATUS_LABELS[document.status]}
            </Badge>
            <span>•</span>
            <span className="capitalize">{document.category}</span>
            <span>•</span>
            <span className="uppercase">{document.fileType}</span>
            <span>•</span>
            <span>{new Date(document.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{document.title}" and all its associated data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
