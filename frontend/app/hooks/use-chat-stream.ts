import { useRef, useCallback } from 'react';
import type { Dispatch } from 'react';
import { SSEClient } from '~/lib/api/sse-client';
import type { ChatAction } from '~/components/chat/types';
import type { SSEEvent } from 'shared';
import { mapErrorToMessage } from '~/utils/error-messages';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getBaseUrl(): string {
  if (API_BASE_URL && API_BASE_URL.startsWith('http')) {
    return API_BASE_URL;
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function useChatStream(dispatch: Dispatch<ChatAction>) {
  const sseClientRef = useRef<SSEClient | null>(null);
  const accumulatedContentRef = useRef<string>('');

  const sendMessage = useCallback(
    async (query: string, sessionId: string, messageId: string) => {
      // Reset accumulator
      accumulatedContentRef.current = '';

      // Create SSE client
      sseClientRef.current = new SSEClient({
        url: `${getBaseUrl()}/api/search`,
        body: { query, sessionId },
        maxRetries: 3,
        retryDelays: [1000, 2000, 4000],

        onEvent: (event: SSEEvent) => {
          switch (event.type) {
            case 'connected':
              console.log('[SSE] Connected:', event.data.sessionId);
              break;

            case 'status':
              // User decision: hide internal status
              console.log('[SSE] Status:', event.data);
              break;

            case 'routing':
              // User decision: hide routing
              console.log('[SSE] Routing:', event.data);
              break;

            case 'content':
              // Accumulate and update message
              accumulatedContentRef.current += event.data;
              dispatch({
                type: 'UPDATE_MESSAGE',
                payload: {
                  id: messageId,
                  content: accumulatedContentRef.current,
                },
              });
              break;

            case 'compliance':
              // User decision: hide compliance checks
              console.log('[SSE] Compliance:', event.data);
              break;

            case 'done':
              // Show final answer only
              dispatch({
                type: 'UPDATE_MESSAGE',
                payload: { id: messageId, content: event.data.answer },
              });
              dispatch({
                type: 'SET_MESSAGE_STATUS',
                payload: { id: messageId, status: 'sent' },
              });
              dispatch({ type: 'STOP_STREAMING' });
              break;

            case 'error': {
              const userMessage = mapErrorToMessage(event.data.code);
              dispatch({
                type: 'SET_MESSAGE_ERROR',
                payload: { id: messageId, error: userMessage },
              });
              dispatch({ type: 'SET_ERROR', payload: userMessage });
              dispatch({ type: 'STOP_STREAMING' });
              break;
            }
          }
        },

        onError: (_error) => {
          const errorMessage = mapErrorToMessage('CONNECTION_ERROR');
          dispatch({
            type: 'SET_MESSAGE_ERROR',
            payload: { id: messageId, error: errorMessage },
          });
          dispatch({ type: 'SET_ERROR', payload: errorMessage });
          dispatch({ type: 'STOP_STREAMING' });
        },
      });

      // Start streaming
      await sseClientRef.current.connect();
    },
    [dispatch]
  );

  const disconnect = useCallback(() => {
    sseClientRef.current?.disconnect();
    sseClientRef.current = null;
  }, []);

  return { sendMessage, disconnect };
}
