import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../helpers/test-app';
import { resetTestDatabase } from '../../helpers/test-db';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const FIXTURES_DIR = resolve(__dirname, '../../fixtures/test-uploads');

describe('Document Upload Endpoint Integration Tests', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('POST /api/documents', () => {
    it('should upload PDF file successfully', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.pdf'));
      const formData = new FormData();
      formData.append('title', 'Sample PDF Document');
      formData.append('category', 'principles');
      formData.append('description', 'Test PDF upload');
      formData.append('file', new Blob([file], { type: 'application/pdf' }), 'sample.pdf');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'Sample PDF Document');
      expect(body).toHaveProperty('status', 'processing');
      expect(body).toHaveProperty('message');
    }, 30000);

    it('should upload TXT file successfully', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.txt'));
      const formData = new FormData();
      formData.append('title', 'Sample Text Document');
      formData.append('category', 'general');
      formData.append('file', new Blob([file], { type: 'text/plain' }), 'sample.txt');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'Sample Text Document');
      expect(body).toHaveProperty('status', 'processing');
    }, 30000);

    it('should upload MD file successfully', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.md'));
      const formData = new FormData();
      formData.append('title', 'Sample Markdown Document');
      formData.append('category', 'products');
      formData.append('file', new Blob([file], { type: 'text/markdown' }), 'sample.md');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'Sample Markdown Document');
      expect(body).toHaveProperty('status', 'processing');
    }, 30000);

    it('should upload DOCX file successfully', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.docx'));
      const formData = new FormData();
      formData.append('title', 'Sample DOCX Document');
      formData.append('category', 'compliance');
      formData.append(
        'file',
        new Blob([file], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        'sample.docx'
      );

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'Sample DOCX Document');
      expect(body).toHaveProperty('status', 'processing');
    }, 30000);

    it('should reject invalid file type', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'invalid.xyz'));
      const formData = new FormData();
      formData.append('title', 'Invalid File');
      formData.append('category', 'general');
      formData.append('file', new Blob([file]), 'invalid.xyz');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should reject missing title', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.txt'));
      const formData = new FormData();
      formData.append('category', 'general');
      formData.append('file', new Blob([file], { type: 'text/plain' }), 'sample.txt');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should reject missing category', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.txt'));
      const formData = new FormData();
      formData.append('title', 'No Category');
      formData.append('file', new Blob([file], { type: 'text/plain' }), 'sample.txt');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid category', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.txt'));
      const formData = new FormData();
      formData.append('title', 'Bad Category');
      formData.append('category', 'invalid_category');
      formData.append('file', new Blob([file], { type: 'text/plain' }), 'sample.txt');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should reject missing file', async () => {
      const formData = new FormData();
      formData.append('title', 'No File');
      formData.append('category', 'general');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
    });

    it('should accept optional description field', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.txt'));
      const formData = new FormData();
      formData.append('title', 'With Description');
      formData.append('category', 'general');
      formData.append('description', 'This is a test description');
      formData.append('file', new Blob([file], { type: 'text/plain' }), 'sample.txt');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'With Description');
      expect(body).toHaveProperty('status', 'processing');
    }, 30000);

    it('should return correct response structure', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.txt'));
      const formData = new FormData();
      formData.append('title', 'Structure Test');
      formData.append('category', 'general');
      formData.append('file', new Blob([file], { type: 'text/plain' }), 'sample.txt');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('message');
    }, 30000);

    it('should have correct content type', async () => {
      const file = readFileSync(resolve(FIXTURES_DIR, 'sample.txt'));
      const formData = new FormData();
      formData.append('title', 'Content Type Test');
      formData.append('category', 'general');
      formData.append('file', new Blob([file], { type: 'text/plain' }), 'sample.txt');

      const response = await app.request('/api/documents', {
        method: 'POST',
        body: formData,
      });

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    }, 30000);
  });
});
