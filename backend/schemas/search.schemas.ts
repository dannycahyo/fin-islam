import { z } from 'zod';

export const SearchFiltersSchema = z
  .object({
    category: z.string().optional().describe('Filter by document category'),
    documentId: z.string().uuid().optional().describe('Filter by specific document ID'),
  })
  .optional();

export const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query must not be empty').describe('Search query text'),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(10)
    .describe('Maximum number of results (1-100)'),
  threshold: z
    .number()
    .min(0, 'Threshold must be between 0 and 1')
    .max(1, 'Threshold must be between 0 and 1')
    .default(0.7)
    .describe('Similarity threshold for filtering results'),
  filters: SearchFiltersSchema,
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
