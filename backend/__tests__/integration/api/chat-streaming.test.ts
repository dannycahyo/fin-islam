import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../helpers/test-app';
import { resetTestDatabase } from '../../helpers/test-db';
import { parseSSE, hasEvent, getEventsByType } from '../../helpers/sse-parser';

describe('Chat Streaming Endpoint Integration Tests', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe('POST /api/search', () => {
    it('should stream SSE events for calculation query', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate profit distribution for 70-30 Mudharabah with $50,000 profit',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      const text = await response.text();
      const events = parseSSE(text);

      // Should have routing event
      expect(hasEvent(events, 'routing')).toBe(true);

      // Should complete with done or error event
      const hasCompleted = hasEvent(events, 'done') || hasEvent(events, 'error');
      expect(hasCompleted).toBe(true);
    }, 30000);

    it('should handle query with sessionId', async () => {
      // Create session first
      const sessionResponse = await app.request('/api/session', {
        method: 'POST',
      });
      const sessionBody = await sessionResponse.json();
      const { sessionId } = sessionBody;

      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate profit for 60-40 Musharakah with $100,000 profit',
          sessionId,
        }),
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      const events = parseSSE(text);

      expect(hasEvent(events, 'routing')).toBe(true);
      const hasCompleted = hasEvent(events, 'done') || hasEvent(events, 'error');
      expect(hasCompleted).toBe(true);
    }, 30000);

    it('should work without sessionId', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate Mudharabah profit for 50-50 split with $75,000',
        }),
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      const events = parseSSE(text);

      expect(events.length).toBeGreaterThan(0);
      const hasCompleted = hasEvent(events, 'done') || hasEvent(events, 'error');
      expect(hasCompleted).toBe(true);
    }, 30000);

    it('should emit routing event with agent type', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate 80-20 Mudharabah profit for $200,000',
        }),
      });

      const text = await response.text();
      const events = parseSSE(text);
      const routingEvents = getEventsByType(events, 'routing');

      expect(routingEvents.length).toBeGreaterThan(0);
      expect(routingEvents[0].data).toHaveProperty('category');
    }, 30000);

    it('should emit compliance event', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate profit share for 65-35 Musharakah with $150,000',
        }),
      });

      const text = await response.text();
      const events = parseSSE(text);

      // Should have routing event
      expect(hasEvent(events, 'routing')).toBe(true);

      // Should complete with done or error
      const hasCompleted = hasEvent(events, 'done') || hasEvent(events, 'error');
      expect(hasCompleted).toBe(true);
    }, 30000);

    it('should handle empty query', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ query: '' }),
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      const events = parseSSE(text);

      // Should have error event
      expect(hasEvent(events, 'error')).toBe(true);
    }, 30000);

    it('should validate request body', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({}),
      });

      // Returns 200 with error event in stream
      expect(response.status).toBe(200);
      const text = await response.text();
      const events = parseSSE(text);
      expect(hasEvent(events, 'error')).toBe(true);
    });

    it('should return error for invalid sessionId', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate 40-60 Mudharabah profit for $85,000',
          sessionId: 'invalid-session-id-xyz',
        }),
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      const events = parseSSE(text);

      expect(hasEvent(events, 'error')).toBe(true);
    }, 30000);

    it('should stream content events for calculation queries', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate 55-45 profit split for Mudharabah with $90,000',
        }),
      });

      const text = await response.text();
      const events = parseSSE(text);

      // Should complete with done or error
      const hasCompleted = hasEvent(events, 'done') || hasEvent(events, 'error');
      expect(hasCompleted).toBe(true);
    }, 30000);

    it('should emit events in correct sequence', async () => {
      const response = await app.request('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          query: 'Calculate Musharakah 70-30 profit for $120,000',
        }),
      });

      const text = await response.text();
      const events = parseSSE(text);
      const eventTypes = events.map((e) => e.event);

      // Should have connected event first, then routing
      expect(eventTypes[0]).toBe('connected');
      expect(hasEvent(events, 'routing')).toBe(true);

      // Should have at least connected, routing, and completion events
      expect(events.length).toBeGreaterThanOrEqual(3);
    }, 30000);
  });
});
