import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { DocumentCategory } from '../types.js';
import {
  API_BASE_URL,
  MAX_RETRIES,
  INITIAL_RETRY_DELAY_MS,
  PROCESSING_TIMEOUT_MS,
  POLL_INTERVAL_MS,
} from '../config/seed-config.js';

export interface UploadParams {
  filePath: string;
  title: string;
  category: DocumentCategory;
  description?: string;
}

export interface UploadResponse {
  id: string;
  title: string;
  status: string;
  message: string;
}

export interface DocumentDetail {
  id: string;
  title: string;
  category: string;
  status: 'processing' | 'indexed' | 'failed';
  description?: string;
  filePath?: string;
  fileType?: string;
  createdAt?: string;
  updatedAt?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status >= 500 && attempt < retries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`⚠️  Server error (${response.status}), retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`⚠️  Network error, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError ?? new Error('Failed after retries');
}

export async function uploadDocument(params: UploadParams): Promise<UploadResponse> {
  const fileBuffer = await readFile(params.filePath);
  const fileName = basename(params.filePath);

  const blob = new Blob([fileBuffer]);
  const file = new File([blob], fileName, {
    type: getContentType(fileName),
  });

  const form = new FormData();
  form.append('file', file);
  form.append('title', params.title);
  form.append('category', params.category);
  if (params.description) {
    form.append('description', params.description);
  }

  const response = await fetchWithRetry(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as UploadResponse;
}

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    default:
      return 'application/octet-stream';
  }
}

export async function waitForProcessing(
  documentId: string,
  maxWaitMs = PROCESSING_TIMEOUT_MS
): Promise<'indexed' | 'failed'> {
  const startTime = Date.now();
  const maxAttempts = Math.ceil(maxWaitMs / POLL_INTERVAL_MS);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch document status: ${response.status}`);
    }

    const doc = (await response.json()) as DocumentDetail;

    if (doc.status === 'indexed') return 'indexed';
    if (doc.status === 'failed') return 'failed';

    const elapsed = Date.now() - startTime;
    if (elapsed >= maxWaitMs) {
      throw new Error(`Timeout waiting for document ${documentId} processing`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timeout waiting for document ${documentId} processing`);
}

export async function getExistingDocuments(): Promise<DocumentDetail[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents`);

  if (!response.ok) {
    throw new Error(`Failed to fetch existing documents: ${response.status}`);
  }

  const data = (await response.json()) as { documents: DocumentDetail[] };
  return data.documents ?? [];
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
