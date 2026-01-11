import { app as honoApp } from '@/app';

// Create a wrapper that ensures proper Request objects are created
export const app = {
  request: (input: string | Request, init?: RequestInit) => {
    if (typeof input === 'string') {
      // Ensure we have a full URL
      const url = input.startsWith('http') ? input : `http://localhost${input}`;
      return honoApp.request(url, init);
    }
    return honoApp.request(input, init);
  },
};

export { honoApp };
