import { z } from 'zod';

export const DocumentCategoryEnum = z.enum(['principles', 'products', 'comparison', 'general']);

export const DocumentStatusEnum = z.enum(['processing', 'indexed', 'failed']);

export const FileTypeEnum = z.enum(['pdf', 'docx', 'txt', 'md', 'unknown']);

export type DocumentCategory = z.infer<typeof DocumentCategoryEnum>;
export type DocumentStatus = z.infer<typeof DocumentStatusEnum>;
export type FileType = z.infer<typeof FileTypeEnum>;
