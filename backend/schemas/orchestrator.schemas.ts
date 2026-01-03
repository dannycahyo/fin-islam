import { z } from 'zod';

/**
 * Schema for query input (POST /api/search)
 */
export const QueryInputSchema = z.object({
  query: z.string().min(1, 'Query is required and cannot be empty'),
  sessionId: z.string().optional(), // Auto-create if missing
});

export type QueryInput = z.infer<typeof QueryInputSchema>;

/**
 * Schema for session creation response (POST /api/session)
 */
export const SessionResponseSchema = z.object({
  sessionId: z.string(),
  createdAt: z.string(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
