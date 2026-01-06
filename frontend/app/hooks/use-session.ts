import { useQuery } from '@tanstack/react-query';
import { searchApi } from '~/lib/api/search';

export const SESSION_QUERY_KEY = 'chat-session';

export function useSession() {
  return useQuery({
    queryKey: [SESSION_QUERY_KEY],
    queryFn: () => searchApi.createSession(),
    staleTime: 30 * 60 * 1000, // 30 min (match backend timeout)
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
