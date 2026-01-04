import { z } from 'zod';
import { DocumentCategoryEnum, DocumentStatusEnum, FileTypeEnum } from './common';

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  category: DocumentCategoryEnum,
  filePath: z.string(),
  fileType: FileTypeEnum,
  status: DocumentStatusEnum,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DocumentUploadFieldsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  category: DocumentCategoryEnum,
  description: z.string().optional(),
});

export const DocumentParamSchema = z.object({
  id: z.string().uuid('Invalid document ID format'),
});

export const ListDocumentsQuerySchema = z.object({
  category: DocumentCategoryEnum.optional(),
});

export const DocumentListResponseSchema = z.object({
  documents: z.array(DocumentSchema),
  total: z.number(),
});

export const DeleteDocumentResponseSchema = z.object({
  message: z.string(),
});

export const DocumentUploadResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: DocumentStatusEnum,
  message: z.string(),
});

export type Document = z.infer<typeof DocumentSchema>;
export type DocumentUploadFields = z.infer<typeof DocumentUploadFieldsSchema>;
export type DocumentParam = z.infer<typeof DocumentParamSchema>;
export type ListDocumentsQuery = z.infer<typeof ListDocumentsQuerySchema>;
export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>;
export type DeleteDocumentResponse = z.infer<typeof DeleteDocumentResponseSchema>;
export type DocumentUploadResponse = z.infer<typeof DocumentUploadResponseSchema>;
