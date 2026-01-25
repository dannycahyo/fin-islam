import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getBaseUrl(): string {
  if (API_BASE_URL && API_BASE_URL.startsWith('http')) {
    return API_BASE_URL;
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

interface FetchOptions<TResponse> extends RequestInit {
  schema: z.ZodType<TResponse>;
  params?: Record<string, string>;
}

export async function fetcher<TResponse>(
  endpoint: string,
  options: FetchOptions<TResponse>
): Promise<TResponse> {
  const { schema, params, ...fetchOptions } = options;

  const url = new URL(endpoint, getBaseUrl());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), fetchOptions);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new FetchError(errorText, response.status, response.statusText);
  }

  const data = await response.json();
  const validated = schema.parse(data);

  return validated;
}
