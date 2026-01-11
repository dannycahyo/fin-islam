import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../helpers/test-app';
import { createTestDocument } from '../../helpers/test-data';
import { resetTestDatabase } from '../../helpers/test-db';

describe('Document List Endpoint Integration Tests', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('GET /api/documents', () => {
    it('should return empty array when no documents exist', async () => {
      const response = await app.request('/api/documents');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.documents).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should return all documents', async () => {
      await createTestDocument({ title: 'Doc 1', category: 'principles' });
      await createTestDocument({ title: 'Doc 2', category: 'products' });
      await createTestDocument({ title: 'Doc 3', category: 'compliance' });

      const response = await app.request('/api/documents');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.documents).toHaveLength(3);
      expect(body.total).toBe(3);
      expect(body.documents[0]).toHaveProperty('id');
      expect(body.documents[0]).toHaveProperty('title');
      expect(body.documents[0]).toHaveProperty('category');
      expect(body.documents[0]).toHaveProperty('status');
      expect(body.documents[0]).toHaveProperty('createdAt');
    });

    it('should filter documents by category', async () => {
      await createTestDocument({
        title: 'Principles Doc',
        category: 'principles',
      });
      await createTestDocument({ title: 'Products Doc', category: 'products' });
      await createTestDocument({
        title: 'Another Principles',
        category: 'principles',
      });

      const response = await app.request('/api/documents?category=principles');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.documents).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(
        body.documents.every((doc: { category: string }) => doc.category === 'principles')
      ).toBe(true);
    });

    it('should return empty array for category with no documents', async () => {
      await createTestDocument({ title: 'Doc 1', category: 'principles' });

      const response = await app.request('/api/documents?category=products');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.documents).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should validate response structure', async () => {
      await createTestDocument({
        title: 'Test Doc',
        category: 'general',
        description: 'Test description',
      });

      const response = await app.request('/api/documents');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('documents');
      expect(body).toHaveProperty('total');
      const doc = body.documents[0];
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('title');
      expect(doc).toHaveProperty('category');
      expect(doc).toHaveProperty('filePath');
      expect(doc).toHaveProperty('fileType');
      expect(doc).toHaveProperty('status');
      expect(doc).toHaveProperty('createdAt');
      expect(doc).toHaveProperty('updatedAt');
    });

    it('should have correct content type', async () => {
      const response = await app.request('/api/documents');

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return document by id', async () => {
      const created = await createTestDocument({
        title: 'Test Doc',
        category: 'principles',
      });

      const response = await app.request(`/api/documents/${created.id}`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe(created.id);
      expect(body.title).toBe('Test Doc');
      expect(body.category).toBe('principles');
    });

    it('should return 404 for non-existent document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request(`/api/documents/${fakeId}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await app.request('/api/documents/invalid-uuid');

      expect(response.status).toBe(400);
    });
  });
});
