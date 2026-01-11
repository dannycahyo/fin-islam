import { testDb } from '@/db/test-config';
import { documents, documentChunks, type NewDocument, type NewDocumentChunk } from '@/db/schema';
import type { SessionStore } from '@/services/session-store';

export async function createTestDocument(data?: Partial<NewDocument>) {
  const [document] = await testDb
    .insert(documents)
    .values({
      title: data?.title || 'Test Document',
      category: data?.category || 'general',
      filePath: data?.filePath || '/tmp/test.pdf',
      fileType: data?.fileType || 'pdf',
      status: data?.status || 'indexed',
      description: data?.description,
    })
    .returning();

  return document;
}

export async function createTestChunk(
  documentId: string,
  embedding: number[],
  data?: Partial<Omit<NewDocumentChunk, 'documentId' | 'embedding'>>
) {
  const [chunk] = await testDb
    .insert(documentChunks)
    .values({
      documentId,
      content: data?.content || 'Test chunk content about Islamic finance',
      chunkIndex: data?.chunkIndex !== undefined ? data.chunkIndex : 0,
      embedding,
    })
    .returning();

  return chunk;
}

export function createTestSession(sessionStore: SessionStore) {
  const sessionId = sessionStore.createSession();
  return sessionId;
}

export async function createTestDocumentWithChunks(
  embeddings: number[][],
  docData?: Partial<NewDocument>
) {
  const document = await createTestDocument(docData);

  const chunks = await Promise.all(
    embeddings.map((embedding, index) =>
      createTestChunk(document.id, embedding, {
        content: `Chunk ${index} content about Islamic finance`,
        chunkIndex: index,
      })
    )
  );

  return { document, chunks };
}
