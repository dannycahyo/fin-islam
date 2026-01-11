import { describe, it, expect } from 'vitest';
import { app } from '../../helpers/test-app';

describe('Session Endpoint Integration Tests', () => {
  describe('POST /api/session', () => {
    it('should create new session successfully', async () => {
      const response = await app.request('/api/session', { method: 'POST' });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.sessionId).toBeDefined();
      expect(typeof body.sessionId).toBe('string');
      expect(body.sessionId.length).toBeGreaterThan(0);
      expect(body.createdAt).toBeDefined();
      expect(new Date(body.createdAt).getTime()).toBeGreaterThan(0);
    });

    it('should create unique session IDs', async () => {
      const response1 = await app.request('/api/session', { method: 'POST' });
      const response2 = await app.request('/api/session', { method: 'POST' });
      const body1 = await response1.json();
      const body2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(body1.sessionId).not.toBe(body2.sessionId);
    });

    it('should return correct response structure', async () => {
      const response = await app.request('/api/session', { method: 'POST' });
      const body = await response.json();

      expect(body).toHaveProperty('sessionId');
      expect(body).toHaveProperty('createdAt');
      expect(Object.keys(body)).toHaveLength(2);
    });

    it('should have correct content type', async () => {
      const response = await app.request('/api/session', { method: 'POST' });

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    });
  });
});
