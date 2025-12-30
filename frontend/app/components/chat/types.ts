export type MessageRole = 'user' | 'assistant';

export type MessageStatus = 'sending' | 'sent' | 'error' | 'streaming';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: Date;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
}

export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | {
      type: 'SET_MESSAGE_STATUS';
      payload: { id: string; status: MessageStatus };
    }
  | { type: 'SET_MESSAGE_ERROR'; payload: { id: string; error: string } }
  | { type: 'START_STREAMING' }
  | { type: 'STOP_STREAMING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };
