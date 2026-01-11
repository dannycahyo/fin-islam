import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentUploadForm } from '~/components/document-upload-form';
import { DocumentList } from '~/components/document-list';

export default function AdminPage() {
  return (
    <div className="container px-4 py-4 sm:px-6 sm:py-6 md:py-8">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage knowledge base documents
          </p>
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
            <DocumentList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
