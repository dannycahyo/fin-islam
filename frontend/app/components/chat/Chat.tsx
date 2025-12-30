import { useReducer, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ChatAction, Message } from './types';
import { chatReducer, initialState } from '~/reducer/chatReducer';

// TODO: Replace with actual API call
const mockStreamResponse = async (messageId: string, dispatch: React.Dispatch<ChatAction>) => {
  const mockResponses = [
    'Islamic finance is based on **Shariah principles** that prohibit:',
    'Islamic finance is based on **Shariah principles** that prohibit:\n\n1. **Riba** (interest)',
    'Islamic finance is based on **Shariah principles** that prohibit:\n\n1. **Riba** (interest)\n2. **Gharar** (excessive uncertainty)',
    'Islamic finance is based on **Shariah principles** that prohibit:\n\n1. **Riba** (interest)\n2. **Gharar** (excessive uncertainty)\n3. **Maysir** (gambling)',
    'Islamic finance is based on **Shariah principles** that prohibit:\n\n1. **Riba** (interest)\n2. **Gharar** (excessive uncertainty)\n3. **Maysir** (gambling)\n\nInstead, it promotes:\n- Profit and loss sharing\n- Asset-backed financing\n- Ethical investments',
  ];

  for (let i = 0; i < mockResponses.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { id: messageId, content: mockResponses[i] },
    });
  }

  dispatch({
    type: 'SET_MESSAGE_STATUS',
    payload: { id: messageId, status: 'sent' },
  });
  dispatch({ type: 'STOP_STREAMING' });
};

export function Chat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSendMessage = async (content: string) => {
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

    // TODO: Replace with actual API call to backend
    // Example: const response = await fetch('/api/chat', { ... })

    try {
      dispatch({ type: 'START_STREAMING' });

      // Add assistant message with streaming status
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        status: 'streaming',
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

      // Mock streaming response
      await mockStreamResponse(assistantMessage.id, dispatch);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'STOP_STREAMING' });

      // If there's an assistant message, mark it as error
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        dispatch({
          type: 'SET_MESSAGE_ERROR',
          payload: { id: lastMessage.id, error: errorMessage },
        });
      }
    }
  };

  const isEmpty = state.messages.length === 0;

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
