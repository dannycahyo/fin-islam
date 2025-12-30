import { ChatAction, ChatState } from '~/components/chat';

export const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  error: null,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id ? { ...msg, content: action.payload.content } : msg
        ),
      };

    case 'SET_MESSAGE_STATUS':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id ? { ...msg, status: action.payload.status } : msg
        ),
      };

    case 'SET_MESSAGE_ERROR':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, status: 'error', error: action.payload.error }
            : msg
        ),
      };

    case 'START_STREAMING':
      return { ...state, isStreaming: true };

    case 'STOP_STREAMING':
      return { ...state, isStreaming: false };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}
