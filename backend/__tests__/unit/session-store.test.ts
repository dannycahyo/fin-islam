import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStore } from '@/services/session-store';
import type { ConversationMessage } from '@/services/session-store';

describe('SessionStore', () => {
  let sessionStore: SessionStore;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStore = new SessionStore({
      maxHistorySize: 10,
      sessionTimeoutMs: 30 * 60 * 1000,
    });
  });

  afterEach(() => {
    sessionStore.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('createSession', () => {
    it('should create a new session with unique ID', () => {
      const sessionId1 = sessionStore.createSession();
      const sessionId2 = sessionStore.createSession();

      expect(sessionId1).toBeTruthy();
      expect(sessionId2).toBeTruthy();
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should create session with empty conversation history', () => {
      const sessionId = sessionStore.createSession();
      const session = sessionStore.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.conversationHistory).toEqual([]);
      expect(session?.metadata.totalQueries).toBe(0);
      expect(session?.metadata.flaggedQueries).toBe(0);
    });

    it('should set createdAt and lastAccessedAt timestamps', () => {
      const now = new Date('2026-01-03T10:00:00Z');
      vi.setSystemTime(now);

      const sessionId = sessionStore.createSession();
      const session = sessionStore.getSession(sessionId);

      expect(session?.createdAt).toEqual(now);
      expect(session?.lastAccessedAt).toEqual(now);
    });
  });

  describe('getSession', () => {
    it('should return session if exists', () => {
      const sessionId = sessionStore.createSession();
      const session = sessionStore.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });

    it('should return null for non-existent session', () => {
      const session = sessionStore.getSession('non-existent-id');
      expect(session).toBeNull();
    });

    it('should update lastAccessedAt on access', () => {
      vi.setSystemTime(new Date('2026-01-03T10:00:00Z'));
      const sessionId = sessionStore.createSession();

      const session1 = sessionStore.getSession(sessionId);
      const timestamp1 = session1?.lastAccessedAt.getTime();

      vi.setSystemTime(new Date('2026-01-03T10:05:00Z'));
      const session2 = sessionStore.getSession(sessionId);
      const timestamp2 = session2?.lastAccessedAt.getTime();

      expect(timestamp1).toBe(new Date('2026-01-03T10:00:00Z').getTime());
      expect(timestamp2).toBe(new Date('2026-01-03T10:05:00Z').getTime());
    });
  });

  describe('getOrCreateSession', () => {
    it('should return existing session if sessionId provided', () => {
      const sessionId = sessionStore.createSession();
      const session = sessionStore.getOrCreateSession(sessionId);

      expect(session.sessionId).toBe(sessionId);
    });

    it('should create new session if sessionId not provided', () => {
      const session = sessionStore.getOrCreateSession();

      expect(session.sessionId).toBeTruthy();
      expect(session.conversationHistory).toEqual([]);
    });

    it('should create new session if sessionId does not exist', () => {
      const session = sessionStore.getOrCreateSession('non-existent-id');

      expect(session.sessionId).toBeTruthy();
      expect(session.sessionId).not.toBe('non-existent-id');
      expect(session.conversationHistory).toEqual([]);
    });

    it('should update lastAccessedAt when returning existing session', () => {
      const sessionId = sessionStore.createSession();

      vi.setSystemTime(new Date('2026-01-03T10:00:00Z'));
      const session1 = sessionStore.getOrCreateSession(sessionId);
      const timestamp1 = session1.lastAccessedAt.getTime();

      vi.setSystemTime(new Date('2026-01-03T10:05:00Z'));
      const session2 = sessionStore.getOrCreateSession(sessionId);
      const timestamp2 = session2.lastAccessedAt.getTime();

      expect(timestamp1).toBe(new Date('2026-01-03T10:00:00Z').getTime());
      expect(timestamp2).toBe(new Date('2026-01-03T10:05:00Z').getTime());
    });
  });

  describe('updateSession', () => {
    it('should add message to conversation history', () => {
      const sessionId = sessionStore.createSession();
      const message: ConversationMessage = {
        role: 'user',
        content: 'What is Riba?',
        timestamp: new Date(),
        category: 'principles',
      };

      sessionStore.updateSession(sessionId, message);
      const session = sessionStore.getSession(sessionId);

      expect(session?.conversationHistory).toHaveLength(1);
      expect(session?.conversationHistory[0]).toMatchObject(message);
    });

    it('should increment totalQueries for user messages', () => {
      const sessionId = sessionStore.createSession();

      sessionStore.updateSession(sessionId, {
        role: 'user',
        content: 'Question 1',
        timestamp: new Date(),
      });

      sessionStore.updateSession(sessionId, {
        role: 'assistant',
        content: 'Answer 1',
        timestamp: new Date(),
      });

      sessionStore.updateSession(sessionId, {
        role: 'user',
        content: 'Question 2',
        timestamp: new Date(),
      });

      const session = sessionStore.getSession(sessionId);
      expect(session?.metadata.totalQueries).toBe(2);
    });

    it('should increment flaggedQueries for FLAGGED compliance', () => {
      const sessionId = sessionStore.createSession();

      sessionStore.updateSession(sessionId, {
        role: 'user',
        content: 'Question',
        timestamp: new Date(),
      });

      sessionStore.updateSession(sessionId, {
        role: 'assistant',
        content: 'Flagged response',
        timestamp: new Date(),
        compliance: 'FLAGGED',
      });

      const session = sessionStore.getSession(sessionId);
      expect(session?.metadata.flaggedQueries).toBe(1);
    });

    it('should enforce sliding window (max 10 messages)', () => {
      const sessionId = sessionStore.createSession();

      // Add 15 messages
      for (let i = 0; i < 15; i++) {
        sessionStore.updateSession(sessionId, {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const session = sessionStore.getSession(sessionId);
      expect(session?.conversationHistory).toHaveLength(10);
      expect(session?.conversationHistory[0].content).toBe('Message 5');
      expect(session?.conversationHistory[9].content).toBe('Message 14');
    });

    it('should update lastAccessedAt on update', () => {
      vi.setSystemTime(new Date('2026-01-03T10:00:00Z'));
      const sessionId = sessionStore.createSession();

      sessionStore.updateSession(sessionId, {
        role: 'user',
        content: 'Question',
        timestamp: new Date(),
      });

      const session = sessionStore.getSession(sessionId);
      const timestamp = session?.lastAccessedAt.getTime();
      expect(timestamp).toBe(new Date('2026-01-03T10:00:00Z').getTime());
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        sessionStore.updateSession('non-existent-id', {
          role: 'user',
          content: 'Question',
          timestamp: new Date(),
        });
      }).toThrow('Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', () => {
      const sessionId = sessionStore.createSession();

      expect(sessionStore.getSession(sessionId)).toBeDefined();

      sessionStore.deleteSession(sessionId);

      expect(sessionStore.getSession(sessionId)).toBeNull();
    });

    it('should not throw error for non-existent session', () => {
      expect(() => {
        sessionStore.deleteSession('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('getLastNMessages', () => {
    beforeEach(() => {
      const sessionId = sessionStore.createSession();

      // Add 5 messages
      for (let i = 0; i < 5; i++) {
        sessionStore.updateSession(sessionId, {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }
    });

    it('should return last N messages', () => {
      const sessionId = sessionStore.createSession();

      for (let i = 0; i < 5; i++) {
        sessionStore.updateSession(sessionId, {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const messages = sessionStore.getLastNMessages(sessionId, 3);

      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 2');
      expect(messages[1].content).toBe('Message 3');
      expect(messages[2].content).toBe('Message 4');
    });

    it('should return all messages if N greater than total', () => {
      const sessionId = sessionStore.createSession();

      for (let i = 0; i < 3; i++) {
        sessionStore.updateSession(sessionId, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      const messages = sessionStore.getLastNMessages(sessionId, 10);

      expect(messages).toHaveLength(3);
    });

    it('should return empty array for non-existent session', () => {
      const messages = sessionStore.getLastNMessages('non-existent-id', 5);
      expect(messages).toEqual([]);
    });

    it('should return empty array for session with no messages', () => {
      const sessionId = sessionStore.createSession();
      const messages = sessionStore.getLastNMessages(sessionId, 5);
      expect(messages).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should remove expired sessions after timeout', () => {
      const now = new Date('2026-01-03T10:00:00Z');
      vi.setSystemTime(now);

      const sessionId = sessionStore.createSession();

      expect(sessionStore.getSession(sessionId)).toBeDefined();

      // Advance time by 31 minutes (past 30 min timeout)
      vi.setSystemTime(new Date('2026-01-03T10:31:00Z'));
      vi.advanceTimersByTime(5 * 60 * 1000); // Trigger cleanup job (runs every 5 min)

      expect(sessionStore.getSession(sessionId)).toBeNull();
    });

    it('should keep non-expired sessions', () => {
      const now = new Date('2026-01-03T10:00:00Z');
      vi.setSystemTime(now);

      const sessionId = sessionStore.createSession();

      // Advance time by 29 minutes (before timeout)
      vi.setSystemTime(new Date('2026-01-03T10:29:00Z'));
      vi.advanceTimersByTime(5 * 60 * 1000); // Trigger cleanup job

      expect(sessionStore.getSession(sessionId)).toBeDefined();
    });

    it('should clean up multiple expired sessions', () => {
      const now = new Date('2026-01-03T10:00:00Z');
      vi.setSystemTime(now);

      const session1 = sessionStore.createSession();
      const session2 = sessionStore.createSession();
      const session3 = sessionStore.createSession();

      // Advance time past expiration
      vi.setSystemTime(new Date('2026-01-03T10:31:00Z'));
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(sessionStore.getSession(session1)).toBeNull();
      expect(sessionStore.getSession(session2)).toBeNull();
      expect(sessionStore.getSession(session3)).toBeNull();
    });

    it('should respect lastAccessedAt for expiration', () => {
      const now = new Date('2026-01-03T10:00:00Z');
      vi.setSystemTime(now);

      const sessionId = sessionStore.createSession();

      // Access session at 10:20 (extends lifetime to 10:50)
      vi.setSystemTime(new Date('2026-01-03T10:20:00Z'));
      expect(sessionStore.getSession(sessionId)).toBeDefined();

      // Check at 10:49 (should still be valid, but this extends to 11:19)
      vi.setSystemTime(new Date('2026-01-03T10:49:00Z'));
      expect(sessionStore.getSession(sessionId)).toBeDefined();

      // Check at 11:50 (31 min after last access at 10:49, should expire)
      vi.setSystemTime(new Date('2026-01-03T11:50:00Z'));
      expect(sessionStore.getSession(sessionId)).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should clear cleanup interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      sessionStore.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not throw error when called multiple times', () => {
      expect(() => {
        sessionStore.destroy();
        sessionStore.destroy();
      }).not.toThrow();
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple sessions concurrently', () => {
      const session1 = sessionStore.createSession();
      const session2 = sessionStore.createSession();
      const session3 = sessionStore.createSession();

      sessionStore.updateSession(session1, {
        role: 'user',
        content: 'Question 1',
        timestamp: new Date(),
      });

      sessionStore.updateSession(session2, {
        role: 'user',
        content: 'Question 2',
        timestamp: new Date(),
      });

      sessionStore.updateSession(session3, {
        role: 'user',
        content: 'Question 3',
        timestamp: new Date(),
      });

      const s1 = sessionStore.getSession(session1);
      const s2 = sessionStore.getSession(session2);
      const s3 = sessionStore.getSession(session3);

      expect(s1?.conversationHistory[0].content).toBe('Question 1');
      expect(s2?.conversationHistory[0].content).toBe('Question 2');
      expect(s3?.conversationHistory[0].content).toBe('Question 3');
    });
  });
});
