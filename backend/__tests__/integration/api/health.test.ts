import { describe, it, expect } from 'vitest';
import { app } from '../../helpers/test-app';

describe('Health Endpoint Integration Tests', () => {
  describe('GET /health', () => {
    it('should return 200 with status ok when database is connected', async () => {
      const response = await app.request('/health');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.database).toBe('connected');
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return correct response structure', async () => {
      const response = await app.request('/health');
      const body = await response.json();

      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('database');
      expect(body).toHaveProperty('timestamp');
      expect(Object.keys(body)).toHaveLength(3);
    });

    it('should have correct content type', async () => {
      const response = await app.request('/health');

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await app.request('/');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.name).toBe('Islamic Finance RAG API');
      expect(body.version).toBe('1.0.0');
      expect(body.endpoints).toBeDefined();
      expect(body.endpoints.health).toBe('/health');
      expect(body.endpoints.search).toBe('/api/search');
      expect(body.endpoints.documents).toBe('/api/documents');
    });
  });
});
