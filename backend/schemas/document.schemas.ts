import { z } from 'zod';
import { DocumentCategoryEnum } from './common.schemas';

export const DocumentUploadFieldsSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .describe('Document title'),
  category: DocumentCategoryEnum.describe('Document category'),
  description: z.string().optional().describe('Optional document description'),
});

export const DocumentParamSchema = z.object({
  id: z.string().uuid('Invalid document ID format'),
});

export const ListDocumentsQuerySchema = z.object({
  category: DocumentCategoryEnum.optional(),
});

export type DocumentUploadFields = z.infer<typeof DocumentUploadFieldsSchema>;
export type DocumentParam = z.infer<typeof DocumentParamSchema>;
export type ListDocumentsQuery = z.infer<typeof ListDocumentsQuerySchema>;
