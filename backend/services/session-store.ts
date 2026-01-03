import { nanoid } from 'nanoid';
import type { QueryCategory, ComplianceStatus } from '@/agents/types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: QueryCategory;
  compliance?: ComplianceStatus;
}

export interface Session {
  sessionId: string;
  conversationHistory: ConversationMessage[];
  createdAt: Date;
  lastAccessedAt: Date;
  metadata: {
    totalQueries: number;
    flaggedQueries: number;
  };
}

export interface SessionStoreConfig {
  maxHistorySize?: number;
  sessionTimeoutMs?: number;
  cleanupIntervalMs?: number;
}

export class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxHistorySize: number;
  private sessionTimeoutMs: number;
  private cleanupIntervalMs: number;

  constructor(config: SessionStoreConfig = {}) {
    this.maxHistorySize = config.maxHistorySize ?? 10;
    this.sessionTimeoutMs = config.sessionTimeoutMs ?? 30 * 60 * 1000; // 30 min
    this.cleanupIntervalMs = config.cleanupIntervalMs ?? 5 * 60 * 1000; // 5 min

    this.startCleanupJob();
  }

  /**
   * Create new session with generated ID
   */
  createSession(): string {
    const sessionId = nanoid();
    const session: Session = {
      sessionId,
      conversationHistory: [],
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      metadata: {
        totalQueries: 0,
        flaggedQueries: 0,
      },
    };

    this.sessions.set(sessionId, session);
    console.log(`[SessionStore] Created session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Get session by ID, returns null if not found or expired
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - session.lastAccessedAt.getTime() > this.sessionTimeoutMs) {
      this.sessions.delete(sessionId);
      console.log(`[SessionStore] Session expired and removed: ${sessionId}`);
      return null;
    }

    // Update last accessed
    session.lastAccessedAt = new Date();
    return session;
  }

  /**
   * Get existing session or create new one
   */
  getOrCreateSession(sessionId?: string): Session {
    if (sessionId) {
      const existing = this.getSession(sessionId);
      if (existing) {
        return existing;
      }
    }

    // Create new session
    const newSessionId = this.createSession();
    return this.sessions.get(newSessionId)!;
  }

  /**
   * Update session with new message
   */
  updateSession(sessionId: string, message: ConversationMessage): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.conversationHistory.push(message);

    // Keep only last N messages (sliding window)
    if (session.conversationHistory.length > this.maxHistorySize) {
      session.conversationHistory = session.conversationHistory.slice(-this.maxHistorySize);
    }

    // Update metadata
    if (message.role === 'user') {
      session.metadata.totalQueries++;
    }
    if (message.compliance === 'FLAGGED') {
      session.metadata.flaggedQueries++;
    }

    session.lastAccessedAt = new Date();
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`[SessionStore] Deleted session: ${sessionId}`);
    }
  }

  /**
   * Get last N messages from session
   */
  getLastNMessages(sessionId: string, n: number): ConversationMessage[] {
    const session = this.getSession(sessionId);
    if (!session) {
      return [];
    }

    return session.conversationHistory.slice(-n);
  }

  /**
   * Get all active sessions count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Start background cleanup job
   */
  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupIntervalMs);

    console.log(`[SessionStore] Cleanup job started (interval: ${this.cleanupIntervalMs}ms)`);
  }

  /**
   * Remove expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt.getTime() > this.sessionTimeoutMs) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `[SessionStore] Cleaned ${cleaned} expired sessions (active: ${this.sessions.size})`
      );
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const sessionCount = this.sessions.size;
    this.sessions.clear();

    console.log(`[SessionStore] Destroyed (cleared ${sessionCount} sessions)`);
  }
}
