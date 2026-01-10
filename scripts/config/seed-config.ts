import type { DocumentCategory } from '../types.js';

export const DIRECTORY_TO_CATEGORY: Record<string, DocumentCategory> = {
  islamic_finance_products: 'products',
  comparsion_documents: 'comparison',
  principles: 'principles',
  compliance: 'compliance',
  calculation: 'calculation',
};

export const EXCLUDED_FILES = ['PRD.md', 'TRD.md'];
export const ALLOWED_EXTENSIONS = ['pdf', 'md', 'docx', 'txt'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const API_BASE_URL = 'http://localhost:3001';
export const DOCS_PATH = '/Users/dannydwicahyono/Projects/knowledge-base-documents/docs';
export const MAX_CONCURRENT_UPLOADS = 3;
export const PROCESSING_TIMEOUT_MS = 60000; // 60s per document
export const POLL_INTERVAL_MS = 2000; // Poll status every 2s
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY_MS = 1000; // 1s
