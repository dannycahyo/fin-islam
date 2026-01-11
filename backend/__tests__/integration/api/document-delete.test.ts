import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../helpers/test-app';
import { createTestDocument, createTestChunk } from '../../helpers/test-data';
import { resetTestDatabase } from '../../helpers/test-db';
import { testDb } from '@/db/test-config';
import { documentChunks } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Document Delete Endpoint Integration Tests', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete document successfully', async () => {
      const document = await createTestDocument({
        title: 'To Delete',
        category: 'general',
      });

      const response = await app.request(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Document deleted successfully');

      // Verify document is deleted
      const getResponse = await app.request(`/api/documents/${document.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should cascade delete associated chunks', async () => {
      const document = await createTestDocument({
        title: 'With Chunks',
        category: 'general',
      });
      const mockEmbedding = new Array(768).fill(0);

      await createTestChunk(document.id, mockEmbedding, {
        content: 'Chunk 1',
        chunkIndex: 0,
      });
      await createTestChunk(document.id, mockEmbedding, {
        content: 'Chunk 2',
        chunkIndex: 1,
      });

      // Verify chunks exist
      const chunksBefore = await testDb
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, document.id));
      expect(chunksBefore).toHaveLength(2);

      // Delete document
      const response = await app.request(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe('Document deleted successfully');

      // Verify chunks are deleted
      const chunksAfter = await testDb
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, document.id));
      expect(chunksAfter).toHaveLength(0);
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/documents/${fakeId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await app.request('/api/documents/invalid-uuid', {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);
    });

    it('should not affect other documents', async () => {
      const doc1 = await createTestDocument({
        title: 'Keep This',
        category: 'general',
      });
      const doc2 = await createTestDocument({
        title: 'Delete This',
        category: 'general',
      });

      await app.request(`/api/documents/${doc2.id}`, { method: 'DELETE' });

      const response = await app.request(`/api/documents/${doc1.id}`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.title).toBe('Keep This');
    });
  });
});
