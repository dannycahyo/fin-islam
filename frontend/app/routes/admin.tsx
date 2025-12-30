import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText } from 'lucide-react';
import { DocumentUploadForm } from '~/components/document-upload-form';

export default function AdminPage() {
  return (
    <div className="container py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage knowledge base documents</p>
        </div>

        <Separator />

        {/* Upload section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Add new documents to the knowledge base. Supports PDF, DOCX, TXT, and MD formats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploadForm />
          </CardContent>
        </Card>

        {/* Documents list */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>View and manage uploaded documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Placeholder for empty state */}
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No documents uploaded yet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
