import { useReducer, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { Message } from './types';
import { chatReducer, initialState } from '~/reducer/chatReducer';
import { useSession } from '~/hooks/use-session';
import { useChatStream } from '~/hooks/use-chat-stream';

export function Chat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading: sessionLoading, error: sessionError } = useSession();
  const { sendMessage, disconnect } = useChatStream(dispatch);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSendMessage = async (content: string) => {
    if (!session?.sessionId) {
      dispatch({ type: 'SET_ERROR', payload: 'Session not ready' });
      return;
    }

    // Clear any previous errors
    dispatch({ type: 'CLEAR_ERROR' });

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      status: 'sending',
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

    // Update status to sent
    setTimeout(() => {
      dispatch({
        type: 'SET_MESSAGE_STATUS',
        payload: { id: userMessage.id, status: 'sent' },
      });
    }, 100);

    // Add assistant message placeholder
    dispatch({ type: 'START_STREAMING' });
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

    // Start SSE stream
    await sendMessage(content, session.sessionId, assistantMessage.id);
  };

  const isEmpty = state.messages.length === 0;

  // Show session loading state
  if (sessionLoading) {
    return (
      <Card className="flex h-[calc(100vh-12rem)] flex-col">
        <CardContent className="flex h-full items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>Initializing chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessionError) {
    return (
      <Card className="flex h-[calc(100vh-12rem)] flex-col">
        <CardContent className="flex h-full items-center justify-center">
          <div className="text-center text-destructive">
            <p>Failed to start session. Please refresh the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-[calc(100vh-12rem)] flex-col">
      <CardContent className="flex h-full flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {isEmpty && (
              <div className="flex justify-center">
                <div className="rounded-lg bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
                  <p className="font-medium">Welcome to Islamic Finance Assistant</p>
                  <p className="mt-1">
                    Ask me anything about Islamic finance principles and products
                  </p>
                </div>
              </div>
            )}

            {state.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {state.error && (
              <div className="flex justify-center">
                <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {state.error}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={state.isStreaming}
          placeholder="Ask about Islamic finance..."
        />
      </CardContent>
    </Card>
  );
}
