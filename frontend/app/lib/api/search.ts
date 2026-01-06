import { fetcher } from '../fetcher';
import { SessionResponseSchema, type SessionResponse } from 'shared';

export const searchApi = {
  async createSession(): Promise<SessionResponse> {
    return fetcher('/api/session', {
      method: 'POST',
      schema: SessionResponseSchema,
    });
  },
};
